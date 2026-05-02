# Agentic Process System

A powerful plugin for managing long-running, multi-step workflows with AI agents. Create reusable process templates, modular step definitions, and track complex tasks from start to finish with persistent state management.

## Installation

Install from the marketplace:
```bash
claude plugin install agentic-processes
```

Or use a local plugin directory:
```bash
claude --plugin-dir /path/to/agentic-processes
```

## Overview

The Agentic Process System enables structured, repeatable workflows for complex development tasks. It provides:

- **Process Templates**: Reusable workflow definitions with parameter substitution
- **Modular Steps**: Self-contained, reusable step definitions that can be composed into processes
- **State Management**: Persistent process state with checkboxes, timestamps, and audit logs
- **AI Integration**: Seamless integration with Claude Code
- **Process Tracking**: Resume interrupted processes, track progress, and maintain context across sessions

## Key Features

### Process Management
- Create processes from templates with parameter substitution
- Track progress with checkboxes and timestamps
- Maintain audit logs for all actions
- Resume interrupted processes seamlessly
- Move processes between active/completed/failed states

### Modular Architecture
- **Templates**: Define reusable workflows with placeholders
- **Steps**: Self-contained step definitions with rich guidance
- **Step References**: Compose processes using `@framework-step:category/step-name` or `@user-step:category/step-name` syntax
- **Pluggable Resources**: Add your own templates, steps, components, and guidelines

### State Persistence
- Process state stored in JSON and markdown files
- Memory files for cross-step information sharing
- Audit logs for complete history
- No data loss between sessions

### AI Integration
- Commands: `/process-new`, `/process-continue`
- Strict process adherence to prevent deviation
- Proactive guidance for next steps
- Subagent delegation for context isolation

## Quick Start

### 1. Create a New Process

Use the command:
```
/process-new
```

The system will:
1. Check for existing similar processes
2. List available templates
3. Collect required parameters
4. Resolve step references
5. Create process instance with expanded steps

### 2. Continue an Existing Process

To resume a process:
```
/process-continue
```

The system will:
1. List all active processes
2. Show current progress
3. Resume from the last incomplete step

### 3. Process Structure

A process consists of:
- **Process File** (`process.json`): Primary state and machine-readable data
- **Process Doc** (`process.md`): User-readable workflow documentation
- **Memory File** (`memory.json`): Persistent information shared across steps
- **Log File** (`log.json`): Detailed execution log (auto-updated)

## Plugin Structure

```
agentic-processes/                    # Plugin root
├── .claude-plugin/
│   └── plugin.json                   # Claude Code plugin manifest
├── agents/                           # Root-level agents (auto-discovered)
│   ├── step-executor.md
│   └── process-spawner.md
├── hooks/
│   └── hooks.json                    # Unified hook configuration
├── scripts/                          # Hook scripts
│   ├── check-approval-stop.sh
│   ├── block-tools-on-pending.sh
│   ├── block-todo-tools.sh
│   ├── enforce-log-first.sh
│   ├── create-log-flag.sh
│   └── bind-session-to-process.sh
├── skills/
│   ├── agentic-processes/
│   │   └── SKILL.md                  # Main framework skill
│   ├── process-new/
│   │   └── SKILL.md                  # Start a new process from a template
│   ├── process-continue/
│   │   └── SKILL.md                  # Continue an existing process
│   └── process-state-update/
│       └── SKILL.md                  # Update process state files
├── assets/
│   └── logo.svg                      # Plugin branding
├── AGENTS.md                         # Agent discovery file
├── .processes/                       # Framework core
│   ├── templates/                    # Process templates
│   ├── steps/                        # Step definitions
│   ├── types/                        # TypeScript types + schema.json (shared source of truth)
│   └── prompts/                      # Entry prompts
└── docs/                             # Documentation
```

## Core Concepts

### Processes

A **process** is an instance of a workflow created from a template. It tracks:
- Current step and progress
- Completed steps with timestamps
- Memory and context
- Audit log of all actions

Processes are stored in `.user-processes/` (in your project):
- `.user-processes/active/` - Currently running processes
- `.user-processes/completed/` - Finished processes
- `.user-processes/failed/` - Failed processes

### Templates

**Templates** define reusable workflows with:
- Parameter placeholders (`{{paramName}}`)
- Step references (`@framework-step:category/step-name` or `@user-step:category/step-name`)
- Process flow diagrams (mermaid)
- Sequential step definitions

Templates are stored in:
- **Framework templates**: `.processes/templates/{category}/`
- **User templates**: `.user-processes/templates/{category}/`

### Steps

**Steps** are modular, self-contained definitions that include:
- Description and objectives
- Expected outputs
- Detailed guidance
- Flow diagrams (mermaid)
- Substeps breakdown
- Examples and common pitfalls

Steps are stored in:
- **Framework steps**: `.processes/steps/{category}/`
- **User steps**: `.user-processes/steps/{category}/`

### Step References

Templates reference steps using explicit prefixes:

```markdown
# Framework steps (from .processes/steps/)
- [ ] Step 1: Implement feature
  - **Step**: `@framework-step:api/implement-controller-layer`

# User steps (from .user-processes/steps/)
- [ ] Step 2: Apply project conventions
  - **Step**: `@user-step:my-category/my-custom-step`
```

## Documentation

- [Getting Started](docs/getting-started.md) - Detailed quick start guide
- [Architecture](docs/architecture.md) - System architecture deep dive
- [Examples](docs/examples.md) - More usage examples
- [Templates Guide](.processes/templates/README.md) - Template authoring
- [Steps Guide](.processes/steps/README.md) - Step creation guide

## Contributing

### Adding Your Own Templates

1. Create template file in `.user-processes/templates/{category}/`
2. Follow template structure (see `.processes/templates/README.md`)
3. Include parameter placeholders
4. Reference steps using `@framework-step:` or `@user-step:` syntax
5. Add mermaid flow diagram

### Adding Your Own Steps

1. Create step file in `.user-processes/steps/{category}/`
2. Follow step template (see `.processes/steps/step-template.md`)
3. Include all required sections:
   - Description
   - Output
   - Guidance
   - Flow diagram
   - Substeps
   - Examples
   - Common pitfalls

## License

MIT

---

**Built for structured, repeatable workflows with AI agents.**
