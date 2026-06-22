---
name: process-state-update
description: Update process state files (process.json, memory/<topic>.json, log.json, pending-interaction.json) via Python scripts. ALWAYS use this skill when working with agentic-processes — whenever you need to update step status, record memory, log actions, create approval checkpoints, or modify any process state file. Never use Write/Edit tools on process state files. Used by step-executor and process-continue agents.
user-invocable: false
---

# Process State Update

**Critical**: All process state mutations must go through `process_manager.py`. Never use Write/Edit tools on process state files — doing so will corrupt the process state.

## When to Use

Use this skill whenever you need to:
- Update step status (pending → in_progress → completed)
- Record memory entries after completing work
- Log actions, reasoning, and user interactions
- Create or delete pending interaction files for approval checkpoints
- Update process-wide status or observations

If you're working in the agentic-processes framework and need to modify any `.json` file in a process directory, you MUST use this skill.

## Locating the Script

The `process_manager.py` script is located at: `C:/Projects/HM/agentic-processes/scripts/process_manager.py`

**For Bash**: Use forward slashes and the `/c/` drive prefix:
```bash
python3 /c/Projects/HM/agentic-processes/scripts/process_manager.py <subcommand> ...
```

**For PowerShell**: Use the full Windows path with forward slashes:
```powershell
python "C:/Projects/HM/agentic-processes/scripts/process_manager.py" <subcommand> ...
```

Both `python` and `python3` work in this environment. Always check stdout for `{"status": "ok", ...}` or `{"status": "error", "message": "..."}`.

---

## Available Operations

### update-step-status

Change a step's status in `process.json`. Automatically sets `startedAt` when moving to `in_progress` and `completedAt` when moving to `completed`.

**Bash**:
```bash
python3 /c/Projects/HM/agentic-processes/scripts/process_manager.py update-step-status \
  --process-dir "/c/Users/username/.claude/agentic-processes/active/process-name" \
  --step-id "abc-123-uuid" \
  --status in_progress
```

**PowerShell**:
```powershell
python "C:/Projects/HM/agentic-processes/scripts/process_manager.py" update-step-status --process-dir "C:/Users/username/.claude/agentic-processes/active/process-name" --step-id "abc-123-uuid" --status in_progress
```

Valid statuses: `pending`, `in_progress`, `completed`, `skipped`, `awaiting_approval`

**Note**: When completing a step with `approvalRequired: true`, the step must have `approved: true` (set by the user via `/process-approve` or the UI). If not yet approved, this command will fail with a message directing the user to approve first.

---

### update-current-state

Update the active step pointer in `process.json`. Supports optional substep tracking fields.

**Bash**:
```bash
python3 /c/Projects/HM/agentic-processes/scripts/process_manager.py update-current-state \
  --process-dir "/c/Users/username/.claude/agentic-processes/active/process-name" \
  --step-id "abc-123-uuid" \
  --step-name "Verify Changes" \
  --summary "Reviewing applied changes for correctness" \
  --total-substeps 10 \
  --substep-number 3 \
  --substep-name "Review Each File Systematically"
```

**PowerShell**:
```powershell
python "C:/Projects/HM/agentic-processes/scripts/process_manager.py" update-current-state --process-dir "C:/Users/username/.claude/agentic-processes/active/process-name" --step-id "abc-123-uuid" --step-name "Verify Changes" --summary "Reviewing applied changes" --total-substeps 10
```

**Optional substep args** (provide `--substep-number` and `--substep-name` together):
| Flag | Description |
|------|-------------|
| `--total-substeps` | Total number of substeps in the step (integer) |
| `--substep-number` | Current substep number, 1-based (integer) |
| `--substep-name` | Name of the current substep (string) |

---

### update-active-substep

Update only the active substep cursor within the current step, without re-specifying step identity fields. Use this for efficient substep-only updates when the step itself hasn't changed.

**Bash**:
```bash
python3 /c/Projects/HM/agentic-processes/scripts/process_manager.py update-active-substep \
  --process-dir "/c/Users/username/.claude/agentic-processes/active/process-name" \
  --substep-number 4 \
  --substep-name "Categorize and Assign Severity to Issues" \
  --summary "Categorizing issues found during review"
```

**PowerShell**:
```powershell
python "C:/Projects/HM/agentic-processes/scripts/process_manager.py" update-active-substep --process-dir "C:/Users/username/.claude/agentic-processes/active/process-name" --substep-number 4 --substep-name "Categorize and Assign Severity to Issues"
```

