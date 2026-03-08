#!/usr/bin/env bash
# Enforce log-first ordering for user interactions
# Adapted for Cursor hooks - uses conversation_id and Cursor output format

INPUT=$(cat)

# Cursor uses conversation_id instead of session_id
SESSION_ID=$(echo "$INPUT" | grep -o '"conversation_id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$SESSION_ID" ]; then
  exit 0
fi

# Use CURSOR_PROJECT_DIR (CLAUDE_PROJECT_DIR is also available as alias)
PROJECT_DIR="${CURSOR_PROJECT_DIR:-$CLAUDE_PROJECT_DIR}"

FLAG_FILE="$PROJECT_DIR/.cursor/pending-log-$SESSION_ID"

if [ ! -f "$FLAG_FILE" ]; then
  exit 0
fi

# Flag exists — user message not yet logged
# In Cursor, file path is in tool_input.path
FILE_PATH=$(echo "$INPUT" | grep -o '"path":"[^"]*"' | head -1 | cut -d'"' -f4)

# Allow writes to log.json (this IS the log write)
case "$FILE_PATH" in
  *log.json)
    exit 0
    ;;
esac

# Block writes to process files until log is written
case "$FILE_PATH" in
  */.user-processes/active/*)
    cat << 'EOF'
{
  "permission": "deny",
  "user_message": "Log-first enforcement: must log user interaction before modifying process files",
  "agent_message": "Action blocked: Log the user interaction to log.json before modifying process files (log-first enforced by hook)"
}
EOF
    exit 0
    ;;
esac

exit 0
