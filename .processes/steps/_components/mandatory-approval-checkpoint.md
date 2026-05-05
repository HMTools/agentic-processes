**Approval checkpoint behavior is enforced at two layers:**

- **H1a (Stop hook)**: Blocks Claude from finishing a turn when a step has `approvalRequired: true` and `pending-interaction.json` does not exist in the process folder
- **H1b (PreToolUse hook)**: Blocks general action tool calls when `pending-interaction.json` exists in the process folder. Allows read-only tools, process file writes, and Bash calls to `process_manager.py` (so the agent can resolve the approval)
- **H1c (Python gating)**: `_check_pending_approval()` in `process_manager.py` blocks state-advancing commands (`update-step-status`, `update-current-state`, `update-process-status`) while `pending-interaction.json` exists. Resolution commands (`write-pending`, `log-interaction`, `add-log-entry`, `add-memory-entry`) are allowed

These layers enforce the two-way contract: the agent cannot skip presenting deliverables (H1a), cannot do general work once the checkpoint is active (H1b), and cannot advance process state without clearing the approval (H1c) — while still being able to resolve the approval programmatically through `process_manager.py`.
