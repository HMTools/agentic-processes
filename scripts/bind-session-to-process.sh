#!/usr/bin/env bash
# PostToolUse hook: bind session_id to active process directory
# When agent writes/edits any file in .user-processes/active/*/,
# write the session_id to a .session file in that process directory

INPUT=$(cat)

SESSION_ID=$(echo "$INPUT" | grep -oP '"session_id"\s*:\s*"\K[^"]*' | head -1)
FILE_PATH=$(echo "$INPUT" | grep -oP '"file_path"\s*:\s*"\K[^"]*' | head -1)

if [ -z "$SESSION_ID" ] || [ -z "$FILE_PATH" ]; then
    echo '{}'
    exit 0
fi

# Normalize: unescape JSON double-backslashes then collapse to single forward slashes
NORMALIZED_PATH=$(printf '%s' "$FILE_PATH" | tr '\\' '/' | sed 's|//*|/|g')

# Only act on files inside active process directories
if [[ "$NORMALIZED_PATH" == */.user-processes/active/*/* ]]; then
    # Extract the process directory (up to the process folder name)
    PROCESS_DIR=$(echo "$NORMALIZED_PATH" | sed 's|\(.*/.user-processes/active/[^/]*\)/.*|\1|')
    if [ -d "$PROCESS_DIR" ]; then
        echo "$SESSION_ID" > "$PROCESS_DIR/.session"
    fi
fi

echo '{}'
exit 0
