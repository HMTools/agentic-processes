# Project Guidelines

This directory contains project-specific guidelines that are referenced by process steps. Guidelines help adapt the generic framework steps to your specific project conventions, patterns, and standards.

## Purpose

Guidelines serve as:
- **Single source of truth** for project-specific patterns and practices
- **Reusable knowledge** referenced across different steps and processes
- **Consistency enforcer** ensuring uniform application of patterns
- **AI agent context** providing structured guidance for code generation

## Directory Structure

```
guidelines/
├── api-design/              # API layer patterns
│   ├── controller-patterns.md
│   ├── authentication-patterns.md
│   └── api-versioning.md
├── data-access/             # Data layer patterns
│   ├── repository-pattern.md
│   ├── mongodb-patterns.md
│   └── transaction-handling.md
├── implementation/          # Service layer patterns
│   ├── service-layer-patterns.md
│   ├── dependency-injection.md
│   ├── error-handling.md
│   └── logging-patterns.md
├── testing/                 # Testing patterns
│   ├── unit-testing-patterns.md
│   ├── integration-testing-patterns.md
│   ├── mocking-strategies.md
│   └── test-data-generation.md
├── planning/                # Planning patterns
│   ├── task-breakdown.md
│   └── complexity-estimation.md
└── docs/                    # Documentation patterns
    ├── flow-documentation.md
    └── mermaid-diagrams.md
```

## How Guidelines Are Used

### In Step JSON Files

Steps reference guidelines via the `userGuidelines` field:

```json
{
  "guidance": {
    "userGuidelines": [
      ".user-processes/guidelines/api-design/controller-patterns.md",
      ".user-processes/guidelines/api-design/authentication-patterns.md"
    ]
  }
}
```

### By Agents

When executing a step, agents:
1. Read the step's `userGuidelines` array
2. Load each guideline file that exists
3. Apply the patterns and conventions from the guidelines
4. Skip gracefully if a guideline file doesn't exist yet

## Creating Guidelines

### Guideline File Structure

Each guideline file should include:

```markdown
# [Pattern Name]

## Overview
Brief description of the pattern and when to use it.

## Patterns

### [Pattern 1]
- Description
- Code examples
- When to use

### [Pattern 2]
...

## Examples

### Example 1: [Scenario]
Complete, working code example.

## Related Guidelines
- [Link to related guideline](../category/guideline.md)
```

### Best Practices for Guidelines

1. **Extract, don't invent**: Base guidelines on actual project patterns
2. **Include examples**: Provide complete, working code examples
3. **Stay focused**: One topic per file for easy reuse
4. **Cross-reference**: Link to related guidelines
5. **Keep current**: Update when patterns evolve

## Adding New Guidelines

1. Determine the appropriate category (or create new one)
2. Create the guideline file following the structure above
3. Add cross-references to related guidelines
4. The step JSON files already reference standard guideline paths

## Categories

| Category | Purpose |
|----------|---------|
| `api-design/` | Controller organization, authentication, versioning, response patterns |
| `data-access/` | Repository patterns, database operations, transactions |
| `implementation/` | Service layer, dependency injection, error handling, logging |
| `testing/` | Unit tests, integration tests, mocking, test data |
| `planning/` | Task breakdown, complexity estimation |
| `docs/` | Flow documentation, diagrams |

