**Log-first behavior is enforced by hooks:**

- **H6a (UserPromptSubmit hook)**: Creates a pending-log flag file when the user submits a message during an active process, before Claude processes it
- **H6b (PreToolUse hook)**: Blocks writes to process files (other than log.json) while the pending-log flag exists, enforcing that log.json is written first
- **H6c (PostToolUse hook)**: Deletes the pending-log flag after a successful write to log.json, lifting the block for subsequent file changes

This three-hook system enforces the log-first ordering at the platform level without relying on agent instruction compliance.
