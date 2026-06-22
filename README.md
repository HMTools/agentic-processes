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

After installation, open the Marketplace in the UI to browse and install templates from configured marketplaces. This installs process templates to `~/.claude/agentic-processes/templates/processes/` and creates all required runtime directories.

## Overview

The Agentic Process System enables structured, repeatable workflows for complex development tasks. It provides:

- **Process Templates**: Reusable workflow definitions with parameter substitution
- **Modular Steps**: Self-contained step definitions within each process template
- **State Management**: Persistent process state with checkboxes, timestamps, and audit logs
- **AI Integration**: Seamless integration with Claude Code
- **Process Tracking**: Resume interrupted processes, track progress, and maintain context across sessions
- **Template Marketplaces**: Templates installed from configurable git-backed marketplaces, enabling team sharing and versioning

## Key Features

### Process Management
- Create processes from templates with parameter substitution
- Track progress with checkboxes and timestamps
- Maintain audit logs for all actions
- Resume interrupted processes seamlessly
- Move processes between active/completed/failed states

### Modular Architecture
- **Templates**: Define reusable workflows with placeholders
- **Steps**: Self-contained step definitions within each template directory
- **Pluggable Resources**: Add your own templates, steps, components, and guidelines
- **Marketplaces**: Configure multiple git repositories as template marketplaces

### State Persistence
- Process state stored in JSON files
- Memory files for cross-step information sharing
- Audit logs for complete history
- No data loss between sessions

### AI Integration
- Commands: `/process-new`, `/process-continue`
- Strict process adherence to prevent deviation
- Proactive guidance for next steps
- Subagent delegation for context isolation

## Quick Start

### 1. Install Templates from Marketplaces

After installing the plugin, open the Marketplace in the UI to browse available templates and install the ones you need. The marketplace refreshes git-backed template repositories and lets you install individual templates to `~/.claude/agentic-processes/templates/`.

### 2. Create a New Process

Use the command:
```
/process-new
```

The system will:
1. Check for existing similar processes
2. List available templates from `~/.claude/agentic-processes/templates/processes/`
3. Collect required parameters
4. Resolve step definitions from subdirectories within the selected template
5. Create process instance with expanded steps

### 3. Continue an Existing Process

To resume a process:
```
/process-continue
```

The system will:
1. List all active processes
2. Show current progress
3. Resume from the last incomplete step

### 4. Process Structure

A process consists of:
- **Process File** (`process.json`): Primary state and machine-readable data
- **Memory Directory** (`memory/`): Topic-based files for persistent information shared across steps
- **Log File** (`log.json`): Detailed execution log (auto-updated)

## Plugin Structure

```
agentic-processes/                    # Plugin root
├── .claude-plugin/
│   └── plugin.json                   # Claude Code plugin manifest
├── agents/                           # Root-level agents (auto-discovered)
│   ├── step-executor.md
│   └── process-spawner.md
├── framework-steps/                  # Auto-injected framework-level steps
│   ├── continuous-improvement/
│   │   └── continuous-improvement.json
│   └── end-process-validation/
│       └── end-process-validation.json
├── hooks/
│   └── hooks.json                    # Unified hook configuration
├── scripts/                          # Hook and utility scripts
│   ├── process_manager.py            # Process state management
│   ├── template_manager.py           # Marketplace template operations
│   ├── models.py                     # Shared data models
│   └── ...hook scripts...
├── skills/
│   ├── process-new/
│   │   └── SKILL.md                  # Start a new process from a template
│   ├── process-continue/
│   │   └── SKILL.md                  # Continue an existing process
│   ├── process-state-update/
│   │   └── SKILL.md                  # Update process state files
├── config/
│   └── marketplaces.default.json     # Default marketplace configuration
├── types/                            # TypeScript types + schema.json
├── assets/
│   └── logo.svg                      # Plugin branding
├── AGENTS.md                         # Agent discovery file
└── docs/                             # Documentation
```

## Core Concepts

### Processes

A **process** is an instance of a workflow created from a template. It tracks:
- Current step and progress
- Completed steps with timestamps
- Memory and context
- Audit log of all actions

Processes are stored in `~/.claude/agentic-processes/`:
- `~/.claude/agentic-processes/active/` - Currently running processes
- `~/.claude/agentic-processes/completed/` - Finished processes
- `~/.claude/agentic-processes/failed/` - Failed processes

### Templates

**Templates** define reusable workflows with:
- Parameter placeholders (`{{paramName}}`)
- Step references via UUID (`stepRef`) with human-readable companion (`stepRefName`)
- Process flow diagrams (mermaid)
- Sequential step definitions

Templates are installed to `~/.claude/agentic-processes/templates/processes/{category}/` from configured marketplaces.

### Steps

**Steps** are modular, self-contained definitions that live as subdirectories within each process template directory. Each step includes:
- Description and objectives
- Expected outputs
- Detailed guidance
- Substeps breakdown
- Examples and common pitfalls

Steps are defined in subdirectories of each process template. Each step definition JSON file has a unique `id` field (UUID v4), and templates reference steps via this UUID in the `stepRef` field, with a `stepRefName` companion for human readability.

### Framework Steps

**Framework steps** are cross-cutting workflow steps that are automatically injected into every process by `process_manager.py` at creation time. Template authors do not need to include them. Currently, two framework steps are auto-appended as the final steps of every process:

- **Continuous Improvement** — Captures learnings, improvements, and patterns discovered during process execution.
- **End Process Validation** — Validates that all process deliverables are complete and correct before closing.

