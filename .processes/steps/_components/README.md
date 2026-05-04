# Shared Components

This directory contains reusable components that can be referenced by step files to reduce duplication and boilerplate.

## Available Components

### mandatory-logging.md
The mandatory logging section that must appear in steps that involve user interactions. This component contains the logging requirements and checklist.

**Usage**: Include this component in the Guidance section of steps that require logging user interactions.

### mandatory-consultation.md
The mandatory consultation requirement when agents are uncertain about how to proceed. This component contains the requirement to consult users when not 100% certain about any action.

**Usage**: Include this component in the Description section of steps that require agents to make decisions or take actions where uncertainty might arise.

### mandatory-approval-checkpoint.md
The mandatory approval checkpoint requirement for steps that require user approval before proceeding. This component contains the checklist and workflow for stopping and waiting for user approval.

**Usage**: Include this component in process templates at steps that have approval checkpoints. The component should be included immediately after the step's approval checkpoint description to reinforce the requirement to stop and wait.

### pre-implementation-patterns.md
A checklist for verifying existing patterns before implementing new components. This helps maintain consistency and avoid duplication.

**Usage**: Include this component in steps that involve creating new implementations (services, tests, API clients, etc.).

### qa-session.md
A structured workflow for gathering missing information from users through Q&A sessions. Includes question formatting, logging, and outcome handling.

**Usage**: Include this component in steps that may need to gather information from users when gaps are identified. Particularly useful for planning and analysis steps.

### operating-principles.md
The agent operating principles that govern all process execution. Contains principle definitions, Init-Step and End-Step substep templates.

**Usage**: Referenced by `init-process-principles` step to load principles at process start, and by all steps' Init-Step/End-Step substeps for principle confirmation and compliance checking.

## Guidelines Files

Guidelines are project-specific patterns and conventions stored in `.user-processes/guidelines/`. They are organized by domain category:

```
.user-processes/guidelines/
├── api-design/           # Controller, auth, versioning patterns
├── data-access/          # Repository, MongoDB, transactions
├── implementation/       # Service layer, DI, error handling
├── testing/              # Unit tests, integration tests, mocking
├── planning/             # Task breakdown, estimation
└── docs/                 # Flow documentation, diagrams
```

### How Guidelines Are Referenced

Guidelines are referenced in step JSON files via the `userGuidelines` field:

```json
{
  "guidance": {
    "mandatoryComponents": ["mandatory-logging.md"],
    "userGuidelines": [
      ".user-processes/guidelines/api-design/how-to-implement-controllers.md",
      ".user-processes/guidelines/api-design/how-to-handle-authentication.md"
    ],
    ...
  }
}
```

### Agent Reading Requirements

When executing a step, agents should:
1. Read the `userGuidelines` array from the step JSON
2. Load each guideline file that exists
3. Apply the patterns and conventions from the guidelines
4. Skip gracefully if a guideline file doesn't exist yet

### Available Guideline Categories

| Category | Example Guidelines | Used By |
|----------|-------------------|---------|
| `api-design/` | how-to-implement-controllers, how-to-handle-authentication, how-to-version-apis | API steps |
| `data-access/` | how-to-implement-repositories, how-to-use-mongodb | Data steps |
| `implementation/` | how-to-implement-services, how-to-use-dependency-injection, how-to-handle-errors | Service steps |
| `testing/` | how-to-write-unit-tests, how-to-write-integration-tests, how-to-mock-dependencies | Testing steps |
| `planning/` | how-to-break-down-tasks, how-to-estimate-complexity | Planning steps |
| `docs/` | how-to-document-flows | Template steps |

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
