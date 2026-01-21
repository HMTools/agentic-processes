# Step: Final Summary

## Description

Provide a final comprehensive summary of an investigation that consolidates information from all previous steps. Present a clear, actionable conclusion of the investigation to the user.

## Purpose & Usage

Use this step when you need to:
- Consolidate investigation results into a single summary
- Present clear findings, fixes applied, and recommendations
- Conclude an investigation process

**Output**: Final summary document (`final-summary.md`), memory update with conclusion.

## Quick Reference

| Scenario | Summary Content |
|----------|-----------------|
| No issues found | Success message, verification passed |
| Issues found, not fixed | Issues summary, recommendations |
| Issues found and fixed | Fixes applied, verification status |

## Flow

```mermaid
flowchart TD
    A[Start: Final Summary Request] --> B[Read All Previous Steps from Memory]
    B --> C[Read Any Report Files]
    C --> D[Compile Investigation Data]
    D --> E{Issues Found?}
    E -->|No| F[Compile: No Issues Summary]
    E -->|Yes| G{Fixes Applied?}
    G -->|No| H[Compile: Issues Not Fixed Summary]
    G -->|Yes| I{All Resolved?}
    I -->|Yes| J[Compile: All Fixed Summary]
    I -->|No| K[Compile: Partial Fix Summary]
    F --> L[Create Final Summary Document]
    H --> L
    J --> L
    K --> L
    L --> M[Present Summary to User]
    M --> N[Update Memory]
    N --> O[Complete: Investigation Concluded]
```
