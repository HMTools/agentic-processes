# Core System

This directory contains the core components of the Agentic Process System.

## Overview

The core system provides:
- **Process Templates**: Reusable workflow definitions
- **Modular Steps**: Self-contained step definitions
- **Process Management**: State tracking and lifecycle management

## Directory Structure

```
core/
├── processes/
│   ├── templates/          # Process templates
│   ├── steps/              # Modular step definitions
│   ├── active/             # Currently running processes
│   ├── completed/         # Finished processes
│   └── failed/            # Failed processes
└── README.md              # This file
```

## Components

### Process Templates

**Location**: `core/processes/templates/`

Templates define reusable workflows with:
- Parameter placeholders (`{{paramName}}`)
- Step references (`@step:category/step-name`)
- Process flow diagrams
- Sequential step definitions

**Documentation**: See [Templates README](processes/templates/README.md)

### Modular Steps

**Location**: `core/processes/steps/`

Steps are modular, self-contained definitions organized by category:
- `api/` - API layer steps
- `data/` - Data layer steps
- `service/` - Service layer steps
- `testing/` - Testing steps
- `planning/` - Planning steps
- `documentation/` - Documentation steps
- `external-services/` - External service steps
- `learning/` - Learning/improvement steps

**Documentation**: See [Steps README](processes/steps/README.md)

### Process Instances

**Location**: `core/processes/{state}/`

Process instances are created from templates:
- `active/` - Currently running processes
- `completed/` - Finished processes
- `failed/` - Failed processes

Each process instance contains:
- `process.md` - Main process file with steps and state
- `memory.md` - Persistent information shared across steps
- `log.md` - Detailed execution log

## How It Works

### 1. Template Selection

User selects a template from `core/processes/templates/`.

### 2. Parameter Collection

System collects required parameters and substitutes placeholders.

### 3. Step Resolution

System resolves all `@step:category/step-name` references:
- Reads step files from `core/processes/steps/{category}/`
- Expands step content with full details
- Applies context parameters

### 4. Process Creation

System creates process instance in `core/processes/active/`:
- Process file with all steps expanded
- Memory file initialized
- Status set to "Running"

### 5. Process Execution

Process Manager:
- Tracks current step
- Updates state and memory
- Maintains audit log
- Enforces step order

### 6. Process Completion

When complete:
- Status updated to "Completed"
- Process moved to `core/processes/completed/`

## Key Concepts

### Templates

Templates are reusable workflow definitions:
- Use `{{paramName}}` for parameters
- Reference steps with `@step:category/step-name`
- Include mermaid flow diagrams
- Define sequential steps

### Steps

Steps are modular building blocks:
- Self-contained definitions
- Rich guidance and examples
- Flow diagrams for complex steps
- Substeps for detailed breakdown

### Step References

Templates reference steps using:
```markdown
- **Step**: `@step:api/implement-controller-layer`
```

References are automatically resolved when creating processes.

### Process State

Process state is maintained in markdown files:
- Current step and progress
- Completed steps with timestamps
- Memory and context
- Audit log

## Usage

### Creating a Process

1. Invoke `/process-new` in Cursor or GitHub Copilot
2. Select template
3. Provide parameters
4. System creates process with expanded steps

### Continuing a Process

1. Invoke `/process-continue`
2. Select process to resume
3. System shows current state
4. Continue from last incomplete step

## File Formats

### Template Format

```markdown
<!--
Template: Template Name
Purpose: What this template is for
Required Parameters: param1, param2
-->

# Process: {{processName}}
## Steps
- [ ] Step 1: Description
  - **Step**: `@step:category/step-name`
```

### Step Format

```markdown
<!--
Step: Step Name
Purpose: What this step accomplishes
-->

# Step: Step Name
## Description
## Output
## Guidance
## Flow
## Substeps
## Examples
## Common Pitfalls
```

### Process Format

```markdown
# Process: Process Name
## Current State
## Steps
- [x] Step 1: Completed
- [ ] Step 2: In Progress
## Memory File
## Errors & Notes
## Audit Log
```

## Best Practices

### Templates

- Keep focused and specific
- Use parameters for flexibility
- Reference existing steps
- Include flow diagrams
- Document when to use

### Steps

- Be self-contained
- Provide rich guidance
- Include examples
- Document common pitfalls
- Use flow diagrams for complex steps

### Processes

- Follow step guidance exactly
- Update memory as you go
- Check state regularly
- Complete steps fully before moving on
- Document decisions in memory

## Extension

### Adding Templates

1. Create template file in `core/processes/templates/`
2. Follow template structure
3. Reference existing steps
4. Test with process creation

### Adding Steps

1. Choose appropriate category
2. Create step file in `core/processes/steps/{category}/`
3. Follow step template
4. Include all required sections
5. Reference in templates

## Documentation

- [Templates Guide](processes/templates/README.md) - Template authoring guide
- [Steps Guide](processes/steps/README.md) - Step creation guide
- [Main README](../../README.md) - System overview
- [Getting Started](../docs/getting-started.md) - Quick start guide
- [Architecture](../docs/architecture.md) - System architecture

---

**Core system components for structured, repeatable workflows.**

