# Shared Components

This directory contains reusable components that can be referenced by step files to reduce duplication and boilerplate.

## Available Components

### mandatory-logging.md
The mandatory logging section that must appear in steps that involve user interactions. This component contains the logging requirements and checklist.

**Usage**: Include this component in the Guidance section of steps that require logging user interactions.

### mandatory-consultation.md
The mandatory consultation requirement when agents are uncertain about how to proceed. This component contains the requirement to consult users when not 100% certain about any action.

**Usage**: Include this component in the Description section of steps that require agents to make decisions or take actions where uncertainty might arise.

### pre-implementation-patterns.md
A checklist for verifying existing patterns before implementing new components. This helps maintain consistency and avoid duplication.

**Usage**: Include this component in steps that involve creating new implementations (services, tests, API clients, etc.).

## Best Practices Files

Instead of a generic best practices component, steps should directly reference the relevant project-specific best practices files in the "Required Components" section. Common references include:

- `.github/instructions/code-conventions.instructions.md` - Code conventions
- `.github/instructions/solid.instructions.md` - SOLID principles
- Project-specific documentation files (testing patterns, API patterns, repository patterns, etc.)

## How to Use Components

### In Step Files

1. **Add Required Components section** at the top of the step file:
   ```markdown
   ## Required Components
   - [mandatory-logging.md](_components/mandatory-logging.md) - Logging guidelines
   - [pre-implementation-patterns.md](_components/pre-implementation-patterns.md) - Pattern verification
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

## Creating New Components

When creating a new component:

1. **Identify duplication**: Look for sections that appear in 3+ step files
2. **Extract common content**: Create a component with the shared content
3. **Keep it generic**: Make components reusable across different step types
4. **Document usage**: Update this README with the new component
5. **Update step-template.md**: Add the component to the template if it's commonly used

## Component Guidelines

- **Self-contained**: Components should be complete and understandable on their own
- **Reusable**: Components should be applicable to multiple step types
- **Maintainable**: Update components in one place to update all steps
- **Discoverable**: All components are listed in this README
