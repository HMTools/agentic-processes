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
| Must create instance | Always create process.md, memory.md, log.md |
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
- `memory.md` (initialized with template structure)
- `log.md` (initialized with template structure and metadata)

### Command Behavior

When `/process-new` is invoked:

1. **Check for Existing Processes**
   - Check `.user-processes/active/` for similar processes
   - If found, ask if user wants to resume or create new

2. **List Available Templates**
   - Display templates from `.processes/templates/`
   - Show purposes and required parameters
   - Help select appropriate template
   - **If no template fits**: Inform user and stop

3. **Collect Parameters**
   - Ask for required parameters
   - Infer parameters from context when possible
   - Confirm optional parameters

4. **Resolve Step References**
   - Scan template for `@framework-step:category/step-name` references
   - Keep references as references (don't expand)
   - Include brief description from step's Description section

5. **Create Process Instance** (MANDATORY)
   - Create process directory
   - Create `process.md` with substituted placeholders
   - Initialize `memory.md` from template
   - Initialize `log.md` from template
   - Set status to "Running"

6. **Start Process**
   - Display summary
   - Highlight first step
   - Offer to begin immediately

### File Initialization

1. **process.md**: All `{{placeholders}}` substituted, step references kept as references
2. **memory.md**: Initialized from `.processes/templates/memory-template.md`
3. **log.md**: Initialized from `.processes/templates/log-template.md` with metadata

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
IMMEDIATELY Log to log.md → 
Make File Changes → 
Update log.md with changes
```

**Log Format:**
```markdown
### User Interactions
1. **User Request**: {exact request}
   - **Reason**: {why}
   - **Agent Response**: {what changed}
   - **Timestamp**: {YYYY-MM-DD HH:mm:ss}
```
