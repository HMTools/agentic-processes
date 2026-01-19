<!--
Step: Validate Process-Steps Exist
Purpose: Analyze a template to identify which process-steps are referenced and verify they exist in .processes/steps/
-->

# Step: Validate Process-Steps Exist

## Required Components

- [mandatory-logging.md](_components/mandatory-logging.md) - Logging guidelines

## Description

Analyze the template to identify which process-steps are referenced and verify they exist in `.processes/steps/`. Extract all `@step:category/step-name` references from the template and check if each step file exists.

## Output

- Validation report of existing vs. missing process-steps
- List of all referenced process-steps with their existence status
- List of missing process-steps with suggested category locations

## Guidance

<!-- @include: _components/mandatory-logging.md -->

**Specific Actions:**
- Review each step definition in the template
- Extract all process-step references (e.g., `@step:template/plan-template-design`, `@step:learning/continuous-improvement`, etc.)
- Check if each required process-step exists in `.processes/steps/{category}/{step-name}.md`
- If any are missing, list them with their category locations
- Verify the continuous improvement step exists: `@step:learning/continuous-improvement`
- Store validation results in current step section of memory.md

**Files/Folders:**
- Review: `.processes/templates/{{templateName}}.md` (the template being validated)
- Check: `.processes/steps/{category}/{step-name}.md` for each referenced step

**Best Practices:**
- Extract all `@step:` references systematically
- Check file existence for each referenced step
- Provide clear paths for missing steps
- Include category suggestions for missing steps

## Memory File Usage

**When to Use Memory:**
- Use when this step produces information needed by later steps
- Use when this step makes decisions that should be documented

**Memory Usage for This Step:**
- **Read from**: Step 2 section in memory.md - Template file with step references
- **Write to**: Step 3 section in memory.md
  - Information Produced: Validation report of existing vs. missing process-steps
  - Notes: List of missing steps with locations, validation status

## Checkpoint Behavior

**If missing process-steps are found:**
- **PAUSE the process**
- Notify user of missing process-steps and where to create them
- List each missing step with format: `@step:{category}/{step-name}` → should be in `.processes/steps/{category}/{step-name}.md`
- User must create missing process-steps manually in `.processes/steps/{category}/`
- Reference: `.processes/steps/README.md` and `.processes/steps/step-template.md` for step creation guidelines
- User resumes process once all process-steps exist

**Note**: Only proceed to next step if all required process-steps exist.

