---
name: process-approve
description: Approve a process step's deliverables
disable-model-invocation: true
allowed-tools: Bash(python3 *process_manager.py*) Write Read Glob
---

# Approve Process Step

Approve a step that has `approvalRequired: true` in its process definition.

## Arguments

`$ARGUMENTS` should be: `<process-dir> <step-id>`

If no arguments provided, auto-detect the active process from `~/.claude/agentic-processes/active/` by finding the process directory with a `.session` file matching the current session.

## Workflow

1. **Read process state**: Read `process.json` from the process directory
2. **Find the step**: Locate the step by step-id (or find the current in_progress step with approvalRequired: true if no step-id given)
3. **Show deliverables**: Read and display the step's output artifacts so the user can review what they are approving
4. **Create approve token**: Write an empty file `.approve-token` in the process directory
5. **Call approve-step**: Run the command:
   ```bash
   python3 ${CLAUDE_PLUGIN_ROOT}/scripts/process_manager.py approve-step \
     --process-dir "<process-dir>" \
     --step-id "<step-id>"
   ```
6. **Delete pending interaction** (if exists):
   ```bash
   python3 ${CLAUDE_PLUGIN_ROOT}/scripts/process_manager.py write-pending \
     --process-dir "<process-dir>" \
     --delete
   ```
7. **Confirm**: Output "Step '<step-name>' approved successfully"

## Auto-Detection Logic

When no arguments are provided:
1. List directories in `~/.claude/agentic-processes/active/`
2. For each, check if `.session` file content matches `${CLAUDE_SESSION_ID}`
3. In the matched process, find the step with `status: "in_progress"` and `approvalRequired: true`
4. Use that process directory and step ID

## Notes

- `disable-model-invocation: true` is the entire security boundary here: it makes this skill unreachable by the agent's own initiative under any circumstances (Claude: ✗ to invoke, per Claude Code's skill invocation rules) — only a human literally typing `/process-approve` can trigger it. This skill intentionally does NOT use `context: fork` split into a second skill, because a second `context: fork` skill invoked by this one would need `user-invocable: false` (Claude: ✓) to be callable at all, which would let the agent invoke the token-writing step on its own initiative and self-approve. Keeping the whole read+write flow in this single `disable-model-invocation: true` skill is what keeps approval human-only.
- The `.approve-token` file is consumed by the `block-approve-step.sh` hook
- For UI channel: the UI app calls `approve-step` directly (not through Claude Code), so hooks don't apply and no token is needed
- The user's invocation of `/process-approve` IS the confirmation -- no additional confirmation needed within the skill
