<!--
Step: Plan and Design Step
Purpose: Analyze requirements, define purpose, identify use cases, determine category, plan step structure, identify required sections, design mermaid diagram, and plan substeps
-->

# Step: Plan and Design Step

## Required Components

- [mandatory-logging.md](_components/mandatory-logging.md) - Logging guidelines

## Description

Analyze requirements for the new step, define its purpose, identify use cases, determine the appropriate category, plan the step structure, identify required sections (description, output, guidance, flow diagram, substeps) and optional sections (examples, common pitfalls), and design the mermaid flow diagram. This step establishes the complete foundation and design for the step file, emphasizing simplicity and understanding of agent capabilities.

## Output

- Requirements document describing what the step should accomplish
- Purpose statement for the step
- Use cases documentation with clear "when to use" guidance
- Category selection with rationale (api, service, data, template, testing, documentation, etc.)
- Step structure plan with section breakdown
- List of required sections (description, output, guidance, memory file usage, flow diagram, substeps) and optional sections (examples, common pitfalls)
- Mermaid flow diagram code for the step's internal workflow
- Substeps outline with detailed action descriptions

## Guidance

<!-- @include: _components/mandatory-logging.md -->

**Specific Actions:**
- Review the need or problem that requires a new step
- Identify the workflow or task the step will represent
- Check existing steps in `core/processes/steps/` for similar patterns
- Review `core/processes/steps/README.md` for category guidelines
- Determine the appropriate category folder (api, service, data, template, testing, documentation, external-services, planning, learning)
- **Understand agent capabilities**: Agents make individual tool calls sequentially, not batch operations. Tools like `glob_file_search`, `list_dir`, and `grep` only return files that exist, so separate validation is unnecessary. Agents search naturally using available parameters - avoid explicit method descriptions or artificial separations.
- **Emphasize simplicity**: Avoid over-engineering. Keep designs simple and focused. Don't add unnecessary features like sanity checks, warnings, or complex verification unless explicitly needed. Examples and pitfalls are optional, not required. Consolidate related operations into single substeps rather than creating many separate substeps. For example, instead of separate substeps for "Create Review Report", "Create Verification Report", "Create Issues Documentation", and "Create Findings Summary", consider consolidating into a single "Create Findings Documentation" substep that includes all related documentation. **For approval workflows and decision points, prefer simple, unified approaches over multiple separate cases or branches. A single unified flow is often clearer and easier to maintain than separate paths for each possible outcome.**
- **Use generic step references**: When documenting inputs from previous steps or outputs for next steps, use generic references like "previous step" or step names instead of specific step numbers. This makes process templates flexible when steps are added or removed.
- **Steps only produce outputs**: Steps should focus on producing outputs (files, reports, data) and should not include logic to "determine next step" or make flow decisions. Process flow decisions are handled at the process template level, not within individual steps. Steps produce status/outputs that the process template uses to determine the next step.
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
  - Examples (1-3 concrete scenarios) - optional
  - Common Pitfalls (warnings about potential issues) - optional
- Create a mermaid flowchart diagram using `flowchart TD` for top-down flow
- Include all major substeps as nodes with concise, action-oriented labels
- Plan substeps to be specific, actionable, and sequential
- Consider decision points and conditional branches if needed
- Plan for loops if the step requires iteration
- **Keep design decisions minimal**: If documenting design decisions, only include decisions that are truly important, non-obvious, or have significant impact. Avoid documenting obvious choices or minor implementation details. Focus on architectural or strategic decisions that affect the step's design.

**Files/Folders:**
- Review: `core/processes/steps/` for existing steps and patterns
- Review: `core/processes/steps/README.md` for guidelines and category information
- Reference: `core/processes/steps/step-template.md` for structure template

**Best Practices:**
- Be specific about what problem the step solves
- Identify unique aspects that require a new step
- Document why existing steps don't meet the need
- Choose the right category based on the step's purpose
- **Understand agent capabilities**: Agents make individual tool calls sequentially, not batch operations. Tools like `glob_file_search`, `list_dir`, and `grep` only return existing files, so don't design separate validation steps. Agents search naturally using available parameters - avoid explicit method descriptions or artificial separations between approaches.
- **Emphasize simplicity**: Keep designs simple and focused. Avoid over-engineering with unnecessary features like sanity checks, warnings, or complex verification unless explicitly needed. Examples and pitfalls are optional sections, not required. Prefer simple, straightforward approaches over complex ones. **For approval workflows, decision points, and user interaction flows, prefer unified approaches that handle all cases in one path rather than creating separate branches for each possible outcome.**
- Keep substeps focused and actionable
- Match the diagram to the substep sequence exactly
- Keep node labels concise but descriptive
- Use Title Case for visual consistency in diagrams
- Plan for self-contained step (no references to other steps)
- **Use generic step references**: When documenting inputs/outputs or process flow, use generic references like "previous step" or step names instead of specific step numbers (e.g., "Step 1", "Step 2"). This makes process templates more flexible and maintainable when steps are added or removed. For example, use "previous step (Understand Context)" instead of "Step 1 (Understand Context)".
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

