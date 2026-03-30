---
name: process-new
description: Start a new process from a template. Triggers the process-spawner agent.
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
| Must create instance | Always create process.json, process.md, memory.json, log.json |

---

## Agent Layer

### Instructions

Reference the process management documentation for complete instructions:
`docs/process-management.md`

### Mandatory Requirements

#### Always Use Templates

**CRITICAL RULE**: You MUST always use an existing process template. **NEVER** skip templates or do work directly without a template.

- ✅ **ALWAYS**: Use a template from `.processes/templates/`
- ❌ **NEVER**: Create files directly without a template
- ❌ **NEVER**: Skip the template selection process
- ❌ **NEVER**: Implement work outside of a process

**If no template exists:**
- Inform the user that no relevant template is available
- List what templates exist and explain why they don't fit
- Stop and wait for user's decision
- Do NOT automatically create a template
- Do NOT proceed with any work

#### Always Create Process Instance

**CRITICAL RULE**: The `/process-new` command MUST always create a process instance. **NEVER** create a plan, design document, or any other type of document instead.

**Process Instance Structure:**
- Directory: `.user-processes/active/process-{name}-{YYYYMMDD}/`
- `process.json` (primary state file - status, steps, current state)
- `process.md` (user-readable documentation with template placeholders substituted)
- `memory.json` (step information and cross-references)
- `log.json` (execution history and user interactions)

### Plugin Architecture

**CRITICAL RULE**: When the plugin is installed, distinguish between the **plugin location** and the **user's project**.

#### Identifying Locations

| Location | Identification | Contains |
|----------|----------------|----------|
| **Plugin Location** | Where the plugin is installed (marketplace cache or `--plugin-dir` path) | Templates, steps, prompts, framework code |
| **User's Project** | The repository being worked on (where code changes happen) | Application code, `.user-processes/` |

#### Resource Location Rules

| Resource | Source Location | Path |
|----------|-----------------|------|
| Templates | Plugin | `.processes/templates/` |
| Steps | Plugin | `.processes/steps/` |
| Process instances | **User's project** | `.user-processes/active/` |
| Guidelines | **User's project** | `.user-processes/guidelines/` |
| User-defined templates | User's project | `.user-processes/templates/` |
| User-defined steps | User's project | `.user-processes/steps/` |

#### Detection Logic

The AI accesses plugin files relative to the plugin root. Paths like `.processes/templates/` work because they're relative to the plugin root.

Process instances (`.user-processes/`) are always created in the **user's project**, not in the plugin location.

**NEVER create process instances in the plugin location.**

### Subagent Delegation Model

When the instructions reference delegating to subagents (`process-spawner` or `step-executor`), use the **Task tool** to spawn a subagent:

- **process-spawner**: Use `Task` tool and provide the full content of `agents/process-spawner.md` as the prompt, along with the template path, parameters, and parent context.
- **step-executor**: Use `Task` tool and provide the full content of `agents/step-executor.md` as the prompt, along with the step definition, process context, and step number.

### JSON-First Architecture

**CRITICAL**: All templates and steps use a JSON-First Architecture:
- **JSON files** (`.json`) contain all agent guidance, structured data, and machine-readable instructions
- **MD files** (`.md`) contain user-friendly documentation only

**When reading templates or steps:**
1. **ALWAYS** read the `.json` file first for complete guidance
2. The MD file provides user context but JSON has the authoritative instructions
3. Use JSON data for: step sequences, parameters, substeps, guidance, tools, best practices

### Command Behavior

When `/process-new` is invoked:

1. **Check for Existing Processes**
   - Check `.user-processes/active/` for similar processes
   - If found, ask if user wants to resume or create new

2. **List Available Templates**
   - Display templates from `.processes/templates/`
   - **Read both `.json` and `.md` files** for each template
   - Show purposes and required parameters from JSON
   - Help select appropriate template
   - **If no template fits**: Inform user and stop

3. **Collect Parameters**
   - Ask for required parameters
   - Infer parameters from context when possible
   - Confirm optional parameters

