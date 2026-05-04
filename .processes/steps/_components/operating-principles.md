# Agent Operating Principles

Shared component containing all operating principles that agents must follow during process execution. Referenced by `init-process-principles` step and all step Init-Step/End-Step substeps.

## The 4 Principles

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

### 4. GENERATE INTERACTION OPTIONS
**Rule**: Whenever you need any form of user input, dynamically generate relevant options via the `process-state-update` skill. Never use predefined options from templates.

**Options format**:
- Each option must have an `id` (unique identifier) and `label` (display text)
- Optionally include `description` for clarification and `isDefault: true` for the default choice
- Example option IDs: `approve`, `reject`, `revise`

---

## End-Step Verification Checklist

Every step's End-Step compliance check MUST verify all of the following. This checklist is the **single source of truth** for what End-Step verifies — agents read this file at End-Step time.

- [ ] **Principle 4 (INTERACTION OPTIONS)**: If the step had any point where the agent stopped for user input (approval, question, clarification), were interaction options generated via the skill at each of those points?
- [ ] **Cross-References**: Were cross-reference updates recorded? (Key decisions from this step, files modified/created by this step.)
