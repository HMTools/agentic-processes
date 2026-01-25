# Step: Propose Fixes

## Description

Propose specific fixes for issues identified during review and verification. Analyze each issue, determine the best fix approach, and provide detailed proposals. Present to user for approval before proceeding.

## Purpose & Usage

Use this step when you need to:
- Create detailed fix proposals for identified issues
- Get user approval before applying fixes
- Document fix approaches and rationale

**Output**: Fix proposals document (`fix-proposals.md`), approval status, memory update.

## Quick Reference

| Proposal Element | Description |
|------------------|-------------|
| Issue ID | Reference to the identified issue |
| Location | File path, line number |
| Current state | What exists now |
| Proposed fix | What should change |
| Instructions | Step-by-step fix instructions |
| Rationale | Why this fix addresses the issue |

## Flow

```mermaid
flowchart TD
    A[Start: Propose Fixes Request] --> B[Read Issues from Previous Step]
    B --> C[Read Issues JSON File]
    C --> D[Get Next Issue to Process]
    D --> E[Read Source File for Context]
    E --> F[Analyze Issue and Determine Fix]
    F --> G[Create Detailed Fix Proposal]
    G --> H{More Issues?}
    H -->|Yes| D
    H -->|No| I[Create Fix Proposals Document]
    I --> J[Present Proposals to User]
    J --> K{User Response?}
    K -->|Approve| L[Store Approved IDs in Memory]
    K -->|Request Changes| M[Revise Proposals]
    M --> J
    K -->|Reject| N[Document Rejection]
    L --> O[Update Memory]
    N --> O
    O --> P[Complete: Proposals Ready]
```
