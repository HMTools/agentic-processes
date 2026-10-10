---
name: process-state-update
description: Update process state files (process.json, memory/<topic>.json, log.json) with the process tools. ALWAYS use this skill when working with agentic-processes — whenever you need to update step status, record memory, log actions, or modify any process state file. Never use Write/Edit or Bash on process state files. Used by step-executor and process-continue agents.
user-invocable: false
---

# Process State Update

**Critical**: All process state changes go through the process tools of this plugin. The tools are `mcp__agentic-processes__<name>`; this page names them by `<name>`. Never use Write, Edit or Bash on process state files: the plugin refuses it, and a hand edit can corrupt the process.

## When to Use

Use this skill whenever you need to:
- Update step status (pending → in_progress → completed)
- Record memory entries after completing work
- Log actions, reasoning, and user interactions
- Update process-wide status or observations

If you work in the agentic-processes framework and need to change any `.json` file in a process directory, use the tools on this page.

## Finding the tools

The tools are listed when the user starts or resumes a process. They sit behind tool search: search for the tool by its name (for example `update_step_status`), then call it. Each tool answers `{"status": "ok", "files_written": [...]}` or `{"status": "error", "message": "..."}`. Read the message of an error: it says what to do next.

Every tool takes `processDir`, the absolute path of the process folder (for example `~/.claude/agentic-processes/active/process-name`, written out in full), except `list_findings` and `update_finding_status`. Lists and objects are real values, not JSON text.

---

## Available Tools

### update_step_status

Change a step's status in `process.json`. It sets `startedAt` when the step moves to `in_progress` and `completedAt` when it moves to `completed`.

| Input | Required | Description |
|-------|----------|-------------|
| `processDir` | Yes | Process folder |
| `stepId` | Yes | Step id (UUID) |
| `status` | Yes | `pending`, `in_progress`, `completed`, `skipped` or `awaiting_approval` |

**Note**: A step with `approvalRequired: true` cannot be completed until the user approved it. The user approves with a click in the dialog that the tool `request_approval` opens. If the step is not approved, this tool answers an error.

---

### update_current_state

Set the active step in `process.json`, with the substep if the step has substeps.

| Input | Required | Description |
|-------|----------|-------------|
| `processDir` | Yes | Process folder |
| `stepId`, `stepName` | Yes | The active step |
| `summary` | Yes | What the step does now |
| `details` | No | More detail |
| `totalSubsteps` | No | Number of substeps (default 0) |
| `substepNumber`, `substepName` | No | The current substep, 1-based; give both |

---

### update_active_substep

Change only the substep of the active step, when the step itself did not change.

| Input | Required | Description |
|-------|----------|-------------|
| `processDir` | Yes | Process folder |
| `substepNumber` | Yes | Current substep, 1-based |
| `substepName` | Yes | Name of the substep |
| `summary` | No | New action summary |

---

### add_memory_entry

Add or update what a step produced in `memory/<topic>.json`. If the step already has an entry in that topic, the decisions and files are appended and the information is merged. The tool also updates `memory/_cross-references.json`. The step name comes from `process.json`.

| Input | Required | Description |
|-------|----------|-------------|
| `processDir`, `stepId` | Yes | Process folder and step |
| `topic` | Yes | Topic file name, lowercase with hyphens: `context`, `identified-files`, `implementation-decisions` |
| `info` | No | Object: information produced |
| `decisions` | No | List of decisions made |
| `files` | No | List of files modified or created |

A step can write only the topics in its `memoryFileUsage.writeTo`. An empty list means no limit.

---

### read_memory_topic

Read a memory topic file. A step can read only the topics in its `memoryFileUsage.readFrom`. `_cross-references` is always readable.

| Input | Required | Description |
|-------|----------|-------------|
| `processDir`, `stepId` | Yes | Process folder and step (for the access check) |
| `topic` | Yes | Topic name |

The answer is `{"status": "ok", "topic": "context", "data": {...}}`, or `"data": null` when the file does not exist.

---

### add_log_entry

Append to the entry of a step in `log.json`. Only the inputs you give are appended.

| Input | Description |
|-------|-------------|
| `processDir`, `stepId` | Required: process folder and step |
| `actions` | List of actions taken |
| `reasoning` | List of reasoning entries |
| `filesModified` | List of file paths modified |
| `problems` | List of problems met (feeds the `continuous-improvement` analysis) |
| `decisions` | List of decisions made |
| `performanceNotes` | List of performance observations |

**Important**: Log every issue, error, workaround or surprise in `problems`. The `continuous-improvement` step reads `problemsEncountered` from the log to find systemic issues and save them as findings (see `write_finding`).

---

### log_interaction

Log a user interaction in `log.json`. The plugin sees this call succeed and stops asking for a log. Do this before anything else changes after a user prompt.

| Input | Required | Description |
|-------|----------|-------------|
| `processDir`, `stepId` | Yes | Process folder and step |
| `request` | Yes | What the user asked |
| `reason` | Yes | Why the user asked |
| `response` | Yes | What you did |
| `forImprovement` | No | `true` when the request points to an improvement of the process |
| `potentialImprovement` | No | The improvement, in words |

