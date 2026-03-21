# How to Write and Test Cursor Plugins Locally

> Source: [Medium article by Vitek Tajzich](https://medium.com/@v.tajzich/how-to-write-and-test-cursor-plugins-locally-the-part-the-docs-dont-tell-you-4eee705d7f76) (March 2026)

The official Cursor docs cover plugin structure well — manifest, commands, skills, rules. What they don't cover is how to test your plugin locally during development without publishing to the marketplace.

**Note:** This guide was tested on macOS (Cursor 2.5.x). The config paths and sqlite commands are macOS-specific. The general approach should transfer to Linux/Windows with adjusted paths.

## What's a Plugin

A plugin is a container that bundles primitives such as:
- **Rules** - persistent AI guidance in `.mdc` files
- **Skills** - specialized agent capabilities in `SKILL.md` files
- **Commands** - markdown-defined actions
- **Hooks** - automation triggers
- **Agents** - specialized agent definitions
- **MCP servers** - Model Context Protocol integrations

The only required file is `.cursor-plugin/plugin.json`:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "What it does in one sentence",
  "author": { "name": "Your Name" },
  "commands": "./commands/",
  "skills": "./skills/",
  "rules": "./rules/"
}
```

**Important distinction:** Cursor plugins use `.cursor-plugin/` for the manifest directory. Claude Code plugins use `.claude-plugin/`. Cursor integrates with parts of Claude Code's config surface — which is exactly what makes local testing possible.

## The Minimal Plugin Structure

```
my-plugin/
├── .cursor-plugin/
│   └── plugin.json
├── commands/
│   ├── do-something.md
│   ├── do-another-thing.md
│   └── install-plugin.md
├── rules/
│   └── safety.mdc
├── skills/
│   └── my-skill/
│       └── SKILL.md
└── scripts/
    ├── install-plugin.sh
    └── lib.sh
```

### Commands

Commands are markdown files with YAML frontmatter. The agent reads them and follows the steps:

```markdown
---
name: my-command
description: What the command does
---

# My Command

## Steps

1. Ask the user for the thing.
2. Run `bash <plugin_root>/scripts/do-the-thing.sh --name <name>`.
3. Report the result.
```

### Rules

Rules are `.mdc` files with frontmatter controlling when they apply (`alwaysApply: true`, or scoped via `globs`).

### Skills

Skills are `SKILL.md` files in named subdirectories — the agent invokes them based on task context.

If you don't specify paths in `plugin.json`, Cursor auto-discovers components from the default directory names. Explicit paths override auto-discovery.

## The Local Testing Problem

Claude Code CLI has `--plugin-dir ./my-plugin` for this. You point it at your plugin directory and it loads everything.

Cursor IDE doesn't have that flag. The Marketplace is the intended distribution channel, and there's no built-in "load from local directory" option in the IDE. To test locally, you need to register the plugin manually.

## The ~/.claude Directory

Cursor's agent reads plugin registration from `~/.claude/` — it shares Claude Code's config surface. The integration is a known supported path (Cursor's third-party hooks docs reference it), but the local plugin dev workflow built on top of it isn't spelled out anywhere.

You need three things, plus possibly a fourth depending on your Cursor version.

## Step 1: Copy Your Plugin Files

Put your plugin into `~/.cursor/plugins/<name>/`:

```bash
PLUGIN_NAME="my-plugin"
TARGET="$HOME/.cursor/plugins/$PLUGIN_NAME"
rm -rf "$TARGET"
mkdir -p "$TARGET"
for dir in .cursor-plugin commands rules skills scripts; do
  [ -d "$dir" ] && cp -R "$dir" "$TARGET/"
done
```

## Step 2: Register in ~/.claude/plugins/installed_plugins.json

This is the file Cursor picks up to discover locally-installed plugins. Create it (or merge into it) with your plugin entry:

```json
{
  "plugins": {
    "my-plugin@local": [
      {
        "scope": "user",
        "installPath": "/Users/you/.cursor/plugins/my-plugin"
      }
    ]
  }
}
```

The `@local` suffix signals a locally-installed plugin, as opposed to one pulled from the marketplace. **Use an absolute path** for `installPath` — relative paths don't work reliably.

## Step 3: Enable in ~/.claude/settings.json

Registration alone doesn't activate the plugin. You also need to flip the enable flag:

```json
{
  "enabledPlugins": {
    "my-plugin@local": true
  }
}
```

## Step 4 (if needed): Enable Third-Party Content Import

Depending on your Cursor version, third-party plugin loading may be gated behind a setting. Look for "Include third-party Plugins, Skills, and other configs" under **Settings > Features** (older builds may call it "Third-party skills"). If it's off, flip it on.

If the UI toggle doesn't exist in your build, the sqlite fallback works on macOS with Cursor 2.5.x. **Close Cursor first**, then:

```bash
DB="$HOME/Library/Application Support/Cursor/User/globalStorage/state.vscdb"
[ -f "$DB" ] && sqlite3 "$DB" \
  "INSERT OR REPLACE INTO ItemTable (key, value) 
   VALUES ('cursor/thirdPartyExtensibilityEnabled', 'true');"
