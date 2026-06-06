---
name: process-state-update
description: Update process state files (process.json, memory.json, log.json, pending-interaction.json) via Python scripts. ALWAYS use this skill when working with agentic-processes — whenever you need to update step status, record memory, log actions, create approval checkpoints, or modify any process state file. Never use Write/Edit tools on process state files. Used by step-executor and process-continue agents.
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

**Note**: When completing a step with `approvalRequired: true`, the step must have `approved: true` set via `approve-step` first. Otherwise, `update-step-status --status completed` will fail with an error describing the required approval workflow.

---

### approve-step

Record explicit approval for a step with `approvalRequired: true`. This is the **only** way to set `approved = true` on a step, and it is **required** before `update-step-status --status completed` will succeed on approval-required steps.

**When to use**: After the user has approved at an approval checkpoint and the pending interaction has been resolved (deleted).

**Bash**:
```bash
python3 /c/Projects/HM/agentic-processes/scripts/process_manager.py approve-step \
  --process-dir "/c/Users/username/.claude/agentic-processes/active/process-name" \
  --step-id "abc-123-uuid"
```

**PowerShell**:
```powershell
python "C:/Projects/HM/agentic-processes/scripts/process_manager.py" approve-step --process-dir "C:/Users/username/.claude/agentic-processes/active/process-name" --step-id "abc-123-uuid"
```

**Error conditions**:
- Step does not have `approvalRequired: true` -- cannot approve a non-approval step
- `pending-interaction.json` still exists -- the approval checkpoint must be resolved first (user must respond, then call `write-pending --delete`)

**Full Approval Workflow** (mandatory sequence for approval-required steps):
```
1. write-pending --options '[...]'          # Create approval checkpoint
2. (wait for user response)                  # User approves/rejects/modifies
3. log-interaction --request "..." ...       # Log the user's response
4. write-pending --delete                    # Delete the checkpoint
5. approve-step --step-id "..."              # Record approval (sets approved=true)
6. update-step-status --status completed     # Complete the step (succeeds because approved=true)
```

This workflow is **enforced by the script** -- step 6 will fail if step 5 was not called.

---

### update-current-state

Update the active step pointer in `process.json`.

**Bash**:
```bash
python3 /c/Projects/HM/agentic-processes/scripts/process_manager.py update-current-state \
  --process-dir "/c/Users/username/.claude/agentic-processes/active/process-name" \
  --step-id "abc-123-uuid" \
  --step-name "Verify Changes" \
  --summary "Reviewing applied changes for correctness"
```

**PowerShell**:
```powershell
python "C:/Projects/HM/agentic-processes/scripts/process_manager.py" update-current-state --process-dir "C:/Users/username/.claude/agentic-processes/active/process-name" --step-id "abc-123-uuid" --step-name "Verify Changes" --summary "Reviewing applied changes"
```

---

### add-memory-entry

Add or update a step entry in `memory.json`. If the step already exists, new info/decisions/files are appended.

**Bash**:
```bash
python3 /c/Projects/HM/agentic-processes/scripts/process_manager.py add-memory-entry \
  --process-dir "/c/Users/username/.claude/agentic-processes/active/process-name" \
  --step-id "abc-123-uuid" \
  --name "Analyze Requirements" \
  --info '{"approach": "reviewed user docs", "constraints": "must preserve API compatibility"}' \
  --decisions '["Use incremental migration", "Maintain backward compatibility"]' \
  --files '["api.py", "migration.sql"]'
```

**PowerShell**:
```powershell
python "C:/Projects/HM/agentic-processes/scripts/process_manager.py" add-memory-entry --process-dir "C:/Users/username/.claude/agentic-processes/active/process-name" --step-id "abc-123-uuid" --name "Analyze Requirements" --info '{\"approach\": \"reviewed user docs\"}' --decisions '[\"Use incremental migration\"]' --files '[\"api.py\"]'
```

**Note**: In PowerShell, escape inner quotes with backslash: `'{\"key\": \"value\"}'`

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

1. **Never use Write/Edit** directly on `process.json`, `memory.json`, `log.json`, or `pending-interaction.json` — always use this skill's operations
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
