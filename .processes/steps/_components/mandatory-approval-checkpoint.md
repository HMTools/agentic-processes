**Approval checkpoint behavior is enforced by hooks:**

- **H1a (Stop hook)**: Blocks Claude from finishing a turn when a step has `approvalRequired: true` and `pending-interaction.json` does not exist in the process folder
- **H1b (PreToolUse hook)**: Blocks all action tool calls when `pending-interaction.json` exists in the process folder, trapping the agent until the user responds and the agent deletes `pending-interaction.json`

These hooks enforce the two-way contract: the agent cannot skip presenting deliverables (H1a), and cannot continue working once the checkpoint is active (H1b).
