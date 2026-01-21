# Process New

Create a new process from a template with parameter substitution and step resolution.

## Description

This prompt guides the creation of a new process instance from an existing template. It ensures all required parameters are collected, validates templates exist, and creates a complete process instance with tracking files.

## When to Use

- Starting new work that requires a process workflow
- Creating a process from an existing template
- Initializing tracked work with memory and logging

## Quick Reference

| Requirement | Description |
|-------------|-------------|
| Must use template | Never skip templates or work directly |
| Must create instance | Always create process.md, memory.json, log.json |
| Must log interactions | Log user interactions before file changes |

---

## Agent Layer

### Instructions

Reference the process management knowledge file for complete instructions:
`ai/knowledge/best-practices/ai-tooling/process-management.md`

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

#### Do Not Use Built-in Todo System

**CRITICAL RULE**: Do NOT use the built-in todo system (`todo_write` tool) when executing processes.

- The process steps defined in `process.md` serve as your task tracking
- Using external todos creates conflicts with approval checkpoints
- Approval checkpoints require you to STOP and WAIT - external todos may override this

**Process steps are your only task list** - do not create separate todos.

#### Always Create Process Instance

**CRITICAL RULE**: The `/process-new` command MUST always create a process instance. **NEVER** create a plan, design document, or any other type of document instead.

**Process Instance Structure:**
- Directory: `.user-processes/active/process-{name}-{YYYYMMDD}/`
- `process.md` (with template placeholders substituted)
- `memory.json` (initialized with template structure)
- `log.json` (initialized with template structure and metadata)

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
   - Create `process.md` with substituted placeholders
   - Initialize `memory.json` from template
   - Initialize `log.json` from template
   - Set status to "Running"

6. **Start Process**
   - Display summary
   - Highlight first step
   - Offer to begin immediately

### File Initialization

1. **process.md**: All `{{placeholders}}` substituted, step references kept as references
2. **memory.json**: Initialized from `.processes/templates/memory-template.md` (JSON schema)
3. **log.json**: Initialized from `.processes/templates/log-template.md` (JSON schema)

### Step Reference Format

```markdown
- [ ] Step 1: Step name
  - **Step**: `@framework-step:category/step-name`
  - **Description**: Brief description
  - **Output**: Brief output description
```

### User Interaction Logging

**Mandatory Workflow (once process is active):**
```
User Makes Request → 
IMMEDIATELY Log to log.json → 
Make File Changes → 
Update log.json with changes
```

**Log Format:**
```markdown
### User Interactions
1. **User Request**: {exact request}
   - **Reason**: {why}
   - **Agent Response**: {what changed}
   - **Timestamp**: {YYYY-MM-DD HH:mm:ss}
```

### Sub-Process Creation

When `/process-new` is invoked from within an active process (spawning a sub-process):

1. **Detect Parent Context**
   - Check if there's an active parent process in context
   - If spawning from a step, record parent process path

2. **Create with Parent Reference**
   - Set `parentProcess` in log.json metadata
   - Set parent reference in memory.json subProcessState section
   - Record "Spawned At Step" from parent context

3. **Update Parent Process**
   - Add new sub-process to parent's memory.json childSubProcesses array
   - Set status to "running"
   - Record sync point from spawn instruction

4. **Standard Creation**
   - Continue with normal process creation flow
   - Directory is standard: `.user-processes/active/process-{name}-{YYYYMMDD}/`

**Note**: Sub-processes are regular processes with parent-child references. They use the same directory structure and monitoring as any other process.
