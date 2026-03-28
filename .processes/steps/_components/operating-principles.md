# Agent Operating Principles

Shared component containing all operating principles that agents must follow during process execution. Referenced by `init-process-principles` step and all step Init-Step/End-Step substeps.

## The 5 Principles

### 1. READ JSON FOR GUIDANCE
**Rule**: Step instructions live in .json files, not .md files

---

### 2. VERIFY MANDATORY ACTIONS
**Rule**: For MANDATORY/CRITICAL instructions: do action, then output confirmation

**Verification**: Output "✓ [Action] completed"

---

### 3. USE SUBAGENTS FOR STEPS
**Rule**: Delegate step execution to step-executor subagent. Do NOT execute steps directly in the main conversation.

**Verification**: Each step must be executed via Task tool with subagent_type='step-executor'

---

### 4. FOLLOW TYPE STRUCTURES
**Rule**: All process files (process.json, memory.json, log.json) MUST conform to TypeScript type definitions in `.processes/types/`

**Verification**: Validate at End-Step: type discriminators present, field names match types, step IDs use correct format

**Key Requirements**:
- `process.json`: type='process-instance', steps[].id as UUID
- `memory.json`: type='memory-file', steps keyed by StepId, subProcessState.parentProcessPath
- `log.json`: type='log-file', metadata.parentProcessPath, metadata.subProcessPaths

---

### 5. GENERATE INTERACTION OPTIONS
**Rule**: Whenever you need any form of user input, dynamically generate relevant options and write them to `pending-interaction.json` in the process folder. Delete the file when the user responds. Never use predefined options from templates.

---

## End-Step Verification Checklist

Every step's End-Step compliance check MUST verify all of the following. This checklist is the **single source of truth** for what End-Step verifies — agents read this file at End-Step time.

- [ ] **Principle 4 (TYPE STRUCTURES)**: Do modified process files conform to TypeScript type definitions in `.processes/types/`?
- [ ] **Principle 5 (INTERACTION OPTIONS)**: If the step had ANY point where agent stopped for user input (approval, question, clarification), was `pending-interaction.json` created in the process folder at each of those points? Was it deleted after the user responded?
- [ ] **Cross-References**: Were `crossReferences` in memory.json updated? Append this step's `decisionsMade` entries to `crossReferences.keyDecisions`, and this step's `filesModifiedCreated` entries to `crossReferences.filesModified`.
