#!/usr/bin/env bash
# Enforce log-first ordering for user interactions

INPUT=$(cat)

SESSION_ID=$(echo "$INPUT" | grep -oP '"session_id"\s*:\s*"\K[^"]*' | head -1)
PROJECT_DIR="$CLAUDE_PROJECT_DIR"
FILE_PATH=$(echo "$INPUT" | grep -oP '"file_path"\s*:\s*"\K[^"]*' | head -1)
FLAG_DIR=".claude"

if [ -z "$SESSION_ID" ] || [ -z "$PROJECT_DIR" ]; then
    exit 0
fi

FLAG_FILE="$PROJECT_DIR/$FLAG_DIR/pending-log-$SESSION_ID"

if [ ! -f "$FLAG_FILE" ]; then
  exit 0
fi

# Flag exists — user message not yet logged

# Allow writes to log.json (this IS the log write)
case "$FILE_PATH" in
  *log.json)
    exit 0
    ;;
esac

# Normalize: unescape JSON double-backslashes then collapse to single forward slashes
NORMALIZED_PATH=$(printf '%s' "$FILE_PATH" | tr '\\' '/' | sed 's|//*|/|g')

# Block writes to process files until log is written
case "$NORMALIZED_PATH" in
    */.user-processes/active/*)
        cat << 'EOF'
{
  "decision": "block",
  "reason": "Log the user interaction to log.json before modifying process files (log-first enforced by hook)"
}
EOF
        exit 0
        ;;
esac

exit 0
