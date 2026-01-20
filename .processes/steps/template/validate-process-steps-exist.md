<!--
Step: Validate Process-Steps Exist
Purpose: Analyze a template to identify which process-steps are referenced and verify they exist
-->

# Step: Validate Process-Steps Exist

## Description

Analyze a template to identify which process-steps are referenced and verify they exist in `.processes/steps/`.

## Purpose & Usage

Use this step when you need to:
- Validate a template's step references
- Ensure all referenced steps exist
- Identify missing steps that need to be created

**Output**: Validation report of existing vs. missing process-steps.

## Quick Reference

| Reference Format | Location |
|------------------|----------|
| `@framework-step:category/step-name` | `.processes/steps/category/step-name.md` |

---

## Agent Layer

### Required Components

- [mandatory-logging.md](../_components/mandatory-logging.md) - Logging guidelines

### Output (Detailed)

- Validation report with existence status
- List of all referenced process-steps
- List of missing process-steps with suggested locations

### Guidance

<!-- @include: _components/mandatory-logging.md -->

**Specific Actions:**
- Review each step definition in the template
- Extract all `@framework-step:category/step-name` references
- Check if each step exists in `.processes/steps/{category}/{step-name}.md`
- List missing steps with category locations
- Verify continuous improvement step exists
- Store validation results in memory

**Files/Folders:**
- Review: Template being validated
- Check: `.processes/steps/{category}/{step-name}.md`

### Flow

```mermaid
flowchart TD
    A[Start: Validate Steps] --> B[Read Template File]
    B --> C[Extract Step References]
    C --> D[For Each Reference]
    D --> E{Step File Exists?}
    E -->|Yes| F[Mark as Valid]
    E -->|No| G[Mark as Missing]
    F --> H{More References?}
    G --> H
    H -->|Yes| D
    H -->|No| I[Create Validation Report]
    I --> J[Complete: Validation Done]
```

### Substeps

- [ ] **Substep 1**: Read template file
- [ ] **Substep 2**: Extract all `@framework-step:` references
- [ ] **Substep 3**: Check existence of each referenced step
- [ ] **Substep 4**: Create validation report
- [ ] **Substep 5**: List missing steps with suggested locations

### Memory File Usage

**Write to**: Current step section in memory.md
- Information Produced: Validation results, missing steps list
- Decisions Made: Which steps need to be created
