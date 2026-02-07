# Agent Operating Principles

Shared component containing all operating principles that agents must follow during process execution. Referenced by `init-process-principles` step and all step Init-Step/End-Step substeps.

## The 8 Principles

### 1. LOG FIRST, ACT SECOND
**Rule**: Log every user interaction to log.json BEFORE responding or making changes

**Verification**: Output "✓ Logged to log.json" before file changes

---

### 2. READ JSON FOR GUIDANCE
**Rule**: Step instructions live in .json files, not .md files

---

### 3. STOP AT CHECKPOINTS
**Rule**: When approvalRequired: true, present deliverables, ask for approval, WAIT

**Verification**: Output "⏸️ Awaiting approval" and stop

---

### 4. NO EXTERNAL TODOS
**Rule**: Process steps ARE your task list. Do NOT use todo_write during processes

---

### 5. VERIFY MANDATORY ACTIONS
**Rule**: For MANDATORY/CRITICAL instructions: do action, then output confirmation

**Verification**: Output "✓ [Action] completed"

---

### 6. USE SUBAGENTS FOR STEPS
**Rule**: Delegate step execution to step-executor subagent. Do NOT execute steps directly in the main conversation.

**Verification**: Each step must be executed via Task tool with subagent_type='step-executor'

---

### 7. FOLLOW TYPE STRUCTURES
**Rule**: All process files (process.json, memory.json, log.json) MUST conform to TypeScript type definitions in `.processes/types/`

**Verification**: Validate at End-Step: type discriminators present, field names match types, step IDs use correct format

**Key Requirements**:
- `process.json`: type='process-instance', steps[].id as UUID
- `memory.json`: type='memory-file', steps keyed by StepId, subProcessState.parentProcessPath
- `log.json`: type='log-file', metadata.parentProcessPath, metadata.subProcessPaths

---

### 8. GENERATE INTERACTION OPTIONS
**Rule**: Whenever you need any form of user input, dynamically generate relevant options and set them in `process.json` `pendingInteraction` field. Never use predefined options from templates.

**Verification**: Output "✓ pendingInteraction set in process.json" when options are generated
