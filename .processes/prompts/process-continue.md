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

---

## Agent Layer

### ⚠️ AGENT OPERATING PRINCIPLES

These principles apply to ALL work in this process:

1. **READ JSON FOR GUIDANCE** - Step instructions live in .json files, not .md files

2. **VERIFY MANDATORY ACTIONS** - For MANDATORY/CRITICAL instructions, do action then confirm
   - Output: "✓ [Action] completed"

3. **USE SUBAGENTS FOR STEPS** - Delegate step execution to step-executor subagent. Do NOT execute steps directly.
   - Each step must be executed via Task tool with subagent_type='step-executor'

4. **FOLLOW TYPE STRUCTURES** - All process files (process.json, memory.json, log.json) MUST conform to TypeScript type definitions in .processes/types/
   - Validate at End-Step: type discriminators present, field names match types, step IDs use correct format

5. **GENERATE INTERACTION OPTIONS** - Whenever you need any form of user input, dynamically generate options and write `pending-interaction.json` in the process folder. Delete it when the user responds.
   - Output: "✓ pending-interaction.json written to process folder"

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

### Subagent Delegation Model

This framework uses subagents for context isolation:

- **step-executor**: Executes individual process steps in isolated context
- **process-spawner**: Creates new processes/sub-processes in isolated context

The main agent orchestrates while subagents execute specialized work.

> **Tool-specific subagent invocation:** See the command file for your AI tool (e.g., `.cursor/commands/`, `.claude/commands/`, `.github/prompts/`) for how to invoke subagents in your environment.

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
   - **CRITICAL**: Write `metadata.sessionId` to process.json using the `session_id` value Claude Code exposes in the environment. WITHOUT THIS, the log-first enforcement hook (`enforce-log-first.sh`), the pending-interaction block hook, and the `UserPromptSubmit` flag hook are ALL silently disabled for this session — user interactions won't be enforced to log first and pending-interaction checkpoints won't be detected.

6. **Proceed with Guidance via Step Delegation**
   - **Delegate step execution** to the `step-executor` subagent
   - Provide to subagent:
     - **Operating principles** (all 5 principles from `.processes/steps/_components/operating-principles.md`) — subagents run in isolated context and MUST receive these explicitly
     - Step's `.json` file path and content
     - Current process context (process.json, memory.json relevant sections)
     - Step number and any step-specific parameters
     - **Scope boundary**: explicitly state what the subagent should and should NOT do
   - **Wait for subagent completion** (foreground execution)
   - **Process subagent results**:
     - Verify step completed successfully
     - Review memory/log updates made by subagent
     - Handle any issues reported
   - **Handle approval checkpoints**: If step has `approvalRequired: true`, the subagent will prepare deliverables and return; present deliverables to the user and wait for approval
   - **Handle user corrections at approval**: If user provides corrections/feedback instead of simple approval:
     1. Log the correction to log.json immediately
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

### Validation on Resume (Principle 4: FOLLOW TYPE STRUCTURES)

**After reading process files, validate they conform to TypeScript types in `.processes/types/`:**

| File | Type Definition | Key Requirements |
|------|----------------|------------------|
| `process.json` | `ProcessInstance` | `type: 'process-instance'`, `id`, `name`, `metadata`, `status`, `steps[]` with UUIDs |
| `memory.json` | `MemoryFile` | `type: 'memory-file'`, `metadata.process`, `subProcessState.parentProcessPath` |
| `log.json` | `LogFile` | `type: 'log-file'`, `metadata.parentProcessPath`, `metadata.subProcessPaths` |

**Quick Validation Checklist:**
- [ ] All files have correct `type` discriminator
- [ ] Field names match types (e.g., `parentProcessPath` not `parentProcess`)
- [ ] Step keys use UUID format

**If structural issues found**: Report to user and offer to fix before continuing.

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
