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
- If no templates found at all, suggest running `/process-template-sync` to fetch templates from configured git sources.

### Unified Architecture

| Location | Contains |
|----------|----------|
| `~/.claude/agentic-processes/templates/processes/` | All process templates |
| `~/.claude/agentic-processes/templates/steps/` | All step definitions |
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

- Each step's `stepRef` is a simple name (e.g., `"understand-context"`) referencing a subfolder of the process template directory
- At process creation time, `process_manager.py` resolves `stepRef` by reading `{template_dir}/{stepRef}/{stepRef}.json` and embedding the step definition into the process instance
- Steps with `stepRef: null` (e.g., sub-process spawner steps) are orchestrator steps with empty stepDefinition
- Templates do NOT embed `stepDefinition` inline -- step definitions live in dedicated step subfolders

> **Framework steps**: Steps using the `@framework-step:name` prefix are auto-injected by `process_manager.py` at process creation time. Their full definitions are embedded in `process.json` as `stepDefinition`. Template authors do not include these steps -- they are appended automatically.

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

> **Auto-injected framework steps**: The script automatically appends **Continuous Improvement** and **End Process Validation** steps after the template's steps. These are defined in `framework-steps/` and use the `@framework-step:` prefix. Template authors should not include them manually.

### 6. Start Process (Auto-Execute Step 0)

- Display summary
- **Automatically execute Step 0** (Init Process Principles) — do NOT ask for confirmation
- After Step 0, invoke the `step-executor-delegation` skill with the process directory and step ID to execute the next step
- **CRITICAL**: `approvalRequired: true` means **post-execution approval of deliverables**. NEVER write `pending-interaction.json` or ask for user permission before a step runs.

## Handling User Corrections at Approval Checkpoints

When a step has `approvalRequired: true` and the user provides corrections instead of simple approval:

1. Log the correction immediately via the `process-state-update` skill
2. Re-invoke the `step-executor-delegation` skill with the corrections as the third argument: `step-executor-delegation "<process-dir>" "<step-id>" "<user corrections>"`
3. Wait for skill/subagent completion
4. Present updated deliverables for re-approval
5. Repeat until user provides simple approval

## Sub-Process Creation

When invoked from within an active process (spawning a sub-process):

1. Detect parent context (active parent process path, spawn step)
2. Read parent's process.json to get parent ID and name
3. Delegate to process-spawner subagent with template path, parameters, and parent context
4. The script's `--parent-process-path`, `--parent-id`, `--parent-name`, and `--return-to-step` args set up the parent reference in the child's process.json
5. Use `register-child-process` to add this child to the parent's process.json (required for UI diagram)
6. Return control to parent process after creation

## JSON-Only Architecture

All process and template data is stored exclusively in JSON files. No MD view files are created or required. The UI app handles user-facing presentation.

## Subagent Delegation

- **step-executor**: To execute a step, invoke the `step-executor-delegation` skill with the process directory and step ID. Do NOT call the Agent tool directly for step execution.
- **process-spawner**: Create new processes/sub-processes in isolated context
- Use the Agent tool with the appropriate `subagent_type` (except for step-executor — use the skill)
