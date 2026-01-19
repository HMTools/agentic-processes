<!--
Step: Create Template File
Purpose: Create the template file with all sections including header comment, process header, parameters, context, process flow diagram, and step definitions
-->

# Step: Create Template File

## Required Components

- [mandatory-logging.md](_components/mandatory-logging.md) - Logging guidelines

## Description

Create the template file in `.processes/templates/` with the proper filename and write all sections including the header comment block, process header, parameters section, context section, process flow diagram, and all sequential step definitions. Each step must reference an actual process-step file using `@framework-step:category/step-name` syntax. Include the mandatory continuous improvement step as the final step. Then comprehensively validate the template by verifying all required sections are present, checking parameter placeholders are properly documented, ensuring the flow diagram matches the steps, and reviewing compliance with best practices.

## Output

- Template file created: `.processes/templates/{{templateName}}.md`
- Header comment block with all metadata
- Process header section with template name and status
- Parameters section with all placeholders documented
- Context section with shared data definitions
- Process flow diagram section with mermaid code
- Complete Steps section with all step definitions
- Continuous improvement step added as final step
- Validation reports (structure, parameters, diagram alignment, flow transition check, step description alignment check, best practices compliance)

## Guidance

<!-- @include: _components/mandatory-logging.md -->

**Specific Actions:**
- Create file: `.processes/templates/{{templateName}}.md` using kebab-case for filename
- Write the header comment block with template name, purpose, required/optional parameters, and when to use description
- Write process header: `# Process: {{processName}}` or descriptive title
- Add template name: `**Template**: {{templateName}}`
- Set initial status: `**Status**: Not Started`
- List all required parameters with placeholders: ``- `paramName`: {{paramName}}``
- List all optional parameters with placeholders
- Define context variables with static values and parameter placeholders
- Add the mermaid diagram code to the "## Process Flow" section
- Ensure it uses proper mermaid syntax and matches the planned step sequence
- Write each step with format: `- [ ] Step N: [Description]`
- Include **Description** field for each step
- Include **Output** field for each step (mandatory)
- Every step must reference a process-step file: `- **Step**: @step:category/step-name`
- Use parameter placeholders where appropriate
- Number steps sequentially without phase divisions
- Add the continuous improvement step in "### Final Phase: Learning & Improvement" section
- Use standard format: `@framework-step:learning/continuous-improvement`
- Validate the template by verifying all required sections are present
- Check that all parameter placeholders are properly documented in the Parameters section
- Verify the flow diagram matches the step sequence exactly
- **Validate steps are not flow transitions**: Check each step description for flow transition patterns:
  - Steps that are just "wait for X" (these should be decision points in the flow diagram, not separate steps)
  - Steps that are just "iterate if needed" or "loop back" (these are handled by flow diagram loops, not separate steps)
  - Steps that are just "transition to next step" (these are implicit in sequential flow)
  - Flag any steps that appear to be flow transitions rather than actual work
- **Validate step descriptions align with actual step files**: For each step reference (`@framework-step:category/step-name`), verify the template step description aligns with the actual step file:
  - Read the referenced step file from `.processes/steps/{category}/{step-name}.md`
  - Compare the template step description with the step file's Description section
  - Verify the template step Output matches the step file's Output section
  - Flag any significant misalignments (e.g., template says "investigation scope" but step file says "context, sources, and requirements")
  - Note: Minor wording differences are acceptable, but core purpose and outputs should align
- Review compliance with best practices from `.processes/templates/README.md`
- Fix any validation issues found before proceeding

**Files/Folders:**
- Create: `.processes/templates/{{templateName}}.md`
- Reference: `.processes/templates/README.md` for format guidelines

**Best Practices:**
- Use kebab-case for filename matching template name
- Include all required metadata in header comment
- Document all placeholders in Parameters section
- Mix static values and placeholders in Context section
- The diagram should be a visual representation of the steps listed below
- Each step must have Description and Output
- Steps are sequential (no dependencies field needed)
- Use clear, actionable descriptions
- Continuous improvement step is MANDATORY for all templates
- **Steps must represent actual work**: Each step should perform work, not just control flow. Decision points, loops, and transitions belong in the flow diagram, not as separate steps.
  - ❌ Bad: "Step 5: Wait for user approval" (decision point - handle in flow diagram)
  - ❌ Bad: "Step 10: Iterate if needed" (flow transition - handle with loop in flow diagram)
  - ✅ Good: "Step 4: Propose fixes and wait for approval" (includes work of proposing fixes)

## Memory File Usage

**When to Use Memory:**
- Use when this step produces information needed by later steps

**Memory Usage for This Step:**
- **Read from**: Step 1 section in memory.md - All planning and design information
- **Write to**: Step 2 section in memory.md
  - Information Produced: Template file created with all sections, validation reports
  - Files Modified/Created: `.processes/templates/{{templateName}}.md`
  - Notes: Any validation issues found and fixed

