# Step: Review, Verify, and Document

## Description

Systematically review each identified file for content relevant to the investigation scope. Verify against criteria, identify issues, categorize them, and create comprehensive findings documentation.

## Purpose & Usage

Use this step when you need to:
- Review files against specific verification criteria
- Identify violations, issues, or items that don't meet criteria
- Create comprehensive findings documentation
- Prepare findings for proposing fixes or presenting results

**Output**: Findings report (`findings-report.md`), issues list (`issues-list.json` if issues found), memory update.

## Quick Reference

| Action | Tool |
|--------|------|
| Read context/files | `read_file` |
| Search for patterns | `grep` |
| Find related content | `codebase_search` |
| Create reports | `write` |

| Issue Category | Severity Levels |
|----------------|-----------------|
| Missing, Incorrect, Violation | Critical, High |
| Incomplete, Format Error, Other | Medium, Low |

## Flow

```mermaid
flowchart TD
    A[Start: Review Request] --> B[Read Context: Files & Criteria]
    B --> C[Initialize Tracking Structures]
    C --> D[Get Next File to Review]
    D --> E[Read File Content]
    E --> F[Extract Relevant Content]
    F --> G[Verify Against Criteria]
    G --> H{Issue Found?}
    H -->|Yes| I[Document & Categorize Issue]
    I --> J{More Files?}
    H -->|No| J
    J -->|Yes| D
    J -->|No| K[Categorize All Issues]
    K --> L[Create Findings Documentation]
    L --> M{Issues Found?}
    M -->|Yes| N[Create Issues JSON]
    M -->|No| O[Document All Passed]
    N --> P[Update Memory]
    O --> P
    P --> Q[Complete: Review Done]
```
