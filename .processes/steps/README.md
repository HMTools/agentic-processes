# Modular Steps Library

## Overview

The modular steps library contains reusable, self-contained step definitions that can be referenced by process templates. Each step is defined in its own markdown file and includes detailed guidance, flow diagrams, and substeps.

## Purpose

Modular steps promote:
- **DRY Principle**: Define steps once, use them in multiple templates
- **Consistency**: All processes use the same standard steps
- **Maintainability**: Update a step once, all processes benefit
- **Discoverability**: Browse the library to find available building blocks
- **Quality**: Rich guidance and examples in each step

## Shared Components System

Steps can reference shared components to reduce duplication and boilerplate. Components are stored in `_components/` directory.

### Available Components

- **mandatory-logging.md**: Logging requirements for steps that involve user interactions
- **pre-implementation-patterns.md**: Checklist for verifying existing patterns before implementing

See [`_components/README.md`](_components/README.md) for complete component documentation.

### User Guidelines in JSON Files

Step JSON files include a `userGuidelines` field that references project-specific guidelines:

```json
{
  "guidance": {
    "mandatoryComponents": ["mandatory-logging.md"],
    "userGuidelines": [
      "~/.claude/agentic-processes/guidelines/api-design/how-to-implement-controllers.md",
      "~/.claude/agentic-processes/guidelines/testing/how-to-write-unit-tests.md"
    ],
    ...
  }
}
```

Guidelines are stored in `~/.claude/agentic-processes/guidelines/{category}/how-to-{action}.md`. They answer "How to do X?" questions with practical, action-oriented content. When executing steps, agents read these files if they exist to apply project-specific patterns.

See [`~/.claude/agentic-processes/guidelines/README.md`](../../~/.claude/agentic-processes/guidelines/README.md) for the complete guidelines structure.

### Using Components in Steps

1. **Add Required Components section** at the top of the step file:
   ```markdown
   ## Required Components
   - [mandatory-logging.md](_components/mandatory-logging.md) - Logging guidelines
   - [pre-implementation-patterns.md](_components/pre-implementation-patterns.md) - Pattern verification
   - `~/.claude/agentic-processes/guidelines/code-conventions.md` - Code conventions
   - [Add other relevant project-specific guidelines from ~/.claude/agentic-processes/guidelines/]
   ```

2. **Include components where needed** using include markers:
   ```markdown
   ## Guidance
   
   <!-- @include: _components/mandatory-logging.md -->
   
   [Step-specific guidance continues...]
   ```

### Agent Reading Requirements

**IMPORTANT**: When an agent reads a step file, it MUST also read all files listed in the "Required Components" section. This ensures agents always have full context when working with steps.

- Components should be read first, then the step file
- Include markers (`<!-- @include: ... -->`) indicate where component content logically belongs
- All component content is always available in context, not just referenced

## How Steps Work

### In Templates

Templates reference steps using the `@step:category/step-name` syntax:

```markdown
## Steps

- [ ] Step 1: Analyze requirements for {{featureName}}
  - **Step**: `@step:common/analyze-requirements`
  - **Context**:
    - `targetArea`: {{featureName}}

- [ ] Step 2: Create technical design
  - **Step**: `@step:common/create-technical-design`
```

### In Process Instances

When a process is created from a template, the Process Manager:
1. Reads the template
2. Resolves each step reference by reading the step file
3. Expands the step with full details (description, output, guidance, substeps)
4. Applies any context parameters from the template
5. Creates the process instance with fully expanded steps


## Creating New Steps

When creating a new step:

1. **Choose the right category**: Place the step in the appropriate subfolder
2. **Use descriptive names**: Use kebab-case for filenames (e.g., `analyze-requirements.md`)
3. **Be self-contained**: Steps cannot reference other steps (but can reference shared components)
4. **Use shared components**: Reference components from `_components/` to reduce duplication
5. **Add Required Components section**: List all components used at the top of the step
6. **Include rich guidance**: Since steps are reused, provide detailed instructions
7. **Define clear output**: Specify what the step produces
8. **Use substeps for detail**: Break down complex steps with substeps and flow diagrams
9. **Add examples**: Help users understand how to apply the step
10. **Note common pitfalls**: Warn about potential issues

## Step Naming Conventions

- Use lowercase with hyphens (kebab-case)
- Be descriptive and specific
- Use verbs for action-oriented names
- Examples:
  - `analyze-requirements.md`
  - `create-technical-design.md`
  - `implement-repository-layer.md`
  - `write-unit-tests-service.md`

## Guidelines

### Self-Contained Steps
- Each step is independent and complete
- Steps do not reference other steps
- Complex workflows are composed at the template level

### Appropriate Granularity
- Not too broad: "Implement everything"
- Not too narrow: "Type the word 'class'"
- Just right: "Implement repository layer"

### Rich Guidance
- Provide specific file paths
- Include code patterns
- Reference project conventions
- List best practices
- Add concrete examples

### Flow Diagrams
- Use mermaid diagrams for substep visualization
- Support decision points (conditional branches)
- Support loops (circular flows)
- Keep diagrams clear and readable

## Available Steps

### Common Steps
Steps used across multiple process types:
- Requirements analysis
- Technical design
- Team reviews
- Pull request creation
- Code reviews
- Branch merging

### API Steps
Steps specific to API layer work:
- Contract definition
- Controller implementation
- Request/response mapping
- Service registration

### Service Steps
Steps for service layer implementation:
- Internal contract definition
- Service implementation
- Validation logic
- Business calculations

### Data Steps
Steps for data layer work:
- Domain model creation
- Repository implementation
- Database migrations

### Testing Steps
Steps for testing activities:
- Unit test creation
- Integration test creation
- Test execution and coverage verification

### Documentation Steps
Steps for documentation tasks:
- XML documentation
- API documentation
- Flow documentation

## Usage in Process Manager

When using Process Manager in chat mode:

1. **Creating a process**: The manager reads the template and resolves all step references
2. **Displaying steps**: Full step details are shown with description, guidance, and substeps
3. **Completing steps**: Mark substeps as complete as you progress
4. **Step validation**: Manager checks that referenced steps exist

## Best Practices

1. **Browse before creating**: Check if a similar step already exists
2. **Reuse steps**: Use existing steps when possible
3. **Use shared components**: Reference components from `_components/` instead of duplicating content
4. **Keep steps focused**: Each step should accomplish one clear objective
5. **Update centrally**: Improve existing steps rather than creating duplicates
6. **List required components**: Always include "Required Components" section for agent context
7. **Test with templates**: Verify steps work correctly when referenced
8. **Document thoroughly**: Future users will benefit from clear guidance

## Contributing

To contribute a new step:

1. Identify the need (a step used in templates that doesn't exist yet)
2. Choose the appropriate category
3. Create the step file following the standard format
4. Include all required sections
5. Test by referencing it in a template
6. Update this README if adding a new category

---

**For questions or issues with modular steps, consult the Process Manager in chat mode.**
