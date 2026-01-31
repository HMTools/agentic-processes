# Process Continue

Continue an existing process from where it was left off.

## Description

This prompt guides the continuation of an existing process by discovering active processes, restoring state from memory, and providing guidance for the next step.

## When to Use

- Resuming work on an existing process
- Continuing after a session break
- Picking up where work was left off

## Quick Reference

| Requirement | Description |
|-------------|-------------|
| Must have process | Never work outside a process |
| Must restore state | Read process.json, process.md and memory.json |
| Must log interactions | Log user interactions before file changes |

---

## Agent Layer

### ⚠️ AGENT OPERATING PRINCIPLES

These principles apply to ALL work in this process:

1. **LOG FIRST, ACT SECOND** - Log every user interaction to log.json BEFORE responding or making changes
   - Output: "✓ Logged to log.json"

2. **READ JSON FOR GUIDANCE** - Step instructions live in .json files, not .md files

3. **STOP AT CHECKPOINTS** - When approvalRequired: true, present deliverables and WAIT for user response
   - Output: "⏸️ Awaiting approval"

4. **NO EXTERNAL TODOS** - Process steps ARE your task list. Do NOT use todo_write during processes

5. **VERIFY MANDATORY ACTIONS** - For MANDATORY/CRITICAL instructions, do action then confirm
   - Output: "✓ [Action] completed"

6. **USE SUBAGENTS FOR STEPS** - Delegate step execution to step-executor subagent. Do NOT execute steps directly.
   - Each step must be executed via Task tool with subagent_type='step-executor'

---

### Instructions

Reference the process management knowledge file for complete instructions:
`ai/knowledge/best-practices/ai-tooling/process-management.md`

### Mandatory Requirements

#### Always Use Process Templates

**CRITICAL RULE**: You MUST always work within an existing process. **NEVER** do work directly outside of a process.

- ✅ **ALWAYS**: Continue work within the process structure
- ✅ **ALWAYS**: Follow the process steps and guidance
- ❌ **NEVER**: Skip the process and do work directly
- ❌ **NEVER**: Create files outside of the process workflow
- ❌ **NEVER**: Bypass the process management system

**If no active process exists:**
- Inform the user that no active process exists
- Suggest using `/process-new` to create a process from a template first
- Never implement directly - always create a process first

#### Do Not Use Built-in Todo System

**CRITICAL RULE**: Do NOT use the built-in todo system (`todo_write` tool) when executing processes.

- The process steps defined in `process.md` serve as your task tracking
- Using external todos creates conflicts with approval checkpoints
- Approval checkpoints require you to STOP and WAIT - external todos may override this

**Process steps are your only task list** - do not create separate todos.

#### Log User Interactions Immediately

**Mandatory Workflow:**
```
User Makes Request/Correction → 
IMMEDIATELY Log to log.json (before any file changes) → 
Make File Changes → 
Update log.json with what was changed
```

**Enforcement Checklist (MUST verify before ANY file modification):**
- [ ] **Did the user make a request/correction?** → Log it immediately
- [ ] **Am I about to modify a file?** → Check if I logged the user interaction first
- [ ] **Did I just modify a file?** → Update log.json filesModified array

**Log Format:**
```markdown
### User Interactions
1. **User Request**: {exact request or summary}
   - **Reason**: {why user explained, or inferred}
   - **Agent Response**: {what changed in response}
   - **Timestamp**: {YYYY-MM-DD HH:mm:ss}
```

### Subagent Delegation Model

This framework uses Cursor subagents for context isolation:

- **step-executor**: Executes individual process steps in isolated context
- **process-spawner**: Creates new processes/sub-processes in isolated context

The main agent orchestrates while subagents execute specialized work.

### JSON-First Architecture

**CRITICAL**: All templates and steps use a JSON-First Architecture:
- **JSON files** (`.json`) contain all agent guidance, structured data, and machine-readable instructions
- **MD files** (`.md`) contain user-friendly documentation only

**When executing steps:**
1. **ALWAYS** read the step's `.json` file for complete guidance
2. JSON contains: substeps, specific actions, files to read/create/update, tools, best practices
3. The MD file provides user context but JSON has the authoritative instructions

### Command Behavior

When `/process-continue` is invoked:

1. **Discover Active Processes** (MANDATORY)
   - Search `.user-processes/active/` for all active processes
   - **If no processes exist**:
     - Inform user no active process exists
     - Suggest using `/process-new` to create one
     - **NEVER** proceed to do work directly
   - If multiple processes exist, list them with:
     - Process name and date
     - Current step
     - Overall progress
     - Last updated timestamp
   - If only one process exists, proceed directly

2. **Read Process State**
   - Read `.user-processes/active/{process-folder}/process.json` (primary state)
   - Read `.user-processes/active/{process-folder}/process.md` (user documentation)
   - Review completed steps and identify next incomplete step

3. **Read Memory File**
   - Read `.user-processes/active/{process-folder}/memory.json`
   - Summarize key information from previous steps

4. **Summarize Current State**
   - Present clear summary of:
     - Process being resumed
     - What was being worked on
     - Overall progress
     - Key information from memory
   - Highlight next step

5. **Update Current State**
   - Update **Current State** to reflect resumption
   - Set active step to next incomplete step

6. **Proceed with Guidance via Step Delegation**
   - **Delegate step execution** to the `step-executor` subagent
   - Provide to subagent:
     - Step's `.json` file path and content
     - Current process context (process.json, memory.json relevant sections)
     - Step number and any step-specific parameters
   - **Wait for subagent completion** (foreground execution)
   - **Process subagent results**:
     - Verify step completed successfully
     - Review memory/log updates made by subagent
     - Handle any issues reported
   - **Handle approval checkpoints**: If step has `approvalRequired: true`, the subagent will prepare deliverables and return; present to user and wait for approval
   - **Handle user corrections at approval**: If user provides corrections/feedback instead of simple approval:
     1. Log the correction to log.json immediately (LOG FIRST principle)
     2. **Delegate correction processing** to `step-executor` subagent with:
        - The correction details from user
        - Current step context and artifacts to update
        - Instruction to apply correction and re-prepare deliverables
     3. Wait for subagent to complete correction processing
     4. Present updated deliverables for re-approval
     5. Repeat until user provides simple approval ("approved", "yes", etc.)
   - After step completion, update process.json currentStep and offer to continue to next step

### State Restoration

The AI reads `process.json`, `process.md` and `memory.json` to fully restore context:
- Current step and progress
- Completed work
- Decisions made
- Files created
- Important notes

### Continuity

Ensure continuity by:
- Not repeating completed work
- Referencing previous decisions
- Using stored information from memory
- Maintaining context across sessions
- All work must follow process steps from template
- Update process state files as you progress
- Never skip process steps or workflow

### Sync Point Handling

When continuing a process that has sub-processes:

1. **Read Sub-Process State from Memory**
   - Read memory.json `subProcessState` section
   - Check `childSubProcesses` array for status
   - Sub-processes update this when they complete (via notify-parent-complete)

2. **At Sync Points**
   - If current step is a sync point, check Child Sub-Processes status in memory
   - If any sub-processes still "running": Report which ones, offer to continue sub-process or wait
   - If all relevant sub-processes "completed": Proceed past sync point

3. **No Polling Needed**
   - Sub-processes notify parent by updating parent's memory when done
   - Parent just reads its own memory - no need to check child process files

### Error Handling

If issues are found:
- Missing or corrupted process files are reported
- Invalid process states are identified
- Help fix problems before continuing
