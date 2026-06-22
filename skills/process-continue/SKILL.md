---
name: process-continue
description: Continue an existing process from where it left off. Restores state and delegates step execution.
disable-model-invocation: true
---

# Process Continue

Continue an existing process from where it was left off.

## When to Use

- Resuming work on an existing process
- Continuing after a session break
- Picking up where work was left off

## Quick Reference

| Requirement | Description |
|-------------|-------------|
| Must have process | Never work outside a process |
| Must restore state | Read process.json and memory/ topic files |

---

## Command Behavior

When `/process-continue` is invoked:

### 1. Discover Active Processes (MANDATORY)

- Search `~/.claude/agentic-processes/active/` for all active processes
- **If no processes exist**: Inform user, suggest `/process-new`, NEVER proceed to work directly
- If multiple processes exist, list them with name, date, current step, progress, last updated
- If only one process exists, proceed directly

### 2. Bind Session to Process (MANDATORY — first action)

1. Write an empty `.session` file in the process directory: `Write(.session, "")`
2. The `bind-session-to-process` hook fills it with the new session ID
3. Verify `.session` contains a non-empty session ID

WITHOUT session binding, all enforcement hooks will be **silently disabled** for the entire session.

### 3. Read Process State

- Read `process.json` (primary state)
- Review completed steps and identify next incomplete step

### 4. Read Memory Topic Files

- Read relevant topic files from the `memory/` directory
- Summarize key information from previous steps

### 5. Summarize Current State

Present clear summary of:
- Process being resumed
- What was being worked on
- Overall progress and key information from memory
- Next step highlighted

### 6. Update Current State

Update process state to reflect resumption using the `process-state-update` skill:
- Set the current step to the next incomplete step
- Include step ID, step name, and resumption summary

### 7. Proceed with Step Execution

For each step, determine its type and execute accordingly:

**Regular step** (has non-empty `stepDefinition`):
- **Invoke the `step-executor-delegation` skill** with the process directory and step ID to execute the step. The skill handles all delegation — do NOT construct the step-executor prompt directly.
- Wait for skill/subagent completion
- Verify step completed successfully

**Sub-process orchestrator step** (has `subProcessTrigger` AND empty `stepDefinition`):
- Follow the **Sub-Process Step Handling** protocol below
- Do NOT call `step-executor-delegation` for these steps — the step-executor cannot handle them

**Handle approval checkpoints** (applies to both regular and child steps): If step has `approvalRequired: true`, the following sequence is mandatory:
  1. Present deliverables to user
  2. Create pending checkpoint via `write-pending`
  3. Wait for user response (approve/reject/modify)
  4. Log the user's response via `log-interaction`
  5. Delete the pending checkpoint via `write-pending --delete`
  6. Call `update-step-status --status completed` (will succeed only if user has approved via `/process-approve` or UI)

Step approval is user-only. The agent does not approve steps -- the user approves via `/process-approve` (CLI) or the UI app. If `update-step-status --status completed` fails because the step is not yet approved, inform the user they need to run `/process-approve` first.

**Handle user corrections**: Log interaction via `process-state-update` skill, then re-invoke the `step-executor-delegation` skill with the corrections as the third argument: `step-executor-delegation "<process-dir>" "<step-id>" "<user corrections>"`. Re-present updated deliverables.

After step completion, update process state and proceed to the next step.

> **Framework-injected steps**: The last two steps of every process are framework-injected: **Continuous Improvement** and **End Process Validation**. Their full definitions are embedded in `process.json` as `stepDefinition` (same as template steps). The `stepRef` field contains the framework step's UUID as provenance. Framework steps are identified by `"type": "framework-step"` in their definition. No file resolution needed.

### Sub-Process Step Handling

When a step has `subProcessTrigger` in `process.json` and an empty `stepDefinition`, it is a sub-process orchestrator step. Instead of delegating to the step-executor, drive the child process directly:

#### A. Resolve Template and Parameters

1. Read `subProcessTrigger.template` (a UUID matching a template's `id` field). The `templateName` companion field (e.g., `"sdlc/plan-work-item"`) provides human-readable context.
2. Resolve template path: scan `~/.claude/agentic-processes/templates/processes/` subdirectories for a template JSON file whose `id` field matches the UUID
3. Resolve parameters: For each value in `subProcessTrigger.parameters`, replace `{{paramName}}` placeholders with actual values from the parent's `process.parameters`
   - Example: `"{{workItemId}}"` with parent param `workItemId: "1274362"` → `"1274362"`

#### B. Create Child Process

1. Generate child directory: `~/.claude/agentic-processes/active/{child-name}-{YYYYMMDD}-{HHmmss}/`
2. Read parent `process.json` to get parent ID and name
3. Determine the `return-to-step`: the UUID of the **next** step after the current one in the parent process
4. Create child process:
   ```
   python3 ${CLAUDE_PLUGIN_ROOT}/scripts/process_manager.py create-process \
     --template-path <resolved template path> \
     --name "<step name>" \
     --params '<resolved parameters JSON>' \
     --process-dir <child directory> \
     --project-path <same as parent> \
     --parent-process-path <parent process directory> \
     --parent-id <parent process ID> \
     --parent-name <parent process name> \
     --return-to-step <next parent step UUID>
   ```

#### C. Register Child in Parent

```
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/process_manager.py register-child-process \
  --process-dir <parent process directory> \
  --child-id <child process ID from child process.json> \
  --child-name <child process name> \
  --child-status running \
  --spawned-at-step <parent step UUID that has subProcessTrigger> \
  --sync-point <parent step UUID (same step for syncPoint: "immediate")> \
  --child-process-path <child process directory>
```

#### D. Bind Session to Child

1. Write an empty `.session` file in the child process directory
2. Verify the hook fills it with the session ID

#### E. Drive Child Process Steps

Read the child's `process.json`. For each child step in order:

1. Check if the child step itself is a sub-process orchestrator step (recursive) or a regular step
2. **Regular child step**: Call `step-executor-delegation "<child-process-dir>" "<child-step-id>"`
3. Handle `approvalRequired` on child steps the same way as parent steps (present deliverables, wait for approval, handle corrections)
4. After each child step completes, advance to the next child step

#### F. Complete Child and Parent Step

1. After all child steps are done, complete the child process:
   ```
   python3 ${CLAUDE_PLUGIN_ROOT}/scripts/process_manager.py update-process-status \
     --process-dir <child directory> \
     --status completed \
     --summary "<brief summary of what the child process accomplished>"
   ```
   This automatically updates the parent's `subProcessState.childProcesses` status.
2. Mark the parent orchestrator step as completed
3. Continue to the next parent step

## State Restoration

Read `process.json` and memory topic files from `memory/` to fully restore context:
- Current step and progress
- Completed work and decisions made
- Files created and important notes

## Sync Point Handling

When continuing a process with sub-processes:

1. Read `process.json` `subProcessState` section
2. Check `childSubProcesses` array for status
3. At sync points: if any sub-processes still "running", report status and offer to resume the child process
4. Sub-processes notify parent by updating parent's memory — no polling needed

## JSON-Only Architecture

All process and template data is stored exclusively in JSON files. No MD view files are created or required. The UI app handles user-facing presentation.

## Subagent Delegation

- **step-executor**: To execute a step, invoke the `step-executor-delegation` skill with the process directory and step ID. Do NOT call the Agent tool directly for step execution.
- **process-spawner**: Create new processes/sub-processes in isolated context
- Use the Agent tool with the appropriate `subagent_type` (except for step-executor — use the skill)