```

This key may change in future builds. If the DB doesn't exist or the write fails, skip this step and check the UI settings instead.

**After these steps:** Restart Cursor. Your commands should appear in the agent's command palette.

## Automated Install Script

Doing this manually on every change is tedious. Here's a complete `install-plugin.sh` script:

```bash
#!/usr/bin/env bash
set -euo pipefail
command -v python3 >/dev/null || { echo "python3 required"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PLUGIN_NAME="my-plugin"
PLUGIN_ID="${PLUGIN_NAME}@local"
TARGET="$HOME/.cursor/plugins/$PLUGIN_NAME"
CLAUDE_PLUGINS="$HOME/.claude/plugins/installed_plugins.json"
CLAUDE_SETTINGS="$HOME/.claude/settings.json"

# 1. Copy plugin files
rm -rf "$TARGET"
mkdir -p "$TARGET" "$HOME/.claude/plugins"
for dir in .cursor-plugin commands rules skills scripts; do
  [[ -d "$REPO_ROOT/$dir" ]] && cp -R "$REPO_ROOT/$dir" "$TARGET/"
done

# 2. Register in installed_plugins.json (upsert, don't clobber)
python3 - "$CLAUDE_PLUGINS" "$PLUGIN_ID" "$TARGET" <<'PY'
import json, os, sys
path, pid, ipath = sys.argv[1], sys.argv[2], sys.argv[3]
data = {}
if os.path.exists(path):
    try: data = json.load(open(path))
    except: data = {}
plugins = data.get("plugins", {})
entries = [e for e in plugins.get(pid, [])
           if not (isinstance(e, dict) and e.get("scope") == "user")]
entries.insert(0, {"scope": "user", "installPath": ipath})
plugins[pid] = entries
data["plugins"] = plugins
os.makedirs(os.path.dirname(path), exist_ok=True)
json.dump(data, open(path, "w"), indent=2)
PY

# 3. Enable in settings.json (upsert, don't clobber)
python3 - "$CLAUDE_SETTINGS" "$PLUGIN_ID" <<'PY'
import json, os, sys
path, pid = sys.argv[1], sys.argv[2]
data = {}
if os.path.exists(path):
    try: data = json.load(open(path))
    except: data = {}
data.setdefault("enabledPlugins", {})[pid] = True
os.makedirs(os.path.dirname(path), exist_ok=True)
json.dump(data, open(path, "w"), indent=2)
PY

echo "Installed. Restart Cursor."
```

The install script itself can be exposed as a plugin command. Create an `install-plugin.md` command that tells the agent to run `bash <plugin_root>/scripts/install-plugin.sh`. First install is manual, every install after that is a command.

## The Dev Loop

1. Edit your plugin sources in your repo
2. Run `bash scripts/install-plugin.sh`
3. Restart Cursor (Cmd+Shift+P → "Reload Window" sometimes works, full restart is safer)
4. Test your commands, skills, and rules in the agent
5. Repeat

There's no hot-reload. No watch mode. No incremental updates. You copy files, you restart, you test.

## Common Gotchas

### `.cursor-plugin/` vs `.claude-plugin/`

Cursor uses `.cursor-plugin/`. Claude Code uses `.claude-plugin/`. If you're looking at Claude Code plugin docs and copying the structure, you'll create `.claude-plugin/` and wonder why Cursor doesn't pick it up.

### Don't Install Under `~/.cursor/skills/` Only

Skills get loaded, but commands don't register. You need the full `~/.cursor/plugins/<name>/` path plus the `~/.claude/` registration.

### Check Both JSON Files

A plugin can show as installed but not load if `installed_plugins.json` has the entry but `enabledPlugins` in `settings.json` doesn't. Always verify both files after install.

### Restart Means Restart

"Reload Window" works sometimes. When it doesn't and you're staring at a command palette that doesn't show your new commands, just quit and reopen Cursor.

## Future Improvements

The plugin system is young. This workflow will probably become unnecessary once Cursor adds proper local dev tooling — something like `--plugin-dir` but for the IDE, not just the CLI. Until then, the `~/.claude/` directory is your friend.

---

## Windows Adaptation Notes

For Windows users, the paths would be:
- Plugin target: `%USERPROFILE%\.cursor\plugins\<plugin-name>\`
- Claude plugins: `%USERPROFILE%\.claude\plugins\installed_plugins.json`
- Claude settings: `%USERPROFILE%\.claude\settings.json`
- Cursor state DB: `%APPDATA%\Cursor\User\globalStorage\state.vscdb`

The install script would need to be adapted to PowerShell or use cross-platform Python for all file operations.
