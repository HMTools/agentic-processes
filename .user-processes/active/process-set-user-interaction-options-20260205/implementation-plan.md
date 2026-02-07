# Implementation Plan: User Interaction Options

## Requested State

Steps in `process.json` can define structured interaction options that UI applications render as selectable choices. When a step needs user input, instead of free-form text, users see buttons/options to click.

**Schema**:
```typescript
interface InteractionOption {
  id: string;           // Unique ID (e.g., "approve", "reject", "option-a")
  label: string;        // Display text (e.g., "Approve", "Reject")
  description?: string; // Tooltip text (optional)
  isDefault?: boolean;  // Pre-selected option (optional)
}

// Added to ProcessStep
interactionOptions?: InteractionOption[];  // Available choices
selectedOptions?: string[];                // User's selection(s)
```

## Implementation Approach

1. **Order**: Modify `process-instance.ts` first (primary type), then `template-definition.ts`
2. **Backward Compatible**: All new fields are optional
3. **Verification**: TypeScript compilation check

---

## Change Proposals

### MOD-001: Add InteractionOption interface to process-instance.ts

**File**: `.processes/types/process-instance.ts`  
**Type**: Modification

**Current State**: 
No `InteractionOption` type exists. ProcessStep only has `approvalRequired`/`approved`.

**Requested State**:
Add new `InteractionOption` interface after line 140 (after ProcessStep interface).

**Instructions**:
Insert the following after the `ProcessStep` interface (after line 140, before `ParentProcessRef`):

```typescript
/**
 * An option presented to the user for selection during step interaction.
 * Used when a step needs user input beyond simple approval.
 */
export interface InteractionOption {
  /** Unique identifier for this option (e.g., "approve", "reject", "option-a") */
  id: string;
  
  /** Display label for this option in the UI */
  label: string;
  
  /** Optional longer description shown as tooltip or help text */
  description?: string;
  
  /** Whether this option should be pre-selected/highlighted as default */
  isDefault?: boolean;
}
```

**Rationale**: Defines the structure for interaction options that can be rendered by UI apps.

---

### MOD-002: Add interactionOptions and selectedOptions to ProcessStep

**File**: `.processes/types/process-instance.ts`  
**Type**: Modification

**Current State** (lines 135-139):
```typescript
  /** Whether this step requires explicit user approval before proceeding */
  approvalRequired?: boolean;
  
  /** Whether user approval has been granted (only relevant if approvalRequired is true) */
  approved?: boolean;
}
```

**Requested State**:
Add two new fields after `approved`:

```typescript
  /** Whether this step requires explicit user approval before proceeding */
  approvalRequired?: boolean;
  
  /** Whether user approval has been granted (only relevant if approvalRequired is true) */
  approved?: boolean;
  
  /** Structured options for user selection when step needs input */
  interactionOptions?: InteractionOption[];
  
  /** IDs of options selected by the user (populated after selection) */
  selectedOptions?: string[];
}
```

**Rationale**: Allows steps to define available options and track user's selection.

---

### MOD-003: Add interactionOptions to template step definition

**File**: `.processes/types/template-definition.ts`  
**Type**: Modification

**Current State** (around line 70):
```typescript
    /** Whether user must approve before proceeding */
    approvalRequired?: boolean;
    /** Actions to take after approval */
    postApprovalActions?: string[];
```

**Requested State**:
Add `interactionOptions` field after `approvalRequired`:

```typescript
    /** Whether user must approve before proceeding */
    approvalRequired?: boolean;
    /** Structured options for user selection when step needs input */
    interactionOptions?: Array<{
      /** Unique identifier for this option */
      id: string;
      /** Display label for this option */
      label: string;
      /** Optional description/tooltip */
      description?: string;
      /** Whether this is the default option */
      isDefault?: boolean;
    }>;
    /** Actions to take after approval */
    postApprovalActions?: string[];
```

**Rationale**: Allows templates to pre-define interaction options for steps, so agents and UI apps know what options are available when creating process instances.

---

## Summary

| Change ID | File | Change |
|-----------|------|--------|
| MOD-001 | process-instance.ts | Add `InteractionOption` interface |
| MOD-002 | process-instance.ts | Add `interactionOptions?` and `selectedOptions?` to ProcessStep |
| MOD-003 | template-definition.ts | Add `interactionOptions?` to template step definition |

## Verification Approach

1. Run `tsc --noEmit` on the types folder to verify TypeScript compilation
2. Existing process.json files should parse without errors (all new fields optional)
3. Review type exports in `index.ts` (uses wildcard, so auto-exported)

---

## Approval Options

- **Approve all**: Apply MOD-001, MOD-002, MOD-003
- **Approve specific**: Specify which MOD-XXX to apply (e.g., "approve MOD-001, MOD-002")
- **Request modifications**: Describe what to change
- **Reject**: Provide reason
