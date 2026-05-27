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
| Must restore state | Read process.json, process.md and memory.json |

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
- Read `process.md` (user documentation)
- Review completed steps and identify next incomplete step

### 4. Read Memory File

- Read `memory.json`
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

- Delegate step execution to the `step-executor` subagent
- Provide: operating principles, step JSON, process context, step number, scope boundary
- Wait for subagent completion (foreground execution)
- Verify step completed successfully
- **Handle approval checkpoints**: If step has `approvalRequired: true`, present deliverables and wait for approval
- **Handle user corrections**: Log interaction via `process-state-update` skill, delegate correction to subagent, re-present
- After step completion, update process state and proceed to the next step

> **Framework-injected steps**: The last two steps of every process are framework-injected: **Continuous Improvement** and **End Process Validation**. These use the `@framework-step:name` stepRef format and resolve to `{PLUGIN_ROOT}/framework-steps/{name}/{name}.json`. They are appended automatically by `process_manager.py` at creation time and should be executed like any other step.

## State Restoration

Read `process.json`, `process.md` and `memory.json` to fully restore context:
- Current step and progress
- Completed work and decisions made
- Files created and important notes

## Sync Point Handling

When continuing a process with sub-processes:

1. Read `memory.json` `subProcessState` section
2. Check `childSubProcesses` array for status
3. At sync points: if any sub-processes still "running", report; if all "completed", proceed
4. Sub-processes notify parent by updating parent's memory — no polling needed

## JSON-First Architecture

- **JSON files** (`.json`) contain all agent guidance
- **MD files** (`.md`) contain user-friendly documentation only
- Always read the `.json` file first for complete guidance

## Subagent Delegation

- **step-executor**: Execute individual steps in isolated context
- **process-spawner**: Create new processes/sub-processes in isolated context
- Use the Agent tool with the appropriate `subagent_type`
