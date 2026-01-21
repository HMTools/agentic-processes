# Step: Apply Changes

## Description

Apply all user-approved changes to relevant files based on approved change proposals. This step executes approved proposals without making decisions about what changes to make - it simply applies what was approved.

## Purpose & Usage

Use this step when you need to:
- Apply previously approved change proposals to files
- Execute a set of file modifications systematically
- Document all changes made in a change application report

**Output**: Modified files, change application report (`changes-applied.md`), memory update with results.

## Quick Reference

| Action | Tool |
|--------|------|
| Read approved proposals | `read_file` on memory.json |
| Read target files | `read_file` |
| Modify existing content | `search_replace` |
| Create/replace files | `write` |
| Verify changes | `read_file` |

## Flow

```mermaid
flowchart TD
    A[Start: Apply Changes Request] --> B[Verify Batch Coverage]
    B --> C{All Categories Covered?}
    C -->|No| D[STOP: Report Gap to User]
    C -->|Yes| E[Read Approved Change Proposals from Memory]
    E --> F[Read Change Proposals Document]
    F --> G[Get Next Approved Change]
    G --> H[Read Target File]
    H --> I[Apply Change to File]
    I --> J[Verify Change Applied Correctly]
    J --> K{More Approved Changes?}
    K -->|Yes| G
    K -->|No| L[Create Change Application Report]
    L --> M[Update Memory with Results]
    M --> N[Complete: Changes Applied]
```