---

### update_process_status

Change the status of the process. A finished process moves to its status folder: `completed/`, `failed/`, or back to `active/` for `running` and `paused`. The answer then has `relocated_to`: use that path from then on.

| Input | Required | Description |
|-------|----------|-------------|
| `processDir` | Yes | Process folder |
| `status` | Yes | `running`, `completed`, `failed` or `paused` |
| `summary` | When completing a sub-process | What the sub-process did. The parent reads it. |

---

### register_child_process

Record a sub-process in the parent's `process.json` (`subProcessState.childProcesses`). A child with the same id is updated, not added twice.

| Input | Required | Description |
|-------|----------|-------------|
| `processDir` | Yes | The parent's folder |
| `childId`, `childName` | Yes | The child's id and name |
| `childStatus` | Yes | `running`, `completed`, `failed` or `paused` |
| `spawnedAtStep` | Yes | UUID of the parent step that started the child (not its number) |
| `syncPoint` | Yes | UUID of the parent step that waits for the child |
| `childProcessPath` | Yes | The child's folder |

---

### update_child_status

Change the status of a child in the parent's `process.json`.

| Input | Required | Description |
|-------|----------|-------------|
| `processDir` | Yes | The parent's folder |
| `childId` | Yes | The child's id |
| `childStatus` | Yes | `running`, `completed`, `failed` or `paused` |

---

### update_log_observations

Append to `processWideObservations` in `log.json`. Steps like `apply-changes`, `review-verify-document` and `continuous-improvement` use it for patterns and recommendations. Every input is optional.

| Input | Description |
|-------|-------------|
| `processDir` | Required: process folder |
| `patterns` | List of patterns detected |
| `feedback` | List of user feedback summaries |
| `metrics` | Object of efficiency metrics (merged) |
| `recommendations` | List of recommendations for the future |

---

### create_process

Create the files of a new process from a template. Only the `process-new` skill and its sub-process steps use this.

| Input | Required | Description |
|-------|----------|-------------|
| `processDir` | Yes | The new process folder |
| `templatePath` | Yes | Path to the template JSON |
| `name` | No | Process name; defaults to the template name |
| `params` | No | Object: the parameters of the process |
| `projectPath` | No | Absolute project path; defaults to the session folder |
| `parentProcessPath`, `parentId`, `parentName`, `returnToStep` | No | For a sub-process |

---

### write_finding

Save one improvement finding to the global store (`~/.claude/agentic-processes/improvement-findings/<templateId>/<processId>.json`). Only the `continuous-improvement` step calls it, never a normal work step.

| Input | Required | Description |
|-------|----------|-------------|
| `processDir` | Yes | Process folder |
| `category` | Yes | One of the step's `improvementCategories` names |
| `title` | Yes | Short description |
| `what` | Yes | What the improvement does |
| `why` | Yes | Why it is worth doing |
| `impact` | Yes | Expected impact |
| `scope` | No | List of target file paths |

---

### list_findings

Return the findings of every process. Only the `apply-improvements` skill calls it, never a running process.

| Input | Description |
|-------|-------------|
| `status` | `open`, `applied`, `rejected` or `deferred` |
| `templateId` | Only this template. It is the template's own UUID (the `"id"` of its JSON, or `metadata.templateId` of a process), not its name. Each finding has its readable name in `template`. |

---

### update_finding_status

Record the outcome of a finding. Only the `apply-improvements` skill calls it.

| Input | Required | Description |
|-------|----------|-------------|
| `processId` | Yes | The process UUID. It is enough to find the file. |
| `findingId` | Yes | The finding UUID |
| `status` | Yes | `applied`, `rejected` or `deferred` |
| `notes` | No | Notes |
| `filesModified` | No | List of file paths modified |

---

## Important Rules

1. **Never use Write, Edit or Bash** on `process.json`, `log.json`, `memory/*.json` or the findings store. The plugin refuses it. Use the tools above.
2. **Always read the answer** of each tool: `{"status": "ok"}` is success, `{"status": "error", "message": ...}` says what failed.
3. **Use full paths** for `processDir`. After `update_process_status` moves the folder, use the `relocated_to` path.
4. **Approval is the user's.** Call `request_approval` and wait for the click. Do not try to set `approved` yourself.

---

## Common Mistakes (DO NOT DO THESE)

### [WRONG] Using Write/Edit/Bash on process state files
**WRONG:** `Write(file_path="process.json", content="...")` or `sed -i ... process.json` — the plugin refuses it, and a hand edit can corrupt the state.

**CORRECT:** call the tool for the change: `update_step_status`, `add_memory_entry`, `add_log_entry`, and the others above.

### [WRONG] Building a shell command
**WRONG:** `python3 .../process_manager.py update-step-status ...` — this script no longer exists.

**CORRECT:** call the tool `update_step_status` with `processDir`, `stepId` and `status`.
