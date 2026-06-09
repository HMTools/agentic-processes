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

### 7. Proceed with Step Delegation

- **Invoke the `step-executor-delegation` skill** with the process directory and step ID to execute the step. The skill handles all delegation — do NOT construct the step-executor prompt directly.
- Wait for skill/subagent completion
- Verify step completed successfully
- **Handle approval checkpoints**: If step has `approvalRequired: true`, the following sequence is mandatory and enforced by the script:
  1. Present deliverables to user
  2. Create pending checkpoint via `write-pending`
  3. Wait for user response (approve/reject/modify)
  4. Log the user's response via `log-interaction`
  5. Delete the pending checkpoint via `write-pending --delete`
  6. Call `approve-step` via the `process-state-update` skill to record approval (sets `approved=true`)
  7. Then call `update-step-status --status completed` (will succeed because `approved=true`)
  - **Note**: Step 7 will fail with an error if step 6 was not called -- this is enforced by `process_manager.py`
- **Handle user corrections**: Log interaction via `process-state-update` skill, then re-invoke the `step-executor-delegation` skill with the corrections as the third argument: `step-executor-delegation "<process-dir>" "<step-id>" "<user corrections>"`. Re-present updated deliverables.
- After step completion, update process state and proceed to the next step

> **Framework-injected steps**: The last two steps of every process are framework-injected: **Continuous Improvement** and **End Process Validation**. Their full definitions are embedded in `process.json` as `stepDefinition` (same as template steps). The `stepRef` field shows `@framework-step:{name}` as provenance. No file resolution needed.

## State Restoration

Read `process.json` and memory topic files from `memory/` to fully restore context:
- Current step and progress
- Completed work and decisions made
- Files created and important notes

## Sync Point Handling

When continuing a process with sub-processes:

1. Read `process.json` `subProcessState` section
2. Check `childSubProcesses` array for status
3. At sync points: if any sub-processes still "running", report; if all "completed", proceed
4. Sub-processes notify parent by updating parent's memory — no polling needed

## JSON-Only Architecture

All process and template data is stored exclusively in JSON files. No MD view files are created or required. The UI app handles user-facing presentation.

## Subagent Delegation

- **step-executor**: To execute a step, invoke the `step-executor-delegation` skill with the process directory and step ID. Do NOT call the Agent tool directly for step execution.
- **process-spawner**: Create new processes/sub-processes in isolated context
- Use the Agent tool with the appropriate `subagent_type` (except for step-executor — use the skill)
