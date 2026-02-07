# Step 3: Analysis of Existing State

## Current ProcessStep Interface

```typescript
// .processes/types/process-instance.ts (lines 113-140)
export interface ProcessStep {
  id: StepId;
  number: number;
  name: string;
  status: StepStatus;
  stepRef: StepRef;
  startedAt?: ISOTimestamp;
  completedAt?: ISOTimestamp;
  approvalRequired?: boolean;  // <-- Existing user interaction point
  approved?: boolean;          // <-- Existing user response tracking
}
```

**Observation**: The `approvalRequired`/`approved` pattern is the current mechanism for user interaction, but it only supports binary yes/no responses.

## Current Template Step Definition

```typescript
// .processes/types/template-definition.ts (lines 56-95)
steps: Array<{
  number: number;
  name: string;
  stepRef: StepRef;
  // ... other fields ...
  approvalRequired?: boolean;  // <-- Templates can mark steps as needing approval
  postApprovalActions?: string[];
  // ...
}>
```

**Observation**: Templates define step behavior, including whether approval is needed. Adding `interactionOptions` here allows templates to pre-define choices.

## Analysis Summary

| Aspect | Current State | Gap |
|--------|--------------|-----|
| User approval | Binary (yes/no) via `approvalRequired`/`approved` | Cannot offer multiple choices |
| Step configuration | Templates define `approvalRequired` | Cannot define selectable options |
| Response tracking | `approved: boolean` | Cannot track which option was selected |
| UI support | Can render approve/reject buttons | Cannot render custom option buttons |

## Insertion Points

### process-instance.ts
- **Location**: After line 139 (`approved?: boolean;`)
- **New fields**: `interactionOptions?: InteractionOption[]`, `selectedOptions?: string[]`
- **New interface**: `InteractionOption` (add before `ProcessStep` or after `ProcessStep`)

### template-definition.ts  
- **Location**: After line 70 (`approvalRequired?: boolean;`)
- **New field**: `interactionOptions?: Array<{id: string; label: string; description?: string; isDefault?: boolean}>`

## Type Design Decisions

1. **Keep `InteractionOption` separate from `UserInteraction`** (log-file.ts)
   - `InteractionOption` = what options are available (defined before interaction)
   - `UserInteraction` = what happened (logged after interaction)

2. **Use string IDs, not enums**
   - More flexible for dynamic options
   - Consistent with existing `StepId`, `ProcessId` patterns

3. **`selectedOptions` is an array**
   - Supports single-select (array with one element)
   - Supports multi-select scenarios if needed
