# Step 1: Understand Concept - Context Documentation

## Concept Overview

**Concept Name**: Dynamic Interaction Options (Process-Level)

**Core Principle**: `interactionOptions` must NOT be predefined in template definitions, and must NOT live on individual steps. Instead, whenever an agent needs user input during process execution, it dynamically generates the relevant options and sets them on a **process-level** `pendingInteraction` field in `process.json`, so the UI can render them for easy user selection.

**Design Decision**: **Option B** -- Move interactionOptions from `ProcessStep` to a new top-level `pendingInteraction` field on `ProcessInstance`.

**Guidance Approach**: Add as a new **operating principle** (Principle 8) in `operating-principles.md`. This is simpler and cleaner than scattering guidance across multiple files. The principle automatically applies everywhere via the existing `init-process-principles` step.

**User's Intent**: "I dont want the interactionOptions to be pre set (like in the steps), I want simply to set a principal / concept that is mandatory that whenever the agent wants an input from the user he generates the relevant options and put them in the process.json in the interactionOptions object for the user to select from them easily, that's all."

---

## Current State (per file)

### Framework Types

| File | Current State | Problem |
|------|--------------|---------|
| `template-definition.ts` | `interactionOptions` optional field on step entries (lines 71-81) | Templates can predefine static options -- not wanted |
| `process-instance.ts` | `interactionOptions` and `selectedOptions` on `ProcessStep` (lines 141-145); `InteractionOption` interface (lines 163-175) | Options are per-step, but should be a process-level concept |

### Framework Guidance (to CLEAN UP -- remove scattered references)

| File | Current State | Action |
|------|--------------|--------|
| `mandatory-approval-checkpoint.md` | Lines 7-8, 14-16, 26: interactionOptions guidance scattered here | **REMOVE** interactionOptions-specific text (the new principle covers this) |
| `process-new.md` | Line 152: "ensure interactionOptions are set on the step entry" | **REMOVE** interactionOptions-specific text |
| `process-continue.md` | Line 177: same as process-new.md | **REMOVE** interactionOptions-specific text |
| `create-step-file.json` | Line 49: architectural boundary note about interactionOptions | **REMOVE** interactionOptions-specific text |
| `operating-principles.md` | Currently 7 principles, no mention of interactionOptions | **ADD** Principle 8: dynamic interaction options |
| `process-continue.md` | Lines 29-48: has 7 principles duplicated inline (not referencing shared file). Line 177: interactionOptions-specific text | **ADD** Principle 8 to inline principles list; **REMOVE** interactionOptions text from line 177 |

### Templates

| File | Current State | Problem |
|------|--------------|---------|
| `update-process-template.json` | Hardcoded `interactionOptions` arrays on steps 2 and 4 (lines 55, 72) | Predefined static options -- must be removed |

### UI Application (agentic-processes-ui)

| File | Current State | Impact |
|------|--------------|--------|
| `src/types/index.ts` | `interactionOptions` and `selectedOptions` on `ProcessStep` (lines 79-81) | Must move to process-level type |
| `src/services/lazyPromptsService.ts` | `getActiveStepOptions()` reads from `activeStep?.interactionOptions` (line 31) | Must read from `process.pendingInteraction` instead |
| `src/components/LazyPromptModal/index.tsx` | Uses `getActiveStepOptions(process)` and `activeStep?.selectedOptions` (lines 36, 272) | Must use new process-level field |
| `src/components/DiagramView/StepNode.tsx` | Shows "Options" badge when `step.interactionOptions` exists (line 101) | **REMOVE** the badge -- options are transient, not a step property; "Approval" badge already covers it |

---

## Target State

### New Operating Principle (Principle 8) in `operating-principles.md`

```markdown
### 8. GENERATE INTERACTION OPTIONS
**Rule**: When you need user input (approval, choices, decisions), dynamically generate relevant options and set them in `process.json` `pendingInteraction` field. Never use predefined options from templates.

**Verification**: Output "✓ pendingInteraction set in process.json" when options are generated
```

This single principle replaces all the scattered interactionOptions guidance. It must be added in two places:
1. `operating-principles.md` -- the shared source of truth (loaded by `init-process-principles` for new processes)
2. `process-continue.md` -- inline principles copy (lines 29-48, used when resuming processes since Step 0 is already done)

### New Type Design in `process-instance.ts`

**Add** a new `pendingInteraction` field on `ProcessInstance`:

```typescript
export interface ProcessInstance {
  // ... existing fields ...
  
  /** Current pending user interaction, if any. Set by agent when input is needed, cleared when user responds. */
  pendingInteraction?: PendingInteraction;
}

export interface PendingInteraction {
  /** Options for user selection, dynamically generated by the agent */
  options: InteractionOption[];
}
```

No `stepId` needed -- `currentState.activeStepId` already identifies which step the interaction belongs to.
No `selectedOptions` needed -- once the user picks an option, the agent clears `pendingInteraction` and continues.

