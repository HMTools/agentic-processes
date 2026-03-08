#!/usr/bin/env bash
# H6b: Enforce log-first ordering for user interactions
# Reads session_id from stdin JSON

INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | grep -o '"session_id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$SESSION_ID" ]; then
  exit 0
fi

FLAG_FILE="$CLAUDE_PROJECT_DIR/.claude/pending-log-$SESSION_ID"

if [ ! -f "$FLAG_FILE" ]; then
  exit 0
fi

# Flag exists — user message not yet logged
# Get the target file path
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | cut -d'"' -f4)

# Allow writes to log.json (this IS the log write)
case "$FILE_PATH" in
  *log.json)
    exit 0
    ;;
esac

# Block writes to process files
case "$FILE_PATH" in
  */.user-processes/active/*)
    echo '{"decision":"block","reason":"Log the user interaction to log.json before modifying process files (log-first enforced by hook)"}'
    exit 0
    ;;
esac

exit 0