**Args**:
| Flag | Required | Description |
|------|----------|-------------|
| `--process-dir` | Yes | Process directory path |
| `--substep-number` | Yes | Current substep number, 1-based (integer) |
| `--substep-name` | Yes | Name of the current substep (string) |
| `--summary` | No | Optionally update the actionSummary |

---

### track-file-change

Track a file operation in `currentState.activeStep.filesChanged`. Called automatically by the PostToolUse hook -- agents do not call this directly. Uses upsert-by-path: at most one entry per unique file path, latest operation always wins.

**Bash**:
```bash
python3 /c/Projects/HM/agentic-processes/scripts/process_manager.py track-file-change \
  --process-dir "/c/Users/username/.claude/agentic-processes/active/process-name" \
  --file-path "/c/Projects/myproject/src/app.ts" \
  --operation edited \
  --tool Edit
```

**PowerShell**:
```powershell
python "C:/Projects/HM/agentic-processes/scripts/process_manager.py" track-file-change --process-dir "C:/Users/username/.claude/agentic-processes/active/process-name" --file-path "C:/Projects/myproject/src/app.ts" --operation edited --tool Edit
```

**Args**:
| Flag | Required | Description |
|------|----------|-------------|
| `--process-dir` | Yes | Process directory path |
| `--file-path` | Yes | Absolute path of the changed file |
| `--operation` | Yes | One of: `created`, `edited`, `deleted` |
| `--tool` | Yes | Tool name that performed the operation (Write, Edit, etc.) |

**Note**: This is called by the PostToolUse hook script (`track-file-change.sh`), not by agents directly. The hook fires on every Write, Edit, or StrReplace tool use and records the file change in the active step.

---

### add-memory-entry

Add or update a step entry in a memory topic file (`memory/<topic>.json`). If the step already exists in that topic file, new info/decisions/files are appended. Also updates `memory/_cross-references.json` with any new decisions and files.

**Bash**:
```bash
python3 /c/Projects/HM/agentic-processes/scripts/process_manager.py add-memory-entry \
  --process-dir "/c/Users/username/.claude/agentic-processes/active/process-name" \
  --step-id "abc-123-uuid" \
  --topic context \
  --info '{"approach": "reviewed user docs", "constraints": "must preserve API compatibility"}' \
  --decisions '["Use incremental migration", "Maintain backward compatibility"]' \
  --files '["api.py", "migration.sql"]'
```

**PowerShell**:
```powershell
python "C:/Projects/HM/agentic-processes/scripts/process_manager.py" add-memory-entry --process-dir "C:/Users/username/.claude/agentic-processes/active/process-name" --step-id "abc-123-uuid" --topic context --info '{\"approach\": \"reviewed user docs\"}' --decisions '[\"Use incremental migration\"]' --files '[\"api.py\"]'
```

**Topic naming convention**: lowercase, hyphen-separated, describes the data content. Examples: `context`, `identified-files`, `implementation-decisions`, `findings`, `qa-sessions`.

**Note**: The `--topic` argument specifies which memory file to write to. The step name is auto-resolved from process.json. In PowerShell, escape inner quotes with backslash: `'{\"key\": \"value\"}'`

---

### read-memory-topic

Read a specific memory topic file with access validation. The step's `memoryFileUsage.readFrom` is checked to ensure access is allowed. `_cross-references` is always readable.

**Bash**:
```bash
python3 /c/Projects/HM/agentic-processes/scripts/process_manager.py read-memory-topic \
  --process-dir "/c/Users/username/.claude/agentic-processes/active/process-name" \
  --step-id "abc-123-uuid" \
  --topic context
```

**PowerShell**:
```powershell
python "C:/Projects/HM/agentic-processes/scripts/process_manager.py" read-memory-topic --process-dir "C:/Users/username/.claude/agentic-processes/active/process-name" --step-id "abc-123-uuid" --topic context
```

Returns `{"status": "ok", "topic": "context", "data": {...}}` or `{"status": "ok", "topic": "context", "data": null}` if file doesn't exist.

---

### add-log-entry

Append actions, reasoning, problems, decisions, and performance notes to a step entry in `log.json`.

