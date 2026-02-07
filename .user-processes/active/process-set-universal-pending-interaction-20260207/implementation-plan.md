# Implementation Plan: Universal PendingInteraction

## Requested State

`pendingInteraction` is described as applying to **all** interactions with the user — no restrictive enumeration, no closed list of interaction types.

## Change Proposals

### MOD-001: `process-instance.ts` — JSDoc on InteractionOption

**File**: `.processes/types/process-instance.ts`
**Type**: modification

**Current** (line 147):
```
 * Used when a process needs user input (approval, choices, decisions).
```

**Proposed**:
```
 * Used whenever a process needs any form of user input.
```

**Rationale**: Remove restrictive parenthetical that limits mental model to 3 categories.

---

### MOD-002: `operating-principles.md` — Principle 8 (source of truth)

**File**: `.processes/steps/_components/operating-principles.md`
**Type**: modification

**Current** (line 58):
```
**Rule**: When you need user input (approval, choices, decisions), dynamically generate relevant options and set them in `process.json` `pendingInteraction` field. Never use predefined options from templates.
```

**Proposed**:
```
**Rule**: Whenever you need any form of user input, dynamically generate relevant options and set them in `process.json` `pendingInteraction` field. Never use predefined options from templates.
```

**Rationale**: Source of truth for Principle 8. Remove restrictive enumeration, use universal "any form of user input."

---

### MOD-003: `process-continue.md` — Inline Principle 8 copy

**File**: `.processes/prompts/process-continue.md`
**Type**: modification

**Current** (line 50):
```
8. **GENERATE INTERACTION OPTIONS** - When you need user input (approval, choices, decisions), dynamically generate options and set `pendingInteraction` in process.json
```

**Proposed**:
```
8. **GENERATE INTERACTION OPTIONS** - Whenever you need any form of user input, dynamically generate options and set `pendingInteraction` in process.json
```

**Rationale**: Must match updated operating-principles.md. Same pattern — remove enumeration, use universal language.

---

## Implementation Order

1. MOD-002 first (source of truth)
2. MOD-003 (inline copy matches source)
3. MOD-001 (type definitions align)

No dependencies between changes — order is for logical consistency only.

## Verification Approach

After applying all 3 changes, grep the codebase for any remaining `(approval, choices, decisions)` to confirm nothing was missed.