**Remove** from `ProcessStep`:
- `interactionOptions?: InteractionOption[]`
- `selectedOptions?: string[]`

**Remove** from `PendingInteraction` (vs original design):
- `selectedOptions` -- not needed; user's choice is sent as text to agent, agent clears `pendingInteraction`

**Keep** unchanged:
- `InteractionOption` interface (still needed for the options shape)
- `approvalRequired` on `ProcessStep` (still valid -- indicates step needs approval)
- `approved` on `ProcessStep` (still valid -- tracks if approved)

**Remove** from `template-definition.ts`:
- `interactionOptions` field from step entries (lines 71-81)

### Changes Summary

| File | Action | Details |
|------|--------|---------|
| `operating-principles.md` | **ADD** | New Principle 8: GENERATE INTERACTION OPTIONS |
| `process-continue.md` | **ADD + CLEAN UP** | Add Principle 8 to inline principles (lines 29-48); Remove interactionOptions text from line 177 |
| `process-instance.ts` | **RESTRUCTURE** | Remove `interactionOptions`/`selectedOptions` from `ProcessStep`; Add `pendingInteraction?: PendingInteraction` on `ProcessInstance` (options only, no selectedOptions); Keep `InteractionOption` |
| `template-definition.ts` | **REMOVE** | Remove `interactionOptions` from step entry type |
| `mandatory-approval-checkpoint.md` | **CLEAN UP** | Remove interactionOptions-specific text (principle covers it) |
| `process-new.md` | **CLEAN UP** | Remove interactionOptions-specific text (principle covers it) |
| `process-continue.md` | **CLEAN UP** | Remove interactionOptions-specific text (principle covers it) |
| `create-step-file.json` | **CLEAN UP** | Remove architectural boundary note about interactionOptions (principle covers it) |
| `update-process-template.json` | **REMOVE** | Remove hardcoded `interactionOptions` arrays from steps |
| UI `src/types/index.ts` | **RESTRUCTURE** | Mirror type changes from process-instance.ts |
| UI `src/services/lazyPromptsService.ts` | **UPDATE** | Read from `process.pendingInteraction` |
| UI `src/components/LazyPromptModal/index.tsx` | **UPDATE** | Use `process.pendingInteraction` |
| UI `src/components/DiagramView/StepNode.tsx` | **REMOVE** | Remove "Options" badge code (lines 101-105) -- no longer relevant |

---

## Requirements

1. **New operating principle**: Add Principle 8 to `operating-principles.md` -- single source of truth for the concept
2. **Move to process level**: New `pendingInteraction` field on `ProcessInstance`
3. **Remove from templates**: No template type or JSON file should contain `interactionOptions`
4. **Clean up scattered guidance**: Remove interactionOptions-specific text from 4 guidance files
5. **UI compatibility**: Update UI types and components to read from the new location
6. **Clean removal**: Remove `interactionOptions` and `selectedOptions` from `ProcessStep` type

---

## Success Criteria

- [ ] Principle 8 (GENERATE INTERACTION OPTIONS) added to `operating-principles.md`
- [ ] `PendingInteraction` interface added to `process-instance.ts`
- [ ] `pendingInteraction` field added to `ProcessInstance`
- [ ] `interactionOptions` and `selectedOptions` removed from `ProcessStep`
- [ ] `PendingInteraction` has only `options` field (no `selectedOptions`)
- [ ] `InteractionOption` interface kept (still used by `PendingInteraction`)
- [ ] `interactionOptions` field removed from `template-definition.ts` step entries
- [ ] `update-process-template.json` has no hardcoded `interactionOptions`
- [ ] Principle 8 added to inline principles in `process-continue.md` (lines 29-48)
- [ ] interactionOptions-specific text removed from `mandatory-approval-checkpoint.md`, `process-new.md`, `process-continue.md` (line 177), `create-step-file.json`
- [ ] UI types mirror the new structure
- [ ] UI components read from `process.pendingInteraction`

---

## Constraints

1. **UI must still work**: Update reading location, rendering behavior stays the same
2. **Migrate existing processes**: Remove `interactionOptions` from step entries in all existing process.json files (no backward compatibility code in UI)
3. **`InteractionOption` interface unchanged**: The shape of individual options stays the same
4. **`approvalRequired`/`approved` stay on ProcessStep**: These are step-level concerns and remain
5. **Scope**: Operating principles, framework types, guidance cleanup, one template, UI types/components, process migration

### Processes to migrate (remove `interactionOptions` from steps)

**Active:**
- `.user-processes/active/process-set-dynamic-interaction-options-20260206/process.json` (this process)
- `.user-processes/active/process-update-process-template-20260204/process.json`
- `.user-processes/active/process-review-and-validate-updates-step-20260204/process.json`
- `.user-processes/active/process-apply-template-updates-step-20260204/process.json`

**Completed:**
- `.user-processes/completed/process-plan-template-updates-step-20260204/process.json`
- `.user-processes/completed/process-analyze-existing-template-step-20260204/process.json`
