#!/usr/bin/env bash
# PostToolUse hook: automatically bind session_id to process.json
# When agent writes/edits a process.json in .user-processes/active/,
# inject the current session_id into metadata.sessionId

INPUT=$(cat)

SESSION_ID=$(echo "$INPUT" | grep -o '"session_id":"[^"]*"' | head -1 | cut -d'"' -f4)
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | cut -d'"' -f4)

# Only act on process.json files in active process directories
if [[ "$FILE_PATH" == */.user-processes/active/*/process.json ]]; then
    if [ -n "$SESSION_ID" ] && [ -f "$FILE_PATH" ]; then
        # Replace existing sessionId value (including empty or placeholder)
        if grep -qE '"sessionId"' "$FILE_PATH"; then
            sed -i 's/"sessionId"[[:space:]]*:[[:space:]]*"[^"]*"/"sessionId": "'"$SESSION_ID"'"/' "$FILE_PATH"
        fi
    fi
fi

echo '{}'
exit 0
