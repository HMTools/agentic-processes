<!--
Step: Create Step File
Purpose: Create the step file with all sections including header comment, step title, description, output, guidance, memory file usage, flow diagram, substeps, examples, and common pitfalls
-->

# Step: Create Step File

## Description

Create the step file in `core/processes/steps/{{stepCategory}}/` with the proper filename and write all sections including the header comment block, step title, description, output, guidance (with mandatory logging section), memory file usage, flow diagram with mermaid code, substeps breakdown, examples section, and common pitfalls section. The step must be self-contained and follow the step-template.md structure. Then comprehensively validate the step by verifying all required sections are present, checking the flow diagram matches the substeps, ensuring guidance is detailed and actionable, and reviewing compliance with best practices from steps/README.md.

## Output

- Step file created: `core/processes/steps/{{stepCategory}}/{{stepName}}.md`
- Header comment block with step name and purpose
- Step title section
- Description section with detailed objective and scope
- Output section with clearly defined deliverables
- Guidance section with detailed instructions including mandatory logging section
- Memory File Usage section with when and how to use memory
- Flow diagram section with mermaid code
- Substeps section with concrete, actionable tasks
- Examples section with 1-3 concrete scenarios
- Common Pitfalls section with warnings about potential issues
- Validation reports (structure, diagram alignment, guidance completeness, best practices compliance)

## Guidance

**⚠️ MANDATORY: Log User Interactions Immediately**

Before making ANY file changes in response to user input:
- [ ] Log user interaction in `log.md` under current step's "User Interactions" section
- [ ] Include timestamp, user request, reason, and agent response
- [ ] **STOP** if user interaction not logged - log it first before proceeding

**Reference**: See `docs/process-management.md` for complete logging guidelines.

**Specific Actions:**
- Create file: `core/processes/steps/{{stepCategory}}/{{stepName}}.md` using kebab-case for filename
- Create category directory if it doesn't exist: `core/processes/steps/{{stepCategory}}/`
- Write the header comment block with step name and purpose
- Write step title: `# Step: {{Step Name}}` (use Title Case)
- Write Description section with detailed description of what needs to be done, be specific about objective and scope
- Write Output section clearly defining what this step produces (files created, documentation written, decisions made, configurations updated, code implemented)
- Write Guidance section with:
  - Mandatory logging section at the top (copy from step-template.md)
  - Specific Actions subsection with detailed instructions
  - Files/Folders subsection with paths
  - Code Patterns subsection if applicable
  - Tools subsection if applicable
  - Best Practices subsection
- Write Memory File Usage section with:
  - When to Use Memory subsection
  - Memory Usage for This Step subsection with read/write guidance
- Write Flow section with mermaid flowchart diagram code
- Write Substeps section with:
  - Mermaid diagram code block
  - Substeps list with concrete, actionable tasks
  - Notes about conditional substeps if applicable
- Write Examples section with 1-3 concrete examples:
  - Each example should have Context, Actions, and Result subsections
- Write Common Pitfalls section with 2-3 pitfalls:
  - Each pitfall should have Problem and Solution subsections
- Validate the step by verifying all required sections are present
- Check that the flow diagram matches the substep sequence exactly
- Ensure guidance is detailed and actionable with specific file paths
- Review compliance with best practices from `core/processes/steps/README.md`
- Verify the step is self-contained (no references to other steps)
- Fix any validation issues found before proceeding

**Files/Folders:**
- Create: `core/processes/steps/{{stepCategory}}/{{stepName}}.md`
- Create directory if needed: `core/processes/steps/{{stepCategory}}/`
- Reference: `core/processes/steps/step-template.md` for structure template
- Reference: `core/processes/steps/README.md` for format guidelines

**Best Practices:**
- Use kebab-case for filename matching step name
- Include all required metadata in header comment
- Make description specific and actionable
- Define clear, measurable outputs
- Include mandatory logging section in guidance
- Provide project-specific paths and conventions
- Use concrete examples from real scenarios
- Document common pitfalls you've encountered
- Ensure step is self-contained (cannot reference other steps)
- Make substeps actionable and specific
- Match diagram to substeps exactly
- Use proper mermaid syntax for flow diagrams

## Memory File Usage

**When to Use Memory:**
- Use when this step produces information needed by later steps

**Memory Usage for This Step:**
- **Read from**: Step 1 section in memory.md - All planning and design information
- **Write to**: Step 2 section in memory.md
  - Information Produced: Step file created with all sections, validation reports
  - Files Modified/Created: `core/processes/steps/{{stepCategory}}/{{stepName}}.md`
  - Notes: Any validation issues found and fixed

