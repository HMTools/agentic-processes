#!/usr/bin/env bash
# PostToolUse hook: bind session_id to active process directory
# When agent writes/edits any file in ~/.claude/agentic-processes/active/*/,
# write the session_id to a .session file in that process directory
export LANG=C.UTF-8

INPUT=$(cat)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
eval "$(echo "$INPUT" | python3 "$SCRIPT_DIR/parse_hook_input.py" session_id file_path)"

if [ -z "$SESSION_ID" ] || [ -z "$FILE_PATH" ]; then
    echo '{}'
    exit 0
fi

# Normalize: unescape JSON double-backslashes then collapse to single forward slashes
NORMALIZED_PATH=$(printf '%s' "$FILE_PATH" | tr '\\' '/' | sed 's|//*|/|g')

# Only act on files inside active process directories
if [[ "$NORMALIZED_PATH" == */.claude/agentic-processes/active/*/* ]]; then
    # Extract the process directory (up to the process folder name)
    PROCESS_DIR=$(echo "$NORMALIZED_PATH" | sed 's|\(.*/.claude/agentic-processes/active/[^/]*\)/.*|\1|')
    if [ -d "$PROCESS_DIR" ]; then
        SESSION_FILE="$PROCESS_DIR/.session"
        # Only write session ID when .session content is empty (or file doesn't exist)
        if [ ! -f "$SESSION_FILE" ] || [ -z "$(cat "$SESSION_FILE" 2>/dev/null | tr -d '[:space:]')" ]; then
            echo "$SESSION_ID" > "$SESSION_FILE"
        fi
    fi
fi

echo '{}'
exit 0
