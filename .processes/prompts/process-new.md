# Process New

Create a new process from a template with parameter substitution and step resolution.

## Instructions

Reference the process management knowledge file for complete instructions:
`ai/knowledge/best-practices/ai-tooling/process-management.md`

## ⚠️ MANDATORY REQUIREMENT: Always Use Templates

**CRITICAL RULE**: You MUST always use an existing process template. **NEVER** skip templates or do work directly without a template.

**What this means:**
- ✅ **ALWAYS**: Use a template from `.processes/templates/`
- ❌ **NEVER**: Create files directly without a template
- ❌ **NEVER**: Skip the template selection process
- ❌ **NEVER**: Implement work outside of a process

**If no template exists for the task:**
- Inform the user that no relevant template is available
- List what templates exist and explain why they don't fit
- Stop and wait for user's decision on what to do next
- Do NOT automatically create a template - let the user decide manually
- Do NOT proceed with any work - your job is done

**Enforcement:**
- Before any work, check: "Is there a template for this task?"
- If yes: Use that template
- If no: Inform the user and stop - do NOT proceed
- Never proceed without a template - wait for user's explicit decision

## ⚠️ MANDATORY REQUIREMENT: Always Create Process Instance

**CRITICAL RULE**: The `/process-new` command MUST always create a process instance. **NEVER** create a plan, design document, or any other type of document instead of a process instance.

**What this means:**
- ✅ **ALWAYS**: Create a process instance with `process.md`, `memory.md`, and `log.md` files
- ✅ **ALWAYS**: Create the process directory: `.processes/active/process-{name}-{YYYYMMDD}/`
- ❌ **NEVER**: Create a plan document instead of a process instance
- ❌ **NEVER**: Create a design document instead of a process instance
- ❌ **NEVER**: Create any other type of document instead of a process instance

**Process Instance Structure:**
- Process directory: `.processes/active/process-{name}-{YYYYMMDD}/`
- Process file: `process.md` (with template placeholders substituted)
- Memory file: `memory.md` (initialized with template structure)
- Log file: `log.md` (initialized with template structure and metadata)

**Enforcement:**
- When user invokes `/process-new`, you MUST create a process instance
- Do NOT create plans, designs, or any other documents
- The output of `/process-new` is ALWAYS a process instance in `.processes/active/`

## Command Behavior

When you invoke `/process-new`, the AI will:

1. **Check for Existing Processes**
   - Check if a similar process already exists in `.processes/active/`
   - If found, inform you and ask if you want to resume or create new

2. **List Available Templates**
   - Display all available templates from `.processes/templates/` (including `create-process-template` if it exists)
   - Show template purposes and required parameters
   - Help you select the appropriate template
   - **If no template fits**: 
     - Inform the user that no relevant template is available
     - List what templates exist and explain why they don't fit
     - Stop and wait for user's decision on what to do next
     - Do NOT automatically create a template - let the user decide manually
     - Do NOT proceed with any work - your job is done

3. **Collect Parameters**
   - Ask for required parameters from the selected template
   - Infer parameters from context when possible
   - Confirm optional parameters

4. **Resolve Step References**
   - Scan the template for `@step:category/step-name` references
   - **Keep step references as references** (do not expand with full step details)
   - Include brief description from the step's Description section
   - Apply context parameters from template
   - Full step details remain in step files and can be read when needed

5. **Create Process Instance** (MANDATORY - never create a plan or other document)
   - **CRITICAL**: This step MUST create a process instance, never a plan or design document
   - Create process directory: `.processes/active/process-{name}-{YYYYMMDD}/`
   - Create `process.md` with all placeholders substituted and step references kept as references (not expanded)
   - Initialize `memory.md` file using the memory template structure
   - Initialize `log.md` file using the log template structure with metadata
   - Set status to "Running"
   - Set Current State section appropriately
   - **Remember**: `/process-new` always creates a process instance, never a plan

6. **Start Process**
   - Display summary of created process
   - Highlight first step
   - Offer to begin working immediately

## Usage

Type `/process-new` to start creating a new process. The AI will guide you through template selection and parameter collection.

## What Gets Created

- Process directory: `.processes/active/process-{name}-{YYYYMMDD}/`
- Process file: `process.md` with step references kept as references (not expanded) and all placeholders substituted
- Memory file: `memory.md` for tracking information across steps
- Log file: `log.md` for detailed execution log with metadata initialized

## Template Selection

The AI will help you choose the right template based on your needs. Available templates are in `.processes/templates/`.

## File Initialization

When creating a process instance, the AI must create three files:

1. **process.md**: Main process file with:
   - All `{{placeholders}}` substituted with actual parameter values
   - All `@step:category/step-name` references kept as references (not expanded) with brief descriptions
   - Status set to "Running"
   - Current State section initialized
   - **Note**: Step references should remain as `@step:category/step-name` with a brief description. Full step details remain in step files and can be read when needed. This keeps process.md concise and readable.

2. **memory.md**: Memory file initialized with:
   - Template structure from `.processes/templates/memory-template.md`
   - Ready to track information across steps

3. **log.md**: Log file initialized with:
   - Template structure from `.processes/templates/log-template.md`
   - Metadata section filled with process name, template name, and start timestamp
   - Ready to log detailed execution information

## Parameter Collection

- Required parameters must be provided
- Optional parameters can be inferred from context
- The AI will ask clarifying questions if needed

## Step Resolution

When creating process.md, step references (`@step:category/step-name`) should be kept as references with brief descriptions, not expanded with full step details. This keeps process.md concise and readable (typically 100-150 lines instead of 700+ lines). Full step details remain in the step files and can be read when needed during execution.

**Format in process.md:**
```markdown
- [ ] Step 1: Step name
  - **Step**: `@step:category/step-name`
  - **Description**: Brief description from step's Description section
  - **Output**: Brief output description
  - **Context**: (if applicable)
```

**Do NOT expand** with full Guidance, Substeps, Examples, etc. - those remain in the step file.

## ⚠️ MANDATORY REQUIREMENT: Log User Interactions Immediately

**CRITICAL RULE**: Once a process is created and work begins, you MUST log every user interaction BEFORE making any file changes.

**Mandatory Workflow (applies once process is active):**
```
User Makes Request/Correction → 
IMMEDIATELY Log to log.md (before any file changes) → 
Make File Changes → 
Update log.md with what was changed
```

**Enforcement Checklist (MUST verify before ANY file modification):**
- [ ] **Did the user make a request/correction?** → Log it immediately in current step's "User Interactions" section
- [ ] **Am I about to modify a file?** → Check if I logged the user interaction first
- [ ] **Did I just modify a file?** → Update log.md "Files Modified" section with change details

**If user interaction not logged → STOP and log it first**

**Log Format (required for every user interaction):**
```markdown
### User Interactions
1. **User Request**: {exact user request or summary}
   - **Reason**: {why user explained, or inferred reason}
   - **Agent Response**: {what I changed in response}
   - **Timestamp**: {current timestamp in YYYY-MM-DD HH:mm:ss format}
```

**Reference**: See `docs/process-management.md` for complete guidelines.

**Note**: This requirement applies once the process is created and work on steps begins. During process creation itself, log any user corrections in the initial log.md file.

