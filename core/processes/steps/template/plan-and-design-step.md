<!--
Step: Plan and Design Step
Purpose: Analyze requirements, define purpose, identify use cases, determine category, plan step structure, identify required sections, design mermaid diagram, and plan substeps
-->

# Step: Plan and Design Step

## Description

Analyze requirements for the new step, define its purpose, identify use cases, determine the appropriate category, plan the step structure, identify required sections (description, output, guidance, flow diagram, substeps, examples, common pitfalls), and design the mermaid flow diagram. This step establishes the complete foundation and design for the step file.

## Output

- Requirements document describing what the step should accomplish
- Purpose statement for the step
- Use cases documentation with clear "when to use" guidance
- Category selection with rationale (api, service, data, template, testing, documentation, etc.)
- Step structure plan with section breakdown
- List of required sections (description, output, guidance, memory file usage, flow diagram, substeps, examples, common pitfalls)
- Mermaid flow diagram code for the step's internal workflow
- Substeps outline with detailed action descriptions

## Guidance

**⚠️ MANDATORY: Log User Interactions Immediately**

Before making ANY file changes in response to user input:
- [ ] Log user interaction in `log.md` under current step's "User Interactions" section
- [ ] Include timestamp, user request, reason, and agent response
- [ ] **STOP** if user interaction not logged - log it first before proceeding

**Reference**: See `docs/process-management.md` for complete logging guidelines.

**Specific Actions:**
- Review the need or problem that requires a new step
- Identify the workflow or task the step will represent
- Check existing steps in `core/processes/steps/` for similar patterns
- Review `core/processes/steps/README.md` for category guidelines
- Determine the appropriate category folder (api, service, data, template, testing, documentation, external-services, planning, learning)
- Write a clear, concise purpose statement
- Define when this step should be used versus alternatives
- Plan the step structure following `core/processes/steps/step-template.md`
- Identify all required sections:
  - Header comment block (step name, purpose)
  - Step title
  - Description (detailed what needs to be done)
  - Output (clearly defined deliverables)
  - Guidance (detailed instructions with mandatory logging section)
  - Memory File Usage (when and how to use memory)
  - Flow diagram (mermaid flowchart for substeps)
  - Substeps (concrete, actionable tasks)
  - Examples (1-3 concrete scenarios)
  - Common Pitfalls (warnings about potential issues)
- Create a mermaid flowchart diagram using `flowchart TD` for top-down flow
- Include all major substeps as nodes with concise, action-oriented labels
- Plan substeps to be specific, actionable, and sequential
- Consider decision points and conditional branches if needed
- Plan for loops if the step requires iteration

**Files/Folders:**
- Review: `core/processes/steps/` for existing steps and patterns
- Review: `core/processes/steps/README.md` for guidelines and category information
- Reference: `core/processes/steps/step-template.md` for structure template

**Best Practices:**
- Be specific about what problem the step solves
- Identify unique aspects that require a new step
- Document why existing steps don't meet the need
- Choose the right category based on the step's purpose
- Keep substeps focused and actionable
- Match the diagram to the substep sequence exactly
- Keep node labels concise but descriptive
- Use Title Case for visual consistency in diagrams
- Plan for self-contained step (no references to other steps)
- Include rich, detailed guidance since steps are reused
- Plan for project-specific paths, tools, and conventions

## Memory File Usage

**When to Use Memory:**
- Use when this step produces information needed by later steps
- Use when this step makes decisions that should be documented

**Memory Usage for This Step:**
- **Write to**: Step 1 section in memory.md
  - Information Produced: Requirements, purpose statement, use cases, category selection, step structure plan, section breakdown plan, mermaid diagram code, substeps outline
  - Decisions Made: Whether a new step is needed, what it should cover, category choice, step granularity level, structure organization, substep sequence
  - Notes: Similar steps found, unique requirements identified, category rationale

