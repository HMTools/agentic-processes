---
name: process-new
description: Start a new process from a template. Creates process directory and all state files via Python scripts.
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

- Always use a template from `.processes/templates/`
- Never create files directly without a template
- If no template exists: inform the user, list what templates exist, stop and wait

### Plugin Architecture

| Location | Contains |
|----------|----------|
| **Plugin Location** | Templates (`.processes/templates/`), steps (`.processes/steps/`), framework code |
| **User's Project** | Application code, `.user-processes/` (process instances live here) |

**NEVER create process instances in the plugin location.**

## Command Behavior

When `/process-new` is invoked:

### 1. Check for Existing Processes

- Check `.user-processes/active/` for similar processes
- If found, ask if user wants to resume or create new

### 2. List Available Templates

- Display templates from `.processes/templates/`
- Read both `.json` and `.md` files for each template
- Show purposes and required parameters from JSON
- If no template fits: inform user and stop

### 3. Collect Parameters

- Ask for required parameters
- Infer parameters from context when possible
- Confirm optional parameters

### 4. Resolve Step References

- Scan template for `@framework-step:category/step-name` references
- Keep references as references (don't expand)
- Read step's `.json` file for complete guidance when executing

### 5. Create Process Instance (MANDATORY)

**Session Binding**: Before creating process files, bind the session:
1. Write an empty `.session` file in the process directory: `Write(.session, "")`
2. The `bind-session-to-process` hook fills it with the session ID
3. Verify `.session` contains a non-empty session ID

**Create Process Files**: Use the `process_manager.py` script:
```
Bash(python3 ${PLUGIN_ROOT}/scripts/process_manager.py create-process \
  --template-path <template.json path> \
  --name "<process name>" \
  --params '<JSON parameters>' \
  --process-dir <process directory> \
  --project-path <absolute project path>)
```

The script writes `process.json`, `memory.json`, and `log.json` directly. Check stdout for success/error.

**Create `process.md`**: Write the user-readable documentation with substituted placeholders (this is the only file the agent Writes directly — it's documentation, not state).

### 6. Start Process (Auto-Execute Step 0)

- Display summary
- **Automatically execute Step 0** (Init Process Principles) — do NOT ask for confirmation
- After Step 0, execute the next step via step-executor subagent
- **CRITICAL**: `approvalRequired: true` means **post-execution approval of deliverables**. NEVER write `pending-interaction.json` or ask for user permission before a step runs.

## Handling User Corrections at Approval Checkpoints

When a step has `approvalRequired: true` and the user provides corrections instead of simple approval:

1. Log the correction immediately via `process_manager.py log-interaction`
2. Delegate correction processing to `step-executor` subagent
3. Wait for subagent completion
4. Present updated deliverables for re-approval
5. Repeat until user provides simple approval

## Sub-Process Creation

When invoked from within an active process (spawning a sub-process):

1. Detect parent context (active parent process path, spawn step)
2. Delegate to process-spawner subagent with template path, parameters, and parent context
3. The script's `--parent-process-path` arg sets up the parent-child relationship
4. Return control to parent process after creation

## JSON-First Architecture

- **JSON files** (`.json`) contain all agent guidance and machine-readable instructions
- **MD files** (`.md`) contain user-friendly documentation only
- Always read the `.json` file first for complete guidance

## Subagent Delegation

- **step-executor**: Execute individual steps in isolated context
- **process-spawner**: Create new processes/sub-processes in isolated context
- Use the Agent tool with the appropriate `subagent_type`
