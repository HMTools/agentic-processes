<!--
Step: Plan and Design Template
Purpose: Analyze requirements, define purpose, identify use cases, plan step breakdown, identify parameters, design process flow structure, create mermaid diagram, and plan step organization
-->

# Step: Plan and Design Template

## Required Components

- [mandatory-logging.md](_components/mandatory-logging.md) - Logging guidelines

## Description

Analyze requirements for the new template, define its purpose, identify use cases, plan the step breakdown, identify all required and optional parameters, design the process flow structure, create the mermaid flow diagram, and plan the step organization. This step establishes the complete foundation and design for the template.

## Output

- Requirements document describing what the template should accomplish
- Purpose statement for the template
- Use cases documentation with clear "when to use" guidance
- Step breakdown plan with estimated step count
- List of required parameters with descriptions
- List of optional parameters with descriptions and defaults
- Process flow structure outline
- Mermaid flow diagram code
- Step organization plan with step numbers, descriptions, and outputs

## Guidance

<!-- @include: _components/mandatory-logging.md -->

**Specific Actions:**
- Review the need or problem that requires a new template
- Identify the workflow or process the template will represent
- Check existing templates in `.processes/templates/` for similar patterns
- Write a clear, concise purpose statement
- Define when this template should be used versus alternatives
- Determine how detailed the step breakdown should be
- **Before planning steps**: Check existing generic steps in `.processes/steps/planning/` and `.processes/steps/common/` to see if any can be reused
- **When planning steps**: Prefer generic, reusable step categories over template-specific categories
- **When planning steps**: Ensure each step represents actual work, not just flow control (decision points and loops belong in the flow diagram, not as steps)
- **When planning steps**: Consider if existing steps can be reused (steps can be referenced multiple times in a template)
- Identify all values that must be provided by the user (required parameters)
- Use descriptive, camelCase names for parameters (e.g., `featureName`, `targetBranch`)
- Identify values that are helpful but not mandatory (optional parameters)
- Break down the workflow into logical stages
- Create a mermaid flowchart diagram using `flowchart TD` for top-down flow
- Include all major steps as nodes with concise, action-oriented labels (Title Case)
- List all steps sequentially (Step 1, Step 2, etc.)
- Ensure each step is specific, actionable, and produces a clear output
- Plan for the mandatory continuous improvement step at the end

**Files/Folders:**
- Review: `.processes/templates/` for existing templates
- Reference: `.processes/templates/README.md` for guidelines

**Best Practices:**
- Be specific about what problem the template solves
- Identify unique aspects that require a new template
- Document why existing templates don't meet the need
- Use descriptive parameter names: `featureName` not `name`
- Keep required parameters minimal - only what's essential
- Match the diagram to the step sequence exactly
- Keep node labels concise but descriptive
- Use Title Case for visual consistency
- Steps flow sequentially without explicit phase divisions

**Step Design Best Practices:**
- **Prefer generic, reusable steps**: When planning steps, prefer generic step categories (planning, common) over template-specific categories. Steps should be reusable across different template types when possible.
  - Example: Use `@framework-step:planning/understand-context` instead of `@framework-step:investigation/understand-scope`
  - Example: Use `@framework-step:common/apply-changes` instead of `@framework-step:investigation/apply-fixes`
  - Check existing generic steps in `.processes/steps/planning/` and `.processes/steps/common/` before creating new template-specific steps
- **Avoid flow transitions as steps**: Steps should represent actual work, not just flow control. Decision points and loops are handled in the flow diagram, not as separate steps.
  - ❌ Bad: "Step 5: Wait for user approval" (this is a decision point, not a step)
  - ❌ Bad: "Step 10: Iterate if needed" (this is a flow transition, not a step)
  - ✅ Good: "Step 4: Propose fixes and wait for approval" (includes the work of proposing fixes)
- **Reuse existing steps**: Before planning a new step, check if an existing step can be reused. Steps can be referenced multiple times in a template (e.g., a verification step used both initially and after fixes are applied).
  - Check `.processes/steps/` for existing steps that match your needs
  - Consider if a step can be reused with different context parameters
- **Make steps generic in description**: When describing steps, use generic language that applies across template types, not template-specific language.
  - ❌ Bad: "Understand the investigation scope" (too specific to investigations)
  - ✅ Good: "Fully understand the context, sources, and requirements" (generic, reusable)

## Memory File Usage

**When to Use Memory:**
- Use when this step produces information needed by later steps
- Use when this step makes decisions that should be documented

**Memory Usage for This Step:**
- **Write to**: Step 1 section in memory.md
  - Information Produced: Requirements, purpose statement, use cases, step breakdown plan, parameter lists, process flow structure, mermaid diagram code, step organization plan
  - Decisions Made: Whether a new template is needed, what it should cover, step granularity level, parameter choices, flow organization, step sequence
  - Notes: Similar templates found, unique requirements identified