**Bash**:
```bash
python3 /c/Projects/HM/agentic-processes/scripts/process_manager.py add-log-entry \
  --process-dir "/c/Users/username/.claude/agentic-processes/active/process-name" \
  --step-id "abc-123-uuid" \
  --actions '["Modified API endpoint", "Updated tests", "Added migration script"]' \
  --reasoning '["Preserve backward compatibility", "Cover new edge cases"]' \
  --files-modified '["api.py", "test_api.py", "migrate.py"]' \
  --problems '["File conflict in api.py required manual resolution", "Test timeout on slow CI"]' \
  --decisions '["Used incremental migration strategy", "Deferred index rebuild to off-hours"]' \
  --performance-notes '["Step completed in 2 iterations instead of expected 1"]'
```

**Available flags** (all optional — only provided fields are appended):
| Flag | Description |
|------|-------------|
| `--actions` | JSON array of actions taken during the step |
| `--reasoning` | JSON array of agent reasoning entries |
| `--files-modified` | JSON array of file paths modified |
| `--problems` | JSON array of problems encountered (feeds `continuous-improvement` analysis) |
| `--decisions` | JSON array of decisions made during the step |
| `--performance-notes` | JSON array of performance observations |

**Important**: Use `--problems` to log any issues, errors, workarounds, or unexpected situations encountered during step execution. The `continuous-improvement` step reads `problemsEncountered` from the log to identify systemic issues and propose fixes.

---

### log-interaction

Log a user interaction in `log.json`. Also clears the `pending-log` flag (integrates with `enforce-log-first` hook).

**Bash**:
```bash
python3 /c/Projects/HM/agentic-processes/scripts/process_manager.py log-interaction \
  --process-dir "/c/Users/username/.claude/agentic-processes/active/process-name" \
  --step-id "abc-123-uuid" \
  --request "User asked to skip validation step" \
  --reason "User is confident changes are correct" \
  --response "Skipped validation, moved to deployment"
```

Optional flags: `--for-improvement`, `--potential-improvement "Add auto-validation option"`

---

### write-pending

**CRITICAL: Use this operation to create approval checkpoints. DO NOT create `pending-interaction.json` files directly with Write/Edit/PowerShell. That violates the core principle of this skill and will corrupt the process state.**

Create or delete `pending-interaction.json` for approval checkpoints. This operation ensures the correct schema and structure.

**Create approval checkpoint (Bash)**:
```bash
python3 /c/Projects/HM/agentic-processes/scripts/process_manager.py write-pending \
  --process-dir "/c/Users/username/.claude/agentic-processes/active/process-name" \
  --options '[{"id": "approve", "label": "Approve Changes", "isDefault": true}, {"id": "reject", "label": "Reject"}, {"id": "modify", "label": "Request Modifications"}]'
```

**Create approval checkpoint (PowerShell)**:
```powershell
python "C:/Projects/HM/agentic-processes/scripts/process_manager.py" write-pending --process-dir "C:/Users/username/.claude/agentic-processes/active/process-name" --options '[{\"id\": \"approve\", \"label\": \"Apply Migration\", \"isDefault\": true}, {\"id\": \"reject\", \"label\": \"Cancel\"}]'
```

**Delete pending interaction (Bash)**:
```bash
python3 /c/Projects/HM/agentic-processes/scripts/process_manager.py write-pending \
  --process-dir "/c/Users/username/.claude/agentic-processes/active/process-name" \
  --delete
```

**Example: Database migration approval**
```bash
# CORRECT: Use write-pending operation
python3 /c/Projects/HM/agentic-processes/scripts/process_manager.py write-pending \
  --process-dir "/c/Users/matanha/.claude/agentic-processes/active/process-db-migration" \
  --options '[{"id": "approve", "label": "Apply Migration", "isDefault": true}, {"id": "review", "label": "Review Scripts First"}, {"id": "reject", "label": "Cancel Migration"}]'

# WRONG: Do NOT create the file directly
# [X] DO NOT DO THIS: echo '{"options": [...]}' > pending-interaction.json
# [X] DO NOT DO THIS: ConvertTo-Json | Out-File pending-interaction.json
# [X] DO NOT DO THIS: Write tool on pending-interaction.json
```

---

### update-process-status

Change the top-level process status in `process.json`.

**Bash**:
```bash
python3 /c/Projects/HM/agentic-processes/scripts/process_manager.py update-process-status \
  --process-dir "/c/Users/username/.claude/agentic-processes/active/process-name" \
  --status completed
```

Valid statuses: `running`, `completed`, `failed`, `paused`

---

### register-child-process

Register a child sub-process in the parent's `process.json` `subProcessState.childProcesses` array.
Used when spawning sub-processes to make parent-child relationships visible in the UI diagram.

