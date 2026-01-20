<!--
Step: Validate Step Structure
Purpose: Perform comprehensive validation of a step file to ensure it meets all requirements
-->

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

---

## Agent Layer

### Required Components

- [mandatory-logging.md](../_components/mandatory-logging.md) - Logging guidelines

### Output (Detailed)

- Comprehensive validation report with all checks
- List of issues found with specific fixes
- Validation status (pass/fail)

### Guidance

<!-- @include: _components/mandatory-logging.md -->

**Specific Actions:**
- Read the step file
- **Self-contained check**:
  - No `@framework-step:` references
  - Step is complete and standalone
- **Section completeness check**:
  - Header comment block
  - Step title
  - Description section
  - Purpose & Usage section (User Layer)
  - Agent Layer with guidance
  - Flow section with mermaid
  - Substeps section
- **Diagram validation**:
  - Correct mermaid syntax
  - Diagram matches substeps
- **Guidance quality**:
  - Specific and actionable
  - Includes file paths and patterns
- **Naming compliance**:
  - Kebab-case filename
  - Proper step title format

### Flow

```mermaid
flowchart TD
    A[Start: Validate Step] --> B[Read Step File]
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

### Substeps

- [ ] **Substep 1**: Read step file
- [ ] **Substep 2**: Perform self-contained check
- [ ] **Substep 3**: Perform section completeness check
- [ ] **Substep 4**: Validate mermaid diagram
- [ ] **Substep 5**: Check guidance quality
- [ ] **Substep 6**: Check naming compliance
- [ ] **Substep 7**: Create validation report

### Memory File Usage

**Write to**: Current step section in memory.md
- Information Produced: Validation results, issues found
- Decisions Made: Pass/fail status, required fixes
