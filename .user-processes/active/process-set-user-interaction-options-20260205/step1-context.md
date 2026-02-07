# Step 1: Understand Context - User Interaction Options

## Concept Overview

**Concept Name**: User Interaction Options

**Description**: When a step needs user interaction (decisions, approvals, choices), it should provide structured multiple-choice options that UI applications can render as buttons, dropdowns, or selection lists. This eliminates ambiguity and makes user interaction faster and more consistent.

## Current State

Currently, process steps have limited interaction mechanisms:

| Mechanism | Location | Purpose | Limitation |
|-----------|----------|---------|------------|
| `approvalRequired` | ProcessStep | Flag for yes/no approval | Binary only - no multiple choices |
| `approved` | ProcessStep | Tracks approval status | Only boolean result |
| `UserInteraction` | log-file.ts | Logs request/response | Free-form text, no structured options |

**Key Gap**: There is no way to define structured options for user selection. When a step needs user input, the agent must describe options in natural language, and the user must respond in free-form text.

## Target State

Steps can define an `interactionOptions` array that specifies selectable choices:

```typescript
interface ProcessStep {
  // ... existing fields ...
  
  /** Structured options for user interaction when step needs input */
  interactionOptions?: InteractionOption[];
  
  /** User's selected option ID(s) - populated after selection */
  selectedOptions?: string[];
}

interface InteractionOption {
  /** Unique identifier for this option */
  id: string;
  
  /** Display label for UI */
  label: string;
  
  /** Optional longer description/tooltip */
  description?: string;
  
  /** Whether this is selected by default */
  isDefault?: boolean;
}
```

**UI Rendering Examples**:
- Approval step: `[Approve] [Reject] [Request Changes]`
- Design review: `[Proceed as-is] [Minor tweaks needed] [Major revision required]`
- Branching: `[Option A: Quick fix] [Option B: Proper refactor] [Option C: Skip for now]`

## Target Files

| File | Change Type | Description |
|------|-------------|-------------|
| `.processes/types/process-instance.ts` | **Modify** | Add `InteractionOption` interface and `interactionOptions`/`selectedOptions` fields to `ProcessStep` |
| `.processes/types/template-definition.ts` | **Modify** | Add optional `interactionOptions` to step definitions in templates |
| `.processes/types/step-definition.ts` | **Consider** | May add `defaultInteractionOptions` for steps that commonly need options |

## Requirements

### Functional Requirements
1. **R1**: Steps can define zero or more interaction options
2. **R2**: Each option has a unique `id` and human-readable `label`
3. **R3**: Options can have optional `description` for tooltips/details
4. **R4**: One option can be marked as `isDefault`
5. **R5**: Selected option(s) are tracked in `selectedOptions` array
6. **R6**: Backward compatible - existing process.json files without options remain valid

### Non-Functional Requirements
1. **NFR1**: Type-safe - full TypeScript type definitions
2. **NFR2**: UI-ready - schema is directly usable by UI applications
3. **NFR3**: Simple - minimal fields, easy to understand and use

## Success Criteria

| Criteria | Verification Method |
|----------|---------------------|
| TypeScript types compile without errors | `tsc --noEmit` on types folder |
| Existing process.json files remain valid | Load existing processes, no parse errors |
| New fields are optional (backward compatible) | All new fields marked with `?` |
| UI app can render options | Sample JSON renders in UI (future) |

## Constraints

1. **TypeScript Only**: Changes are to `.ts` type definition files, not runtime code
2. **Backward Compatible**: All new fields must be optional
3. **JSON Serializable**: All types must be JSON-serializable (no Date objects, functions, etc.)
4. **Consistent Naming**: Follow existing naming conventions (camelCase, descriptive names)

## Questions/Gaps

None identified - requirements are clear from the user's request.

## Related Patterns

Looking at existing interaction patterns in the codebase:
- `approvalRequired`/`approved` pattern in ProcessStep
- `UserInteraction` in log-file.ts for logging interactions
- `feedbackLoop` in template-definition.ts for iterative approval

The new `interactionOptions` complements these by providing structured pre-defined choices.