**Bash**:
```bash
python3 /c/Projects/HM/agentic-processes/scripts/process_manager.py register-child-process \
  --process-dir "/c/Users/username/.claude/agentic-processes/active/parent-process" \
  --child-id "child-uuid" \
  --child-name "Child Process Name" \
  --child-status running \
  --spawned-at-step "step-uuid-that-spawned" \
  --sync-point "step-uuid-where-parent-waits" \
  --child-process-path "/c/Users/username/.claude/agentic-processes/active/child-process"
```

**PowerShell**:
```powershell
python "C:/Projects/HM/agentic-processes/scripts/process_manager.py" register-child-process --process-dir "C:/Users/username/.claude/agentic-processes/active/parent-process" --child-id "child-uuid" --child-name "Child Process Name" --child-status running --spawned-at-step "step-uuid-that-spawned" --sync-point "step-uuid-where-parent-waits" --child-process-path "C:/Users/username/.claude/agentic-processes/active/child-process"
```

**Important**: `--spawned-at-step` must be the step's UUID (not its number) — the UI diagram matches by step UUID.

If a child with the same ID already exists, its entry is updated rather than duplicated.

---

### update-child-status

Update the status of a child sub-process in the parent's `process.json`. Used when a child process completes or fails to keep the parent's diagram in sync.

**Bash**:
```bash
python3 /c/Projects/HM/agentic-processes/scripts/process_manager.py update-child-status \
  --process-dir "/c/Users/username/.claude/agentic-processes/active/parent-process" \
  --child-id "child-uuid" \
  --child-status completed
```

**PowerShell**:
```powershell
python "C:/Projects/HM/agentic-processes/scripts/process_manager.py" update-child-status --process-dir "C:/Users/username/.claude/agentic-processes/active/parent-process" --child-id "child-uuid" --child-status completed
```

Valid statuses: `running`, `completed`, `failed`, `paused`

---

### update-log-observations

Append entries to the `processWideObservations` section of `log.json`. Used by steps like `apply-changes`, `review-verify-document`, and `continuous-improvement` to record cross-step patterns and recommendations.

**Bash**:
```bash
python3 /c/Projects/HM/agentic-processes/scripts/process_manager.py update-log-observations \
  --process-dir "/c/Users/username/.claude/agentic-processes/active/process-name" \
  --patterns '["Repeated file conflicts", "User prefers incremental changes"]' \
  --feedback '["User requested more detailed logging"]' \
  --recommendations '["Add conflict detection earlier", "Implement auto-merge for simple conflicts"]'
```

All flags are optional — only provided fields are appended/merged.

---

## Important Rules

1. **Never use Write/Edit** directly on `process.json`, `memory/*.json`, `log.json`, or `pending-interaction.json` — always use this skill's operations
2. **Always check stdout** for the result status after each command: `{"status": "ok"}` means success
3. **Escape JSON properly** in PowerShell: use `'{\"key\": \"value\"}'` with backslash-escaped inner quotes
4. **Use correct path format**: Bash uses `/c/` prefix, PowerShell uses `C:/`
5. **The script path is fixed**: Always use `C:/Projects/HM/agentic-processes/scripts/process_manager.py` (or `/c/Projects/...` in Bash)

---

## Common Mistakes (DO NOT DO THESE)

### [WRONG] Creating pending-interaction.json directly
**WRONG:**
```powershell
# DO NOT create the file with PowerShell/Write/Edit
$json = @{options = @(...)} | ConvertTo-Json
$json | Out-File "pending-interaction.json"  # [X] WRONG!
```

**CORRECT:**
```bash
# ALWAYS use write-pending operation
python3 /c/Projects/HM/agentic-processes/scripts/process_manager.py write-pending \
  --process-dir "..." \
  --options '[...]'
```

### [WRONG] Using relative paths
**WRONG:**
```bash
python scripts/process_manager.py ...  # [X] Breaks if not in project root
```

**CORRECT:**
```bash
python3 /c/Projects/HM/agentic-processes/scripts/process_manager.py ...  # [OK] Always works
```

### [WRONG] Using Write/Edit on process state files
**WRONG:**
```python
# DO NOT use Write tool on process.json/memory.json/log.json
Write(file_path="process.json", content="...")  # [X] CORRUPTS STATE!
```

**CORRECT:**
```bash
# ALWAYS use the appropriate process_manager.py operation
python3 /c/Projects/HM/agentic-processes/scripts/process_manager.py add-memory-entry ...
```
