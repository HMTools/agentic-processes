<!--
Step: Validate Step Structure
Purpose: Perform comprehensive validation of the created step file to ensure it meets all requirements including self-contained check, section completeness, diagram validation, guidance quality, examples quality, pitfalls documentation, naming compliance, and best practices compliance
-->

# Step: Validate Step Structure

## Description

Perform comprehensive validation of the created step file to ensure it meets all requirements. Verify the step is self-contained (no references to other steps), check that all required sections are present and properly formatted, validate the mermaid diagram syntax and that it matches the substeps, ensure guidance is detailed and actionable with specific file paths and code patterns, verify examples are included and relevant, check that common pitfalls are documented, and confirm compliance with naming conventions and best practices from steps/README.md.

## Output

- Comprehensive validation report with all checks:
  - Self-contained check (no references to other steps)
  - Section completeness check (all required sections present)
  - Diagram validation (syntax and alignment with substeps)
  - Guidance quality check (detailed and actionable)
  - Examples quality check (relevant and concrete)
  - Pitfalls documentation check (warnings included)
  - Naming compliance check (kebab-case filename, proper structure)
  - Best practices compliance check (follows README guidelines)
- List of any issues found with specific fixes needed
- Validation status (pass/fail with details)

## Guidance

**⚠️ MANDATORY: Log User Interactions Immediately**

Before making ANY file changes in response to user input:
- [ ] Log user interaction in `log.md` under current step's "User Interactions" section
- [ ] Include timestamp, user request, reason, and agent response
- [ ] **STOP** if user interaction not logged - log it first before proceeding

**Reference**: See `docs/process-management.md` for complete logging guidelines.

**Specific Actions:**
- Read the created step file: `core/processes/steps/{{stepCategory}}/{{stepName}}.md`
- Perform self-contained check:
  - Search for any `@step:` references (should not exist)
  - Verify step doesn't depend on other steps
  - Check that step is complete and standalone
- Perform section completeness check:
  - Verify header comment block exists with step name and purpose
  - Verify step title exists (`# Step: ...`)
  - Verify Description section exists and is detailed
  - Verify Output section exists and clearly defines deliverables
  - Verify Guidance section exists with mandatory logging section
  - Verify Memory File Usage section exists
  - Verify Flow section exists with mermaid diagram
  - Verify Substeps section exists with actionable tasks
  - Verify Examples section exists with 1-3 examples
  - Verify Common Pitfalls section exists with 2-3 pitfalls
- Perform diagram validation:
  - Check mermaid syntax is correct (use mermaid validator if available)
  - Verify diagram nodes match substeps listed
  - Check diagram flow is logical and sequential
  - Verify decision points and loops are properly represented
- Perform guidance quality check:
  - Verify mandatory logging section is present at top of Guidance
  - Check that Specific Actions subsection has detailed instructions
  - Verify Files/Folders subsection includes project-specific paths
  - Check Code Patterns subsection if applicable
  - Verify Tools subsection if applicable
  - Check Best Practices subsection is included
- Perform examples quality check:
  - Verify at least 1 example is included (preferably 2-3)
  - Check each example has Context, Actions, and Result subsections
  - Verify examples are concrete and relevant to the step
  - Check examples use realistic scenarios
- Perform pitfalls documentation check:
  - Verify at least 2 pitfalls are documented (preferably 3)
  - Check each pitfall has Problem and Solution subsections
  - Verify pitfalls are relevant and helpful
- Perform naming compliance check:
  - Verify filename uses kebab-case (lowercase with hyphens)
  - Check filename matches step name parameter
  - Verify step is in correct category directory
- Perform best practices compliance check:
  - Review against `core/processes/steps/README.md` guidelines
  - Verify step follows self-contained principle
  - Check appropriate granularity (not too broad, not too narrow)
  - Verify rich guidance is provided
  - Check flow diagram is clear and readable
- Generate validation report with all checks and results
- List any issues found with specific file locations and fixes needed
- If issues found, provide clear guidance on how to fix them

**Files/Folders:**
- Review: `core/processes/steps/{{stepCategory}}/{{stepName}}.md`
- Reference: `core/processes/steps/step-template.md` for structure reference
- Reference: `core/processes/steps/README.md` for best practices

**Best Practices:**
- Be thorough in validation - check every requirement
- Provide specific file locations for issues found
- Give clear guidance on how to fix issues
- Verify mermaid syntax is valid (test if possible)
- Check that examples are realistic and helpful
- Ensure pitfalls are actually common issues
- Validate against all guidelines in README.md

## Memory File Usage

**When to Use Memory:**
- Use when this step produces information needed by later steps
- Use when this step makes decisions that should be documented

**Memory Usage for This Step:**
- **Read from**: Step 2 section in memory.md - Step file creation information
- **Write to**: Step 3 section in memory.md
  - Information Produced: Comprehensive validation report with all checks, validation status
  - Decisions Made: Validation results, issues identified, fixes needed
  - Notes: Any validation issues found and their resolutions

## Decision

- **IF** all validation checks pass:
  - Proceed to Step 4 (Continuous Improvement)
- **ELSE** (validation fails - issues found):
  - Fix issues identified in validation report
  - Re-run validation until all checks pass
  - Only proceed to Step 4 when all validation checks pass

