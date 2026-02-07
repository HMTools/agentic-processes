# Step 1 Context: Universal PendingInteraction Concept

## Concept Overview

**Concept Name**: Universal PendingInteraction

**Core Idea**: The `pendingInteraction` field in `process.json` must be used for **ALL** user interactions during process execution — not only for approval checkpoints. This includes Q&A sessions, parameter collection, decision points, corrections, and any other point where the agent needs user input.

**Why**: The UI renders interaction options from `pendingInteraction`. If the agent only sets it for approval checkpoints, the UI cannot present structured options for other types of interactions (questions, parameter requests, corrections). By making `pendingInteraction` universal, every agent-to-user interaction point gets UI-renderable options.

---

## Current State Analysis

### File-by-File Findings

#### 1. `.processes/types/process-instance.ts`

| Aspect | Current State |
|--------|--------------|
| **Field definition** | `pendingInteraction?: PendingInteraction` on `ProcessInstance` (line 67) — correctly optional, process-level |
| **JSDoc on field** | "Set by agent when input is needed, cleared when user responds" — this is already generic enough |
| **JSDoc on `InteractionOption`** | "Used when a process needs user input **(approval, choices, decisions)**" — limits to 3 categories |
| **Example in JSDoc** | Only shows approve/reject/revise options — purely approval-focused example |
| **`PendingInteraction` interface** | Only has `options: InteractionOption[]` — structurally generic but semantically limited by JSDoc |

**Gap**: The TypeScript types are structurally sufficient (the interface supports any options), but the documentation/JSDoc limits the mental model to approval scenarios only. No mention of Q&A, parameter collection, or general interaction.

#### 2. `.processes/steps/_components/operating-principles.md`

| Aspect | Current State |
|--------|--------------|
| **Principle 8 title** | "GENERATE INTERACTION OPTIONS" |
| **Rule text** | "When you need user input **(approval, choices, decisions)**, dynamically generate relevant options..." |
| **Scope limitation** | Parenthetical "(approval, choices, decisions)" excludes Q&A, parameter collection, corrections |

**Gap**: The parenthetical list acts as a restrictive scope. Agents interpret this as "only set pendingInteraction for these 3 categories." Missing: Q&A sessions, parameter collection, corrections, clarification requests, error recovery, any general interaction.

#### 3. `.processes/prompts/process-continue.md`

| Aspect | Current State |
|--------|--------------|
| **Principle 8 (line 50)** | Same restricted wording: "(approval, choices, decisions)" |
| **Approval checkpoint handling** | Detailed section on handling corrections at approval checkpoints (lines 155-168) — but no instruction to set `pendingInteraction` during correction flow |
| **Q&A / parameter collection** | Not mentioned in relation to `pendingInteraction` |
| **Step delegation** | Instructions say "Handle approval checkpoints" but don't say "set pendingInteraction for any interaction" |

**Gap**: The correction handling flow is described (log → delegate to subagent → re-present) but never instructs the agent to set `pendingInteraction` with correction-related options. Q&A and parameter collection flows don't reference `pendingInteraction` at all.

#### 4. `.processes/prompts/process-new.md` — **EXCLUDED from scope**

This file does NOT have an inline copy of the 8 principles. It inherits Principle 8 via Step 0 (Init Process Principles), which loads from `operating-principles.md`. Updating the source of truth there is sufficient — no changes needed here.

#### 5. `.processes/steps/_components/mandatory-approval-checkpoint.md` — **EXCLUDED from scope**

Per user direction, `pendingInteraction` usage guidance should live at the **principles level only** (operating-principles.md, prompt files, type definitions), not in specific component files. This file remains approval-specific and is excluded from target changes.

---

## Core Problem

The current wording "(approval, choices, decisions)" acts as a restrictive enumeration. Agents interpret this as a closed list and only set `pendingInteraction` for those 3 categories. The fix is to remove any enumeration and replace with universal language — **all** interactions with the user, no exceptions.

---

## Target State

All guidance files should consistently instruct agents:

> **Whenever the agent needs any form of user input, it MUST set `pendingInteraction` in `process.json` with appropriate options so the UI can render them.**

**Key design decision**: Do NOT enumerate specific interaction types (approval, Q&A, parameter collection, etc.). Simply state it applies to **all** interactions with the user. An exhaustive list becomes stale and implicitly excludes unlisted types.

This means:
1. **Type definitions**: JSDoc/comments in `process-instance.ts` should say "all interactions" — remove the restrictive "(approval, choices, decisions)" parenthetical
2. **Operating principles**: Principle 8 in `operating-principles.md` — remove "(approval, choices, decisions)" and replace with universal language
3. **Inline principle copy**: `process-continue.md` has an inline copy of Principle 8 that must match

**Note**: Guidance lives at the principles level only. Specific component files (e.g. `mandatory-approval-checkpoint.md`) and files that inherit principles via Step 0 (e.g. `process-new.md`) do NOT need changes.

---

## Requirements

1. **No structural changes** to `PendingInteraction` or `InteractionOption` types — they are already generic enough
2. **Documentation/guidance changes only** — update JSDoc, principle text, prompt instructions, and component guidance
3. **Consistency** — all 5 target files must tell the same story about `pendingInteraction` scope
4. **Backward compatibility** — existing approval flows must continue working unchanged
5. **No new types needed** — the existing `InteractionOption` with `id`, `label`, `description`, `isDefault` handles all interaction types

## Success Criteria

- [ ] All 3 target files say `pendingInteraction` is for **all** user interactions (no restrictive enumeration)
- [ ] The parenthetical "(approval, choices, decisions)" is removed everywhere
- [ ] No file enumerates a closed list of interaction types
- [ ] process-continue.md inline Principle 8 matches operating-principles.md
- [ ] Guidance lives at principles level only — no changes to component files or files inheriting via Step 0

## Constraints

- **Read-only analysis in this step** — no changes to target files yet
- Changes must be documentation/guidance only — no structural type changes needed
- Must preserve existing approval flows — this is additive, not a replacement
- Related prior process (`process-set-dynamic-interaction-options-20260206`) already moved `pendingInteraction` to process-level and made it dynamic; this process extends the scope of when it's used

## Questions / Gaps

None — the concept is clear and the analysis is complete. All information needed for implementation planning is available.
