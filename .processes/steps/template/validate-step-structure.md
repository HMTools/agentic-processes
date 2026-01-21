# Step: Validate Step Structure

## Description

Perform comprehensive validation of a step file to ensure it meets all requirements including section completeness, diagram validation, guidance quality, and best practices compliance.

## Purpose & Usage

Use this step when you need to:
- Validate a newly created step file
- Ensure step follows all required conventions
- Verify step is self-contained and complete

**Output**: Comprehensive validation report with pass/fail status.

## Quick Reference

| Check | Requirement |
|-------|-------------|
| Self-contained | No references to other steps |
| Section completeness | All required sections present |
| Diagram validation | Mermaid syntax correct |
| Guidance quality | Detailed and actionable |
| Naming compliance | Kebab-case filename |

| File | Required Sections |
|------|-------------------|
| MD | Description, Purpose & Usage, Quick Reference, Flow |
| JSON | metadata, output, guidance, substeps, dependencies |

## Flow

```mermaid
flowchart TD
    A[Start: Validate Step] --> B[Read Step Files]
    B --> C[Self-contained Check]
    C --> D[Section Completeness Check]
    D --> E[Diagram Validation]
    E --> F[Guidance Quality Check]
    F --> G[Naming Compliance Check]
    G --> H{All Checks Pass?}
    H -->|Yes| I[Validation Passed]
    H -->|No| J[List Issues with Fixes]
    I --> K[Complete: Validation Done]
    J --> K
```
