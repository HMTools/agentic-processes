---
name: process-state-update
description: Update process state files (process.json, memory.json, log.json, pending-interaction.json) via Python scripts. Used by step-executor during execution.
---

# Process State Update

Update process state files via `process_manager.py`. All operations write files directly — the agent never uses Write/Edit on process state files.

## When to Use

- Updating step status during execution
- Recording memory entries after completing work
- Logging actions and user interactions
- Creating or deleting pending interaction files for approval checkpoints

## Available Operations

All operations are invoked via:
```
Bash(python3 ${PLUGIN_ROOT}/scripts/process_manager.py <subcommand> --process-dir <dir> ...)
```

Check stdout for `{"status": "ok", ...}` or `{"status": "error", "message": "..."}`.

---

### update-step-status

Change a step's status in `process.json`. Automatically sets `startedAt` when moving to `in_progress` and `completedAt` when moving to `completed`.

```
python3 ${PLUGIN_ROOT}/scripts/process_manager.py update-step-status \
  --process-dir <dir> \
  --step-id <UUID> \
  --status <pending|in_progress|completed|skipped|awaiting_approval>
```

---

### update-current-state

Update the active step pointer in `process.json`.

```
python3 ${PLUGIN_ROOT}/scripts/process_manager.py update-current-state \
  --process-dir <dir> \
  --step-id <UUID> \
  --step-name "<name>" \
  --summary "<brief summary>" \
  --details "<optional extended details>"
```

---

### add-memory-entry

Add or update a step entry in `memory.json`. If the step already exists, new info/decisions/files are appended.

```
python3 ${PLUGIN_ROOT}/scripts/process_manager.py add-memory-entry \
  --process-dir <dir> \
  --step-id <UUID> \
  --name "<step name>" \
  --info '{"key": "value"}' \
  --decisions '["decision 1", "decision 2"]' \
  --files '["file1.py", "file2.md"]' \
  --status <optional status>
```

---

### add-log-entry

Append actions and reasoning to a step entry in `log.json`.

```
python3 ${PLUGIN_ROOT}/scripts/process_manager.py add-log-entry \
  --process-dir <dir> \
  --step-id <UUID> \
  --actions '["action 1", "action 2"]' \
  --reasoning '["reasoning 1"]' \
  --files-modified '["file1.py"]'
```

---

### log-interaction

Log a user interaction in `log.json`. Also clears the `pending-log` flag (integrates with `enforce-log-first` hook).

```
python3 ${PLUGIN_ROOT}/scripts/process_manager.py log-interaction \
  --process-dir <dir> \
  --step-id <UUID> \
  --request "<what the user said>" \
  --reason "<why they said it>" \
  --response "<what the agent did>"
```

Optional flags: `--for-improvement`, `--potential-improvement "<text>"`

---

### write-pending

Create or delete `pending-interaction.json` for approval checkpoints.

Create:
```
python3 ${PLUGIN_ROOT}/scripts/process_manager.py write-pending \
  --process-dir <dir> \
  --options '[{"id": "approve", "label": "Approve", "isDefault": true}, {"id": "reject", "label": "Reject"}]'
```

Delete:
```
python3 ${PLUGIN_ROOT}/scripts/process_manager.py write-pending \
  --process-dir <dir> \
  --delete
```

---

### update-process-status

Change the top-level process status in `process.json`.

```
python3 ${PLUGIN_ROOT}/scripts/process_manager.py update-process-status \
  --process-dir <dir> \
  --status <running|completed|failed|paused>
```

---

### update-log-observations

Append entries to the `processWideObservations` section of `log.json`. Used by steps like `apply-changes`, `review-verify-document`, and `continuous-improvement` to record cross-step patterns and recommendations.

```
python3 ${PLUGIN_ROOT}/scripts/process_manager.py update-log-observations \
  --process-dir <dir> \
  --patterns '["pattern 1", "pattern 2"]' \
  --feedback '["user feedback summary"]' \
  --metrics '{"key": "value"}' \
  --recommendations '["recommendation 1"]'
```

All flags are optional — only provided fields are appended/merged.

---

## Important Rules

- **Never use Write/Edit** directly on `process.json`, `memory.json`, `log.json`, or `pending-interaction.json`
- Always check stdout for the result status after each command
- All JSON string arguments must be properly escaped for the shell