Framework steps are identified by `"type": "framework-step"` in their JSON definition and use plain UUID `stepRef` values (no prefix). Their definitions live in `{PLUGIN_ROOT}/framework-steps/{name}/{name}.json`.

## Template Marketplaces

Templates are distributed via git-backed marketplaces, not bundled with the plugin. This enables:

- **Versioned templates**: Pin to a branch or tag for stability
- **Team sharing**: Host custom templates in private repos
- **Multiple marketplaces**: Combine official and custom template repos
- **Per-template install**: Browse catalogs and install only the templates you need
- **Update detection**: See which installed templates have updates available
- **Independent updates**: Update templates without updating the plugin

### Configuration

Marketplaces are configured in `~/.claude/agentic-processes/config/marketplaces.json`:

```json
{
  "marketplaces": [
    {
      "name": "official",
      "url": "https://github.com/HMTools/agentic-process-templates.git",
      "branch": "main",
      "enabled": true,
      "priority": 100
    }
  ]
}
```

### Managing Marketplaces

Use the Marketplace section in the UI Settings to:
- **Add marketplace**: Register a new git repository as a marketplace
- **Remove marketplace**: Unregister a marketplace
- **Refresh**: Fetch latest template catalogs from all configured marketplaces
- **Browse catalog**: Expand a marketplace to see all available templates
- **Install/Uninstall**: Install specific templates from a marketplace
- **Update**: Update installed templates when new versions are available

### Runtime Layout

After installing templates from marketplaces:
```
~/.claude/agentic-processes/
├── config/
│   ├── marketplaces.json              # Marketplace configuration
│   └── installed-templates.json       # Installed templates manifest
├── cache/
│   └── sources/{name}/                # Git clone cache per marketplace
├── templates/
│   └── processes/{category}/          # Installed process templates (steps within each)
├── active/                            # Running processes
├── completed/                         # Finished processes
├── failed/                            # Failed processes
├── flags/                             # Runtime flags
└── guidelines/                        # Project-specific guidelines
```

## Documentation

- [Getting Started](docs/getting-started.md) - Detailed quick start guide
- [Architecture](docs/architecture.md) - System architecture deep dive
- [Examples](docs/examples.md) - More usage examples

## Roadmap

View the full interactive roadmap: [https://hmtools.github.io/agentic-processes/](https://hmtools.github.io/agentic-processes/)

### Agentic Processes (Framework Plugin)
- add `stepType` with enum `spawn` (subprocess) `direct` (regular step template) and also show it in the UI, think if we can also connect in case of spawn what is the process template target so we will be able to show it also in the ui
- replace `guidelines` with `flavors` (not a must), and make it `compile` time so the process instance files will have the flavor in it on creation so the active process will not need to take it into account
- verification checklist for each step with (can be done by hook or by low cost model via subagent)
- change memory files from single file to multiple files
- use dynamic context injection in the `continue-process` skill
- finish session hook - empty .session file
- improve pending-interactions - add to where each option is sending to (next step, some prev step) - framework + ui
- events - event on different life cycle acts of the processes - can be framework (global) level and template level - multiple subscriptions can be assigned to each event listener (can be also on the server app)
- hook that blocks framework file changes by the agent - so only skills using python can change them
- git managment - branches, tagging, work trees
- dynamic processes / templates
- simple `do` template / - dynamic built workflow that checks for exist steps and with final step for saving steps, guidelines and process
- improve continuous learning step - guide it to find things so in the future everything will be one-shot, also guide it to find improvements for better token cost effective, and context management effective
- set different llm model for different steps (in config)
- change steps to be defaulted as process template scope (related to specific template), with allowing to set global steps (maybe)
- step-level shared behaviors (previously _components) - now handled by hooks and skills
- ~~remove the view only md files~~ (DONE - JSON-only architecture implemented)
- cost analysis of processes and steps
- graphify
- triggers (ci, cd)
- use full skills frontmatter capabilities
- step executor skill
- replace template sources git with marketplaces (strongly driven by ui) git that the user can see which templates he needs to update and can install specific templates
- verif subagent (different cotnext window) as optional part of the delcaration of the step and not a dedicated step in the process

### Agentic Processes UI
- add the option of using `Channel` mcp - and not directly writing to cli
- Web-based deployment (beyond Electron)
- steps inner flow live diagrams (active-step)
- create a persist way to see which files been modified (currently we see only what in process instance folder)
- add more super easy UX ways for reviewing processes (maybe not md)
- template creator via chat (with dynamic preview ui)

### Agentic Processes Server - TBD
- Template marketplace — discover and share community templates

## Contributing

### Contributing to Official Templates

Official templates live in the [agentic-process-templates](https://github.com/HM/agentic-process-templates) repository. To contribute:

1. Fork the templates repository
2. Create or modify templates under `templates/processes/{category}/` (step definitions live as subdirectories within each template)
3. Submit a pull request

### Adding Custom Templates Locally

For local/team-specific templates, add a custom marketplace:

1. Create a git repo with the standard template structure (`templates/processes/`)
2. Open the Marketplace in the UI Settings and add the repo as a marketplace
3. Refresh and install the templates you need

### Template Authoring

Process templates use parameter placeholders (`{{paramName}}`) and define steps as subdirectories within the template directory. Each step definition includes description, output, guidance, substeps, examples, and common pitfalls.

## License

MIT

---

**Built for structured, repeatable workflows with AI agents.**
