---
name: process-new
description: Start a new process from a template. Creates process directory and all state files via Python scripts.
disable-model-invocation: true
---

# Process New

Create a new process from a template with parameter substitution and step resolution.

## When to Use

- Starting new work that requires a process workflow
- Creating a process from an existing template
- Initializing tracked work with memory and logging

## Quick Reference

| Requirement | Description |
|-------------|-------------|
| Must use template | Never skip templates or work directly |
| Must create instance | All file creation handled by `process_manager.py` |

---

## Mandatory Requirements

### Always Use Templates

**CRITICAL RULE**: You MUST always use an existing process template. **NEVER** skip templates or do work directly without a template.

- Always use a template from `~/.claude/agentic-processes/templates/processes/`
- Never create files directly without a template
- If no template exists: inform the user, list what templates exist, stop and wait
- If no templates found at all, suggest opening the Marketplace in the UI to browse and install templates from configured marketplaces.

### Unified Architecture

| Location | Contains |
|----------|----------|
| `~/.claude/agentic-processes/templates/processes/` | All process templates (steps within each) |
| `~/.claude/agentic-processes/active/` | Running process instances |

All process-related files live under `~/.claude/agentic-processes/`.

## Command Behavior

When `/process-new` is invoked:

### 1. Check for Existing Processes

- Check `~/.claude/agentic-processes/active/` for similar processes
- If found, ask if user wants to resume or create new

### 2. List Available Templates

- Display templates from `~/.claude/agentic-processes/templates/processes/`
- Read the `.json` file for each template
- Show purposes and required parameters from JSON
- If no template fits: inform user and stop

### 3. Collect Parameters

- Ask for required parameters
- Infer parameters from context when possible
- Confirm optional parameters

### 4. Verify Step Definitions

- Each step's `stepRef` is a UUID matching the `id` field of a step definition JSON file in a subdirectory of the template directory
- At process creation time, `process_manager.py` resolves `stepRef` by scanning template subdirectories for step definition files with a matching `id` field and embedding the step definition into the process instance
- The `stepRefName` companion field provides human-readable display text (e.g., `"understand-context"`) -- it is never used for resolution
- Steps with `stepRef: null` (e.g., sub-process spawner steps) are orchestrator steps with empty stepDefinition
- Templates do NOT embed `stepDefinition` inline -- step definitions live in dedicated step subfolders

> **Framework steps**: Framework steps are auto-injected by `process_manager.py` at process creation time. They are identified by `"type": "framework-step"` in their JSON definition and use plain UUID `stepRef` values (no prefix). Their full definitions are embedded in `process.json` as `stepDefinition`. Template authors do not include these steps -- they are appended automatically.

### 5. Create Process Instance (MANDATORY)

**Session Binding**: Before creating process files, bind the session:
1. Write an empty `.session` file in the process directory: `Write(.session, "")`
2. The `bind-session-to-process` hook fills it with the session ID
3. Verify `.session` contains a non-empty session ID

**Create Process Files**: Use the `process_manager.py` script:
```
Bash(python3 ${CLAUDE_PLUGIN_ROOT}/scripts/process_manager.py create-process \
  --template-path <template.json path> \
  --name "<process name>" \
  --params '<JSON parameters>' \
  --process-dir <process directory> \
  --project-path <absolute project path>)
```

The script writes `process.json`, `memory/_cross-references.json`, and `log.json` directly. Check stdout for success/error.

> **Auto-injected framework steps**: The script automatically appends **Continuous Improvement** and **End Process Validation** steps after the template's steps. These are defined in `framework-steps/` and use plain UUID `stepRef` values. Framework steps are distinguished by `"type": "framework-step"` in their definition. Template authors should not include them manually.

### 6. Start Process (Auto-Execute Step 0)

- Display summary
- For each step (starting from step 0), check if it is a **sub-process orchestrator step** (see section below) or a regular step, and handle accordingly
- **CRITICAL**: `approvalRequired: true` means **post-execution approval of deliverables**. NEVER write `pending-interaction.json` or ask for user permission before a step runs.

### 7. Step Execution Loop

For each step in the process, determine its type and execute accordingly:

**Regular step** (has non-empty `stepDefinition`):
- Invoke the `step-executor-delegation` skill with the process directory and step ID
- Handle `approvalRequired` checkpoints (see Handling User Corrections below)
- After completion, advance to the next step

**Sub-process orchestrator step** (has `subProcessTrigger` AND empty `stepDefinition`):
- Follow the **Sub-Process Step Handling** protocol below
- Do NOT call `step-executor-delegation` for these steps — the step-executor cannot handle them

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

## Handling Approval Checkpoints

### Distinguishing mid-step answers from deliverable approval

A user saying "yes" to a mid-step question (assumption validation, clarification, follow-up) is NOT approval of the step's deliverable.

Step approval is user-only. The agent does not approve steps -- the user approves via `/process-approve` (CLI) or the UI app. The agent's role at approval checkpoints is:
1. The step's deliverable file has been fully created/updated (e.g., `step0-context.md`, `implementation-plan.md`)
2. Present the deliverable to the user with explicit approval options (approve/reject/modify) via `write-pending`
3. Wait for the user's response
4. Log the user's response via `log-interaction`
5. Delete the pending checkpoint via `write-pending --delete`
6. Call `update-step-status --status completed` (will succeed only if the user has approved via `/process-approve` or the UI)

If `update-step-status --status completed` fails because the step is not yet approved, inform the user they need to run `/process-approve` first.

**Examples of what is NOT approval:**
- User confirms an assumption → mid-step answer, continue the step
- User answers a clarifying question → mid-step answer, continue the step
- User says "yes" to a suggested approach → mid-step answer, continue the step

**Examples of what IS approval:**
- User says "approved" / "approve all" after reviewing the deliverable file
- User selects "Approve" from the pending-interaction options

### Handling corrections at approval checkpoints

When a step has `approvalRequired: true` and the user provides corrections instead of simple approval:

1. Log the correction immediately via the `process-state-update` skill
2. Re-invoke the `step-executor-delegation` skill with the corrections as the third argument: `step-executor-delegation "<process-dir>" "<step-id>" "<user corrections>"`
3. Wait for skill/subagent completion
4. Present updated deliverables for re-approval
5. Repeat until user provides simple approval

## JSON-Only Architecture

All process and template data is stored exclusively in JSON files. No MD view files are created or required. The UI app handles user-facing presentation.

## Subagent Delegation

- **step-executor**: To execute a step, invoke the `step-executor-delegation` skill with the process directory and step ID. Do NOT call the Agent tool directly for step execution.
- **process-spawner**: Create new processes/sub-processes in isolated context
- Use the Agent tool with the appropriate `subagent_type` (except for step-executor — use the skill)
