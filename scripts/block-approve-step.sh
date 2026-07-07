#!/usr/bin/env bash
# PreToolUse hook: Block approve-step commands unless .approve-token exists
# Part of the user-only approval gate enforcement (Layer 3: Hook Enforcement)
export LANG=C.UTF-8

INPUT=$(cat)

# Extract the Bash command from the hook input
COMMAND=$(echo "$INPUT" | python3 -c "
import json, sys
data = json.load(sys.stdin)
tool_input = data.get('tool_input', {})
print(tool_input.get('command', ''))
" 2>/dev/null)

# Only check commands that actually invoke process_manager.py's approve-step subcommand
# (a bare substring match on 'approve-step' also fires on unrelated commands, e.g. ones
# that merely mention this hook's own filename)
if echo "$COMMAND" | grep -qE 'process_manager\.py.*\bapprove-step\b'; then
    # Find the process directory from the command arguments. This is delegated to a
    # standalone .py file rather than embedded inline: embedding a Python one-liner with
    # internal quotes inside a bash double-quoted `-c "..."` string is fragile (a previous
    # version of this script had a `\'` escape here that bash does not interpret as intended
    # inside double quotes, producing a Python SyntaxError on every invocation).
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROCESS_DIR=$(echo "$COMMAND" | python3 "$SCRIPT_DIR/hook_extract_process_dir.py" 2>/dev/null)

    if [ -z "$PROCESS_DIR" ]; then
        # Cannot determine process dir -- block for safety
        echo '{"decision": "block", "reason": "Step approval is user-only. Cannot determine process directory. Tell the user to run /process-approve to approve this step."}' >&2
        exit 2
    fi

    # Normalize path for Windows/Git Bash compatibility
    PROCESS_DIR=$(echo "$PROCESS_DIR" | sed 's|^C:|/c|; s|\\|/|g')

    TOKEN_FILE="$PROCESS_DIR/.approve-token"

    if [ -f "$TOKEN_FILE" ]; then
        # Token exists -- allow and consume it
        rm -f "$TOKEN_FILE"
        echo '{}'
        exit 0
    else
        # No token -- block the command
        echo '{"decision": "block", "reason": "Step approval is user-only. Tell the user to run /process-approve to approve this step."}' >&2
        exit 2
    fi
fi

# Not an approve-step command -- allow
echo '{}'
exit 0
