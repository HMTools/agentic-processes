<!--
Step: Create Step File
Purpose: Create the step file with all sections including header comment, step title, description, output, guidance, memory file usage, flow diagram, and substeps
-->

# Step: Create Step File

## Required Components

- [mandatory-logging.md](_components/mandatory-logging.md) - Logging guidelines

## Description

Create the step file in `.processes/steps/{{stepCategory}}/` with the proper filename and write all sections including the header comment block, step title, description, output, guidance (with mandatory logging section), memory file usage, flow diagram with mermaid code, and substeps breakdown. The step must be self-contained and follow the step-template.md structure. Then comprehensively validate the step by verifying all required sections are present, checking the flow diagram matches the substeps, ensuring guidance is detailed and actionable, and reviewing compliance with best practices from steps/README.md.

## Output

- Step file created: `.processes/steps/{{stepCategory}}/{{stepName}}.md`
- Header comment block with step name and purpose
- Step title section
- Description section with detailed objective and scope
- Output section with clearly defined deliverables
- Guidance section with detailed instructions including mandatory logging section
- Memory File Usage section with when and how to use memory (emphasizing external file storage for data)
- Flow diagram section with mermaid code
- Substeps section with concrete, actionable tasks
- External JSON files for data storage (if step produces data)
- Validation reports (structure, diagram alignment, guidance completeness, best practices compliance)

## Guidance

<!-- @include: _components/mandatory-logging.md -->

**Specific Actions:**
- Create file: `.processes/steps/{{stepCategory}}/{{stepName}}.md` using kebab-case for filename
- Create category directory if it doesn't exist: `.processes/steps/{{stepCategory}}/`
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
  - **Important**: If the step produces data (file lists, results, tracking data, etc.), store the actual data in external JSON files, not in memory.md. Memory.md should only contain references to these files (file count, path to JSON file, brief summary). This keeps memory.md clean and readable.
- Write Flow section with mermaid flowchart diagram code
- Write Substeps section with:
  - Mermaid diagram code block
  - Substeps list with concrete, actionable tasks
  - Notes about conditional substeps if applicable
  - **Important**: If Q&A format is needed (e.g., for requesting missing information), integrate it directly into the relevant substep. Do NOT create separate Q&A template files - the Q&A format should be part of the step's substeps.
- Validate the step by verifying all required sections are present
- Check that the flow diagram matches the substep sequence exactly
- Ensure guidance is detailed and actionable with specific file paths
- Review compliance with best practices from `.processes/steps/README.md`
- Verify the step is self-contained (no references to other steps)
- Fix any validation issues found before proceeding

**Files/Folders:**
- Create: `.processes/steps/{{stepCategory}}/{{stepName}}.md`
- Create directory if needed: `.processes/steps/{{stepCategory}}/`
- Reference: `.processes/steps/step-template.md` for structure template
- Reference: `.processes/steps/README.md` for format guidelines

**Best Practices:**
- Use kebab-case for filename matching step name
- Include all required metadata in header comment
- Make description specific and actionable
- Define clear, measurable outputs
- Include mandatory logging section in guidance
- Provide project-specific paths and conventions
- Ensure step is self-contained (cannot reference other steps)
- Make substeps actionable and specific
- Match diagram to substeps exactly
- Use proper mermaid syntax for flow diagrams
- **Q&A Integration**: If a step needs to request information from the user (Q&A format), integrate the Q&A structure directly into the relevant substep. Do NOT create separate Q&A template files - keep everything in the step file itself.

## Memory File Usage

**When to Use Memory:**
- Use when this step produces information needed by later steps

**Memory Usage for This Step:**
- **Read from**: Step 1 section in memory.md - All planning and design information
- **Write to**: Step 2 section in memory.md
  - Information Produced: Step file created with all sections, validation reports
  - Files Modified/Created: `.processes/steps/{{stepCategory}}/{{stepName}}.md`
  - Notes: Any validation issues found and fixed

