---
name: process-template-sync
description: Manage template sources and sync templates from configured git repositories. Fetch, update, and configure git-based template sources.
---

# Process Template Sync

Manage git-based template sources and synchronize templates to the local runtime.

## When to Use

- Setting up template sources for the first time
- Syncing templates from configured git repositories
- Adding or removing template sources
- Checking sync status or troubleshooting template availability

## Quick Reference

| Requirement | Description |
|-------------|-------------|
| Git required | `git` must be available on the system PATH |
| Network access | Required for clone/pull operations |
| Config location | `~/.claude/agentic-processes/config/template-sources.json` |

---

## How Template Sources Work

Templates (process templates and step templates) live in external git repositories. The framework fetches them into a local cache and copies them to the well-known runtime paths:

| Runtime Path | Contains |
|-------------|----------|
| `~/.claude/agentic-processes/templates/processes/` | Process templates (synced from git sources) |
| `~/.claude/agentic-processes/templates/steps/` | Step definitions (synced from git sources) |
| `~/.claude/agentic-processes/cache/sources/` | Git clone cache per source |
| `~/.claude/agentic-processes/config/template-sources.json` | Source configuration |

Each source has a name, git URL, branch, enabled flag, and priority. When multiple sources provide the same template, the higher-priority source (lower number) wins.

---

## Available Commands

All operations are invoked via:
```
Bash(python3 ${PLUGIN_ROOT}/scripts/template_manager.py <subcommand> ...)
```

Check stdout for JSON result with `"status": "ok"` or `"status": "error"`.

---

### init

Initialize all runtime directories and create a default config if none exists.

```
python3 ${PLUGIN_ROOT}/scripts/template_manager.py init
```

Creates: `active/`, `completed/`, `failed/`, `flags/`, `guidelines/`, `config/`, `cache/`, `templates/processes/`, `templates/steps/`.

---

### sync

Sync templates from all enabled sources (or a specific source). Automatically calls `init` first.

```
python3 ${PLUGIN_ROOT}/scripts/template_manager.py sync [--source <name>]
```

For each enabled source:
1. Clone the repo (if not cached) or pull latest changes
2. Copy `templates/processes/*` to `~/.claude/agentic-processes/templates/processes/`
3. Copy `templates/steps/*` to `~/.claude/agentic-processes/templates/steps/`
4. Log conflicts when multiple sources provide the same template

---

### add-source

Add a new template source.

```
python3 ${PLUGIN_ROOT}/scripts/template_manager.py add-source \
  --name "<source name>" \
  --url "<git repo URL>" \
  --branch "<branch>" \
  --priority <number>
```

- `--name`: Unique identifier for the source (e.g., "official", "team-templates")
- `--url`: Git clone URL (HTTPS or SSH)
- `--branch`: Branch or tag to track (default: "main")
- `--priority`: Lower number = higher priority when resolving conflicts (default: 100)

---

### remove-source

Remove a template source by name.

```
python3 ${PLUGIN_ROOT}/scripts/template_manager.py remove-source --name "<source name>"
```

This removes the source from config and deletes its cache. Templates already synced are not removed.

---

### list-sources

List all configured template sources with their status.

```
python3 ${PLUGIN_ROOT}/scripts/template_manager.py list-sources
```

---

### status

Show sync status: last sync time per source, number of templates installed.

```
python3 ${PLUGIN_ROOT}/scripts/template_manager.py status
```

---

## Common Operations

### First-Time Setup

When no templates are available:
1. Run `init` to create runtime directories
2. Run `sync` to fetch templates from the default official source

### Adding a Team Source

```
python3 ${PLUGIN_ROOT}/scripts/template_manager.py add-source \
  --name "team" \
  --url "https://github.com/my-org/my-templates.git" \
  --branch "main" \
  --priority 50
python3 ${PLUGIN_ROOT}/scripts/template_manager.py sync
```

A priority of 50 means team templates override official templates (priority 100) when names conflict.

### Updating Templates

```
python3 ${PLUGIN_ROOT}/scripts/template_manager.py sync
```

This pulls the latest from all enabled sources and re-copies templates to the runtime paths.

---

## Important Rules

- Always check the JSON output for status after each command
- If `git` is not available, inform the user and suggest installing it
- Network failures fall back to cached versions (stale but functional)
- The `sync` command is idempotent -- safe to run multiple times