4. **Resolve Step References**
   - Scan template for `@framework-step:category/step-name` references
   - Keep references as references (don't expand)
   - **Read step's `.json` file** for complete guidance when executing
   - Include brief description from step's metadata

5. **Create Process Instance** (MANDATORY)
   - Create process directory
   - **Create `process.json` FIRST** — this MUST be the first file written. Include `metadata.sessionId` as an empty string `""`. The `bind-session-to-process` PostToolUse hook fires on this write and injects the real session ID. Do NOT batch this write with other files — it must be a standalone Write so the hook fires cleanly.
   - After writing process.json, read it back to confirm sessionId was populated (non-empty). If still empty, warn the user that hooks may not be active.
   - Then create the remaining files:
     - Create `process.md` with substituted placeholders
     - Initialize `memory.json` from template
     - Initialize `log.json` from template
   - Set status to "running"
   - WITHOUT the early process.json write, all enforcement hooks (approval blocking, log-first, todo blocking, stop checks) will be **silently disabled** for the entire session.

6. **Start Process (Auto-Execute Step 0)**
   - Display summary
   - **Automatically execute Step 0** (Init Process Principles) - do NOT ask for confirmation
   - Step 0 has no approval checkpoint and is mandatory for every process
   - After Step 0 completes, execute the next step via step-executor subagent — do NOT ask for permission before executing
   - If the step has `approvalRequired: true`: execute it first via step-executor, then present its deliverables to the user and wait for approval
   - If the step has no approval required, continue to the next step after completion
   - **CRITICAL**: `approvalRequired: true` means **post-execution approval of deliverables**. NEVER write `pending-interaction.json` or ask for user permission before a step runs. Pre-execution gating is a process violation.

### Handling User Corrections at Approval Checkpoints

**CRITICAL**: When a step has `approvalRequired: true` and the user provides **corrections or feedback** instead of simple approval:

1. **Log the correction immediately** to log.json
2. **Delegate correction processing** to `step-executor` subagent with:
   - **Operating principles** (all 5 principles from `.processes/steps/_components/operating-principles.md`) — subagents run in isolated context and MUST receive these explicitly
   - The correction details from the user
   - Current step context and artifacts to update
   - Instruction to apply the correction and re-prepare deliverables
   - **Scope boundary**: explicitly state what the subagent should and should NOT do
3. **Wait for subagent completion** (foreground execution)
4. **Present updated deliverables** for re-approval
5. **Repeat** until user provides simple approval ("approved", "yes", etc.)

**Why delegate corrections to subagent?**
- Maintains context isolation (Principle 3: USE SUBAGENTS)
- Subagent has full step context to properly update all artifacts
- Main agent stays in orchestration role
- Ensures consistency with how initial step execution works

### File Initialization

**CRITICAL: Read TypeScript types BEFORE creating files**

Before creating any process files, you MUST read the type definitions:
- `.processes/types/process-instance.ts` for process.json structure
- `.processes/types/memory-file.ts` for memory.json structure
- `.processes/types/log-file.ts` for log.json structure

**1. process.json** - MUST conform to `ProcessInstance` type:
```json
{
  "type": "process-instance",
  "id": "<UUID>",
  "name": "<process name>",
  "metadata": {
    "template": "<template-name>",
    "templateCategory": "<category>",
    "created": "<ISO 8601>",
    "lastUpdated": "<ISO 8601>",
    "projectPath": "<absolute project path>",
    "processPath": ".user-processes/active/process-<name>-<YYYYMMDD>"
  },
  "status": "running",
  "parameters": { ... },
  "currentState": {
    "activeStepId": "<UUID of step 0>",
    "activeStepName": "<name of step 0>",
    "actionSummary": "Initializing process",
    "actionDetails": "Process created, ready to begin"
  },
  "steps": [
    {
      "id": "<UUID>",
      "number": 0,
      "name": "<step name>",
      "status": "pending",
      "stepRef": "@framework-step:category/step-name",
      "approvalRequired": false
    }
  ]
}
```

**CRITICAL Requirements**:
- `status` MUST be lowercase (`running`, not `Running`)
- `metadata` object is REQUIRED (not flat fields at root)
- `currentState.activeStepId` and `activeStepName` are REQUIRED (not `currentStepId`)
- Steps MUST NOT have `output` field (that's only in template definitions)
- All IDs MUST be valid UUIDs

2. **process.md**: All `{{placeholders}}` substituted, step references kept as references
3. **memory.json**: Initialized from `.processes/templates/memory-template.md` (JSON schema) - MUST conform to `MemoryFile` type
4. **log.json**: Initialized from `.processes/templates/log-template.md` (JSON schema) - MUST conform to `LogFile` type

### Step Reference Format

```markdown
- [ ] Step 1: Step name
  - **Step**: `@framework-step:category/step-name`
  - **Description**: Brief description
  - **Output**: Brief output description
```

### Sub-Process Creation via Delegation

When `/process-new` is invoked from within an active process (spawning a sub-process):

1. **Detect Parent Context**
   - Check if there's an active parent process in context
   - If spawning from a step, record parent process path and step number

2. **Delegate to process-spawner Subagent**
   - Invoke the `process-spawner` subagent with:
     - Template path to use
     - Process parameters (required and optional)
     - Parent context: parent process path, spawn step number
   - **Wait for subagent completion** (foreground execution)

3. **Process Subagent Results**
   - Receive: process ID, directory path, status
   - Verify process was created successfully
   - If sub-process: verify parent memory was updated

4. **Return to Parent Flow**
   - Report new process creation to user
   - If sub-process: return control to parent process
   - If standalone: offer to start the new process

**Note**: The `process-spawner` subagent handles all file creation and parent-child relationship setup internally.
