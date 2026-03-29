#!/usr/bin/env bash
# PostToolUse hook: automatically bind session_id to process.json
# When agent writes/edits a process.json in .user-processes/active/,
# inject the current session_id into metadata.sessionId

INPUT=$(cat)

SESSION_ID=$(echo "$INPUT" | grep -oP '"session_id"\s*:\s*"\K[^"]*' | head -1)
FILE_PATH=$(echo "$INPUT" | grep -oP '"file_path"\s*:\s*"\K[^"]*' | head -1)

# Normalize backslashes to forward slashes for path matching
NORMALIZED_PATH="${FILE_PATH//\\//}"

# Only act on process.json files in active process directories
if [[ "$NORMALIZED_PATH" == */.user-processes/active/*/process.json ]]; then
    if [ -n "$SESSION_ID" ] && [ -f "$FILE_PATH" ]; then
        # Replace existing sessionId value (including empty or placeholder)
        if grep -qE '"sessionId"' "$FILE_PATH"; then
            sed -i 's/"sessionId"[[:space:]]*:[[:space:]]*"[^"]*"/"sessionId": "'"$SESSION_ID"'"/' "$FILE_PATH"
        fi
    fi
fi

echo '{}'
exit 0
