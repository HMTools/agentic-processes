# Cursor Hooks Guide

> **Source:** https://cursor.com/docs/hooks  
> **Captured:** 2026-03-08  
> **Sections:** Agent and Tab Support, Quickstart, Hook Types, Examples, Partner Integrations, Configuration, Team Distribution, Reference, Environment Variables, Troubleshooting

---

## Table of Contents

1. [Overview](#overview)
2. [Agent and Tab Support](#agent-and-tab-support)
3. [Quickstart](#quickstart)
4. [Hook Types](#hook-types)
   - [Command-Based Hooks](#command-based-hooks)
   - [Prompt-Based Hooks](#prompt-based-hooks)
5. [Examples](#examples)
   - [Basic Hooks Configuration](#basic-hooks-configuration)
   - [TypeScript Stop Automation Hook](#typescript-stop-automation-hook)
   - [Python Manifest Guard Hook](#python-manifest-guard-hook)
6. [Partner Integrations](#partner-integrations)
7. [Configuration](#configuration)
   - [Configuration File](#configuration-file)
   - [Global Configuration Options](#global-configuration-options)
   - [Per-Script Configuration Options](#per-script-configuration-options)
   - [Matcher Configuration](#matcher-configuration)
8. [Team Distribution](#team-distribution)
9. [Reference](#reference)
   - [Common Schema](#common-schema)
   - [Hook Events](#hook-events)
10. [Environment Variables](#environment-variables)
11. [Troubleshooting](#troubleshooting)

---

## Overview

Hooks let you observe, control, and extend the agent loop using custom scripts. Hooks are spawned processes that communicate over stdio using JSON in both directions. They run before or after defined stages of the agent loop and can observe, block, or modify behavior.

**With hooks, you can:**

- Run formatters after edits
- Add analytics for events
- Scan for PII or secrets
- Gate risky operations (e.g., SQL writes)
- Control subagent (Task tool) execution
- Inject context at session start

---

## Agent and Tab Support

Hooks work with both **Cursor Agent** (Cmd+K/Agent Chat) and **Cursor Tab** (inline completions), but they use different hook events.

### Agent Hooks (Cmd+K/Agent Chat)

| Hook | Description |
|------|-------------|
| `sessionStart` / `sessionEnd` | Session lifecycle management |
| `preToolUse` / `postToolUse` / `postToolUseFailure` | Generic tool use hooks (fires for all tools) |
| `subagentStart` / `subagentStop` | Subagent (Task tool) lifecycle |
| `beforeShellExecution` / `afterShellExecution` | Control shell commands |
| `beforeMCPExecution` / `afterMCPExecution` | Control MCP tool usage |
| `beforeReadFile` / `afterFileEdit` | Control file access and edits |
| `beforeSubmitPrompt` | Validate prompts before submission |
| `preCompact` | Observe context window compaction |
| `stop` | Handle agent completion |
| `afterAgentResponse` / `afterAgentThought` | Track agent responses |

### Tab Hooks (Inline Completions)

| Hook | Description |
|------|-------------|
| `beforeTabFileRead` | Control file access for Tab completions |
| `afterTabFileEdit` | Post-process Tab edits |

These separate hooks allow different policies for autonomous Tab operations versus user-directed Agent operations.

---

## Quickstart

Create a `hooks.json` file at either:
- **Project level:** `<project>/.cursor/hooks.json` (applies only to that project)
- **User level:** `~/.cursor/hooks.json` (applies globally)

### User Hooks (~/.cursor/)

Create `~/.cursor/hooks.json`:

```json
{
  "version": 1,
  "hooks": {
    "afterFileEdit": [{ "command": "./hooks/format.sh" }]
  }
}
```

Create your hook script at `~/.cursor/hooks/format.sh`:

```bash
#!/bin/bash
# Read input, do something, exit 0
cat > /dev/null
exit 0
```

Make it executable:

```bash
chmod +x ~/.cursor/hooks/format.sh
```

### Project Hooks (.cursor/)

Create `<project>/.cursor/hooks.json`:

```json
{
  "version": 1,
  "hooks": {
    "afterFileEdit": [{ "command": ".cursor/hooks/format.sh" }]
  }
}
```

> **Note:** Project hooks run from the **project root**, so use `.cursor/hooks/format.sh` (not `./hooks/format.sh`).

Cursor watches hooks config files and reloads them automatically.

---

## Hook Types

Hooks support two execution types: **command-based** (default) and **prompt-based** (LLM-evaluated).

### Command-Based Hooks

Command hooks execute shell scripts that receive JSON input via stdin and return JSON output via stdout.

```json
{
  "hooks": {
    "beforeShellExecution": [
      {
        "command": "./scripts/approve-network.sh",
        "timeout": 30,
        "matcher": "curl|wget|nc"
      }
    ]
  }
}
```

**Exit code behavior:**

| Exit Code | Behavior |
|-----------|----------|
| `0` | Hook succeeded, use the JSON output |
| `2` | Block the action (equivalent to `permission: "deny"`) |
| Other | Hook failed, action proceeds (fail-open by default) |

### Prompt-Based Hooks

Prompt hooks use an LLM to evaluate a natural language condition. Useful for policy enforcement without writing custom scripts.

```json
{
  "hooks": {
    "beforeShellExecution": [
      {
        "type": "prompt",
        "prompt": "Does this command look safe to execute? Only allow read-only operations.",
        "timeout": 10
      }
    ]
  }
}
```

**Features:**

- Returns structured `{ ok: boolean, reason?: string }` response
- Uses a fast model for quick evaluation
- `$ARGUMENTS` placeholder is auto-replaced with hook input JSON
- If `$ARGUMENTS` is absent, hook input is auto-appended
- Optional `model` field to override the default LLM model

---

## Examples

### Basic Hooks Configuration

```json
{
  "version": 1,
  "hooks": {
    "sessionStart": [{ "command": "./hooks/session-init.sh" }],
    "sessionEnd": [{ "command": "./hooks/audit.sh" }],
    "beforeShellExecution": [
      { "command": "./hooks/audit.sh" },
      { "command": "./hooks/block-git.sh" }
    ],
    "beforeMCPExecution": [{ "command": "./hooks/audit.sh" }],
    "afterShellExecution": [{ "command": "./hooks/audit.sh" }],
    "afterMCPExecution": [{ "command": "./hooks/audit.sh" }],
    "afterFileEdit": [{ "command": "./hooks/audit.sh" }],
    "beforeSubmitPrompt": [{ "command": "./hooks/audit.sh" }],
    "preCompact": [{ "command": "./hooks/audit.sh" }],
    "stop": [{ "command": "./hooks/audit.sh" }],
    "beforeTabFileRead": [{ "command": "./hooks/redact-secrets-tab.sh" }],
    "afterTabFileEdit": [{ "command": "./hooks/format-tab.sh" }]
  }
}
```

### Audit Script Example

```bash
#!/bin/bash
# audit.sh - Writes all JSON input to /tmp/agent-audit.log

json_input=$(cat)
timestamp=$(date '+%Y-%m-%d %H:%M:%S')
mkdir -p "$(dirname /tmp/agent-audit.log)"
echo "[$timestamp] $json_input" >> /tmp/agent-audit.log
exit 0
```

### Block Git Commands Script

```bash
#!/bin/bash
# Hook to block git commands and redirect to gh tool usage

input=$(cat)
command=$(echo "$input" | jq -r '.command // empty')

if [[ "$command" =~ git[[:space:]] ]] || [[ "$command" == "git" ]]; then
    cat << EOF
{
  "continue": true,
  "permission": "deny",
  "user_message": "Git command blocked. Please use the GitHub CLI (gh) tool instead.",
  "agent_message": "The git command '$command' has been blocked by a hook."
}
EOF
elif [[ "$command" =~ gh[[:space:]] ]] || [[ "$command" == "gh" ]]; then
    cat << EOF
{
  "continue": true,
  "permission": "ask",
  "user_message": "GitHub CLI command requires permission: $command"
}
EOF
else
    cat << EOF
{
  "continue": true,
  "permission": "allow"
}
EOF
fi
```

### TypeScript Stop Automation Hook

Choose TypeScript when you need typed JSON, durable file I/O, and HTTP calls. This Bun-powered `stop` hook tracks per-conversation failure counts and can automatically schedule retries.

**hooks.json:**

```json
{
  "version": 1,
  "hooks": {
    "stop": [{ "command": "bun run .cursor/hooks/track-stop.ts --stop" }]
  }
}
```

**.cursor/hooks/track-stop.ts:**

```typescript
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { stdin } from 'bun';

type StopHookInput = {
  conversation_id: string;
  generation_id: string;
  model: string;
  status: 'completed' | 'aborted' | 'error';
  loop_count: number;
};

type StopHookOutput = {
  followup_message?: string;
};

type MetricsEntry = {
  lastStatus: StopHookInput['status'];
  errorCount: number;
  lastUpdatedIso: string;
};

type MetricsStore = Record<string, MetricsEntry>;

const STATE_DIR = '.cursor/hooks/state';
const METRICS_PATH = `${STATE_DIR}/agent-metrics.json`;
const TELEMETRY_URL = Bun.env.AGENT_TELEMETRY_URL;

async function parseHookInput<T>(): Promise<T> {
  const text = await stdin.text();
  return JSON.parse(text) as T;
}

async function readMetrics(): Promise<MetricsStore> {
  try {
    return JSON.parse(await readFile(METRICS_PATH, 'utf8')) as MetricsStore;
  } catch {
    return {};
  }
}

async function writeMetrics(store: MetricsStore) {
  await mkdir(STATE_DIR, { recursive: true });
  await writeFile(METRICS_PATH, JSON.stringify(store, null, 2), 'utf8');
}

async function sendTelemetry(payload: StopHookInput, entry: MetricsEntry) {
  if (!TELEMETRY_URL) return;
  await fetch(TELEMETRY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationId: payload.conversation_id,
      generationId: payload.generation_id,
      model: payload.model,
      status: payload.status,
      errorCount: entry.errorCount,
      loopCount: payload.loop_count,
      timestamp: entry.lastUpdatedIso
    })
  });
}

async function main() {
  const payload = await parseHookInput<StopHookInput>();
  const metrics = await readMetrics();
  const entry = metrics[payload.conversation_id] ?? {
    lastStatus: payload.status,
    errorCount: 0,
    lastUpdatedIso: ''
  };

  entry.lastStatus = payload.status;
  entry.lastUpdatedIso = new Date().toISOString();
  entry.errorCount = payload.status === 'error' ? entry.errorCount + 1 : 0;

  metrics[payload.conversation_id] = entry;
  await writeMetrics(metrics);
  await sendTelemetry(payload, entry);

  const response: StopHookOutput = {};
  if (entry.errorCount >= 2 && payload.loop_count < 4) {
    response.followup_message =
      'Automated retry triggered after two failures. Double-check credentials before running again.';
  }

  process.stdout.write(JSON.stringify(response) + '\n');
}

main().catch(error => {
  console.error('[stop hook] failed', error);
  process.stdout.write('{}\n');
});
```

### Python Manifest Guard Hook

Python shines when you need rich parsing libraries. This hook uses `pyyaml` to inspect Kubernetes manifests before `kubectl apply` runs.

**hooks.json:**

```json
{
  "version": 1,
  "hooks": {
    "beforeShellExecution": [{ "command": "python3 .cursor/hooks/kube_guard.py" }]
  }
}
```

**.cursor/hooks/kube_guard.py:**

```python
#!/usr/bin/env python3
import json
import shlex
import sys
from pathlib import Path
import yaml

SENSITIVE_NAMESPACES = {"prod", "production"}

def main() -> None:
    payload = json.load(sys.stdin)
    command = payload.get("command", "")
    cwd = Path(payload.get("cwd") or ".")
    response = {"continue": True, "permission": "allow"}

    try:
        args = shlex.split(command)
    except ValueError:
        print(json.dumps(response))
        return

    if len(args) < 2 or args[0] != "kubectl" or args[1] != "apply" or "-f" not in args:
        print(json.dumps(response))
        return

    f_index = args.index("-f")
    if f_index + 1 >= len(args):
        print(json.dumps(response))
        return

    manifest_arg = args[f_index + 1]
    manifest_path = (cwd / manifest_arg).resolve()

    if not manifest_path.exists():
        print(json.dumps(response))
        return

    cli_namespace = None
    for i, arg in enumerate(args):
        if arg in ("-n", "--namespace") and i + 1 < len(args):
            cli_namespace = args[i + 1]
        elif arg.startswith("--namespace="):
            cli_namespace = arg.split("=", 1)[1]

    try:
        documents = list(yaml.safe_load_all(manifest_path.read_text()))
    except (OSError, yaml.YAMLError) as exc:
        sys.stderr.write(f"Failed to read/parse {manifest_path}: {exc}\n")
        print(json.dumps(response))
        return

    if cli_namespace in SENSITIVE_NAMESPACES or any(
        (doc or {}).get("metadata", {}).get("namespace") in SENSITIVE_NAMESPACES
        for doc in documents
    ):
        response.update({
            "permission": "ask",
            "user_message": "kubectl apply to prod requires manual approval.",
            "agent_message": f"{manifest_path.name} includes protected namespaces."
        })

    print(json.dumps(response))

if __name__ == "__main__":
    main()
```

---

## Partner Integrations

Cursor partners with ecosystem vendors who have built hooks support.

### MCP Governance and Visibility

| Partner | Description |
|---------|-------------|
| [MintMCP](https://www.mintmcp.com/blog/mcp-governance-cursor-hooks) | Build inventory of MCP servers, monitor tool usage, scan responses for sensitive data |
| [Oasis Security](https://www.oasis.security/blog/cursor-oasis-governing-agentic-access) | Enforce least-privilege policies on AI agent actions with full audit trails |
| [Runlayer](https://www.runlayer.com/blog/cursor-hooks) | Wrap MCP tools with centralized control and visibility |

### Code Security and Best Practices

| Partner | Description |
|---------|-------------|
| [Corridor](https://corridor.dev/blog/corridor-cursor-hooks/) | Real-time feedback on code implementation and security design |
| [Semgrep](https://semgrep.dev/blog/2025/cursor-hooks-mcp-server) | Scan AI-generated code for vulnerabilities with real-time feedback |

### Dependency Security

| Partner | Description |
|---------|-------------|
| [Endor Labs](https://www.endorlabs.com/learn/bringing-malware-detection-into-ai-coding-workflows-with-cursor-hooks) | Intercept package installations and scan for malicious dependencies |

### Agent Security and Safety

| Partner | Description |
|---------|-------------|
| [Snyk](https://snyk.io/blog/evo-agent-guard-cursor-integration/) | Review agent actions in real-time with Evo Agent Guard |

### Secrets Management

| Partner | Description |
|---------|-------------|
| [1Password](https://marketplace.1password.com/integration/cursor-hooks) | Validate 1Password Environments are mounted before shell commands execute |

---

## Configuration

Define hooks in a `hooks.json` file. Configuration can exist at multiple levels with priority order (highest to lowest):

**Enterprise → Team → Project → User**

### Configuration Locations

| Level | Path | Description |
|-------|------|-------------|
| **Enterprise** | macOS: `/Library/Application Support/Cursor/hooks.json`<br>Linux/WSL: `/etc/cursor/hooks.json`<br>Windows: `C:\ProgramData\Cursor\hooks.json` | MDM-managed, system-wide |
| **Team** | Cloud-distributed via [web dashboard](https://cursor.com/dashboard?tab=team-content&section=hooks) | Enterprise only |
| **Project** | `<project-root>/.cursor/hooks.json` | Checked into version control |
| **User** | `~/.cursor/hooks.json` | User-specific |

### Working Directory by Hook Source

| Hook Source | Working Directory |
|-------------|-------------------|
| Project hooks | Project root |
| User hooks | `~/.cursor/` |
| Enterprise hooks | Enterprise config directory |
| Team hooks | Managed hooks directory |

### Configuration File

```json
{
  "version": 1,
  "hooks": {
    "sessionStart": [{ "command": "./session-init.sh" }],
    "sessionEnd": [{ "command": "./audit.sh" }],
    "preToolUse": [{ "command": "./hooks/validate-tool.sh", "matcher": "Shell|Read|Write" }],
    "postToolUse": [{ "command": "./hooks/audit-tool.sh" }],
    "subagentStart": [{ "command": "./hooks/validate-subagent.sh" }],
    "subagentStop": [{ "command": "./hooks/audit-subagent.sh" }],
    "beforeShellExecution": [{ "command": "./script.sh" }],
    "afterShellExecution": [{ "command": "./script.sh" }],
    "afterMCPExecution": [{ "command": "./script.sh" }],
    "afterFileEdit": [{ "command": "./format.sh" }],
    "preCompact": [{ "command": "./audit.sh" }],
    "stop": [{ "command": "./audit.sh", "loop_limit": 10 }],
    "beforeTabFileRead": [{ "command": "./redact-secrets-tab.sh" }],
    "afterTabFileEdit": [{ "command": "./format-tab.sh" }]
  }
}
```

### Global Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `version` | number | `1` | Config schema version |

### Per-Script Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `command` | string | required | Script path or command |
| `type` | `"command"` \| `"prompt"` | `"command"` | Hook execution type |
| `timeout` | number | platform default | Execution timeout in seconds |
| `loop_limit` | number \| null | `5` | Per-script loop limit for stop/subagentStop hooks. `null` = no limit |
| `failClosed` | boolean | `false` | When `true`, hook failures block the action instead of allowing it |
| `matcher` | string | - | Regex pattern to filter when hook runs |

### Matcher Configuration

Matchers filter when a hook runs based on different fields depending on the hook:

```json
{
  "hooks": {
    "preToolUse": [{ "command": "./validate-shell.sh", "matcher": "Shell" }],
    "subagentStart": [{ "command": "./validate-explore.sh", "matcher": "explore|shell" }],
    "beforeShellExecution": [{ "command": "./approve-network.sh", "matcher": "curl|wget|nc" }]
  }
}
```

**Available matchers by hook:**

| Hook | Matches Against |
|------|-----------------|
| `preToolUse` / `postToolUse` / `postToolUseFailure` | Tool type: `Shell`, `Read`, `Write`, `Grep`, `Delete`, `Task`, `MCP:<tool_name>` |
| `subagentStart` / `subagentStop` | Subagent type: `generalPurpose`, `explore`, `shell`, etc. |
| `beforeShellExecution` / `afterShellExecution` | Full command string |
| `beforeReadFile` | Tool type: `TabRead`, `Read`, etc. |
| `afterFileEdit` | Tool type: `TabWrite`, `Write`, etc. |
| `beforeSubmitPrompt` | Value `UserPromptSubmit` |
| `stop` | Value `Stop` |
| `afterAgentResponse` | Value `AgentResponse` |
| `afterAgentThought` | Value `AgentThought` |

---

## Team Distribution

### Project Hooks (Version Control)

Place `hooks.json` at `<project-root>/.cursor/hooks.json` and commit to version control.

**Benefits:**
- Stored alongside code
- Automatically load for all team members in trusted workspaces
- Can be project-specific
- Require workspace trust for security

### MDM Distribution

Distribute hooks via Mobile Device Management tools.

**User home directory (per-user):**
- `~/.cursor/hooks.json`
- `~/.cursor/hooks/` (scripts)

**Global directories (system-wide):**
- macOS: `/Library/Application Support/Cursor/hooks.json`
- Linux/WSL: `/etc/cursor/hooks.json`
- Windows: `C:\ProgramData\Cursor\hooks.json`

### Cloud Distribution (Enterprise Only)

Configure hooks in the [web dashboard](https://cursor.com/dashboard?tab=team-content&section=hooks) for automatic sync to all team members.

**Features:**
- Automatic synchronization every 30 minutes
- Operating system targeting for platform-specific hooks
- Centralized dashboard management

---

## Reference

### Common Schema

#### Input (All Hooks)

All hooks receive these base fields plus hook-specific fields:

```json
{
  "conversation_id": "string",
  "generation_id": "string",
  "model": "string",
  "hook_event_name": "string",
  "cursor_version": "string",
  "workspace_roots": ["<path>"],
  "user_email": "string | null",
  "transcript_path": "string | null"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `conversation_id` | string | Stable ID across many turns |
| `generation_id` | string | Changes with every user message |
| `model` | string | Model configured for the composer |
| `hook_event_name` | string | Which hook is being run |
| `cursor_version` | string | Cursor version (e.g. "1.7.2") |
| `workspace_roots` | string[] | Root folders in workspace |
| `user_email` | string \| null | Authenticated user email |
| `transcript_path` | string \| null | Path to conversation transcript |

### Hook Events

#### preToolUse

Called before any tool execution. Use matchers to filter by specific tools.

**Input:**
```json
{
  "tool_name": "Shell",
  "tool_input": { "command": "npm install", "working_directory": "/project" },
  "tool_use_id": "abc123",
  "cwd": "/project",
  "model": "claude-sonnet-4-20250514",
  "agent_message": "Installing dependencies..."
}
```

**Output:**
```json
{
  "permission": "allow | deny",
  "user_message": "<message shown when denied>",
  "agent_message": "<message sent to agent when denied>",
  "updated_input": { "command": "npm ci" }
}
```

#### postToolUse

Called after successful tool execution. Useful for auditing, analytics, and injecting context.

**Input:**
```json
{
  "tool_name": "Shell",
  "tool_input": { "command": "npm test" },
  "tool_output": "{\"exitCode\":0,\"stdout\":\"All tests passed\"}",
  "tool_use_id": "abc123",
  "cwd": "/project",
  "duration": 5432,
  "model": "claude-sonnet-4-20250514"
}
```

**Output:**
```json
{
  "updated_mcp_tool_output": { "modified": "output" },
  "additional_context": "Test coverage report attached."
}
```

#### postToolUseFailure

Called when a tool fails, times out, or is denied.

**Input:**
```json
{
  "tool_name": "Shell",
  "tool_input": { "command": "npm test" },
  "tool_use_id": "abc123",
  "cwd": "/project",
  "error_message": "Command timed out after 30s",
  "failure_type": "timeout | error | permission_denied",
  "duration": 5000,
  "is_interrupt": false
}
```

#### subagentStart

Called before spawning a subagent (Task tool).

**Input:**
```json
{
  "subagent_id": "abc-123",
  "subagent_type": "generalPurpose",
  "task": "Explore the authentication flow",
  "parent_conversation_id": "conv-456",
  "tool_call_id": "tc-789",
  "subagent_model": "claude-sonnet-4-20250514",
  "is_parallel_worker": false,
  "git_branch": "feature/auth"
}
```

**Output:**
```json
{
  "permission": "allow | deny",
  "user_message": "<message shown when denied>"
}
```

#### subagentStop

Called when a subagent completes, errors, or is aborted.

**Input:**
```json
{
  "subagent_type": "generalPurpose",
  "status": "completed | error | aborted",
  "task": "Explore the authentication flow",
  "description": "Exploring auth flow",
  "summary": "<subagent output summary>",
  "duration_ms": 45000,
  "message_count": 12,
  "tool_call_count": 8,
  "loop_count": 0,
  "modified_files": ["src/auth.ts"],
  "agent_transcript_path": "/path/to/subagent/transcript.txt"
}
```

**Output:**
```json
{
  "followup_message": "<auto-continue with this message>"
}
```

#### beforeShellExecution / beforeMCPExecution

Called before shell command or MCP tool execution. Return a permission decision.

**beforeShellExecution Input:**
```json
{
  "command": "<full terminal command>",
  "cwd": "<current working directory>",
  "sandbox": false
}
```

**beforeMCPExecution Input:**
```json
{
  "tool_name": "<tool name>",
  "tool_input": "<json params>",
  "url": "<server url>"
}
```

**Output:**
```json
{
  "permission": "allow | deny | ask",
  "user_message": "<message shown in client>",
  "agent_message": "<message sent to agent>"
}
```

> Set `failClosed: true` on hook definition to block on failure instead of fail-open.

#### afterShellExecution

Fires after a shell command executes.

**Input:**
```json
{
  "command": "<full terminal command>",
  "output": "<full terminal output>",
  "duration": 1234,
  "sandbox": false
}
```

#### afterMCPExecution

Fires after an MCP tool executes.

**Input:**
```json
{
  "tool_name": "<tool name>",
  "tool_input": "<json params>",
  "result_json": "<tool result json>",
  "duration": 1234
}
```

#### afterFileEdit

Fires after the Agent edits a file.

**Input:**
```json
{
  "file_path": "<absolute path>",
  "edits": [{ "old_string": "<search>", "new_string": "<replace>" }]
}
```

#### beforeReadFile

Called before Agent reads a file. Use for access control.

**Input:**
```json
{
  "file_path": "<absolute path>",
  "content": "<file contents>",
  "attachments": [{ "type": "file | rule", "file_path": "<absolute path>" }]
}
```

**Output:**
```json
{
  "permission": "allow | deny",
  "user_message": "<message shown when denied>"
}
```

#### beforeTabFileRead

Called before Tab reads a file. Only triggered by Tab, not Agent.

**Input:**
```json
{
  "file_path": "<absolute path>",
  "content": "<file contents>"
}
```

**Output:**
```json
{
  "permission": "allow | deny"
}
```

#### afterTabFileEdit

Called after Tab edits a file. Includes detailed edit information.

**Input:**
```json
{
  "file_path": "<absolute path>",
  "edits": [{
    "old_string": "<search>",
    "new_string": "<replace>",
    "range": {
      "start_line_number": 10,
      "start_column": 5,
      "end_line_number": 10,
      "end_column": 20
    },
    "old_line": "<line before edit>",
    "new_line": "<line after edit>"
  }]
}
```

#### beforeSubmitPrompt

Called after user hits send but before backend request.

**Input:**
```json
{
  "prompt": "<user prompt text>",
  "attachments": [{ "type": "file | rule", "file_path": "<absolute path>" }]
}
```

**Output:**
```json
{
  "continue": true | false,
  "user_message": "<message shown when blocked>"
}
```

#### afterAgentResponse

Called after the agent completes an assistant message.

**Input:**
```json
{
  "text": "<assistant final text>"
}
```

#### afterAgentThought

Called after the agent completes a thinking block.

**Input:**
```json
{
  "text": "<fully aggregated thinking text>",
  "duration_ms": 5000
}
```

#### stop

Called when the agent loop ends. Can auto-submit follow-up messages.

**Input:**
```json
{
  "status": "completed | aborted | error",
  "loop_count": 0
}
```

**Output:**
```json
{
  "followup_message": "<message text>"
}
```

- `loop_count` indicates how many times the stop hook has already triggered a follow-up (starts at 0)
- Default limit is 5 auto follow-ups per script (configurable via `loop_limit`)

#### sessionStart

Called when a new composer conversation is created. Fire-and-forget; does not block.

**Input:**
```json
{
  "session_id": "<unique session identifier>",
  "is_background_agent": true | false,
  "composer_mode": "agent | ask | edit"
}
```

**Output:**
```json
{
  "env": { "<key>": "<value>" },
  "additional_context": "<context to add to conversation>"
}
```

#### sessionEnd

Called when a composer conversation ends. Fire-and-forget for logging/cleanup.

**Input:**
```json
{
  "session_id": "<unique session identifier>",
  "reason": "completed | aborted | error | window_close | user_close",
  "duration_ms": 45000,
  "is_background_agent": true | false,
  "final_status": "<status string>",
  "error_message": "<error details if reason is 'error'>"
}
```

#### preCompact

Called before context window compaction. Observational only; cannot block.

**Input:**
```json
{
  "trigger": "auto | manual",
  "context_usage_percent": 85,
  "context_tokens": 120000,
  "context_window_size": 128000,
  "message_count": 45,
  "messages_to_compact": 30,
  "is_first_compaction": true | false
}
```

**Output:**
```json
{
  "user_message": "<message to show when compaction occurs>"
}
```

---

## Environment Variables

Hook scripts receive these environment variables:

| Variable | Description | Always Present |
|----------|-------------|----------------|
| `CURSOR_PROJECT_DIR` | Workspace root directory | Yes |
| `CURSOR_VERSION` | Cursor version string | Yes |
| `CURSOR_USER_EMAIL` | Authenticated user email | If logged in |
| `CURSOR_TRANSCRIPT_PATH` | Path to conversation transcript | If transcripts enabled |
| `CURSOR_CODE_REMOTE` | Set to `"true"` when in remote workspace | For remote workspaces |
| `CLAUDE_PROJECT_DIR` | Alias for project dir (Claude compatibility) | Yes |

Session-scoped environment variables from `sessionStart` hooks are passed to all subsequent hook executions within that session.

---

## Troubleshooting

### How to Confirm Hooks Are Active

- Check the **Hooks tab** in Cursor Settings to debug configured and executed hooks
- Check the **Hooks output channel** to see errors

### If Hooks Are Not Working

1. **Restart Cursor** - Cursor watches `hooks.json` files and reloads on save, but a restart may be needed
2. **Check relative paths** are correct for your hook source:
   - **Project hooks**: Paths relative to project root (e.g., `.cursor/hooks/script.sh`)
   - **User hooks**: Paths relative to `~/.cursor/` (e.g., `./hooks/script.sh`)

### Exit Code Blocking

Exit code `2` from command hooks blocks the action (equivalent to `permission: "deny"`). This matches Claude Code behavior for compatibility.

---

*This summary was automatically generated from https://cursor.com/docs/hooks*
