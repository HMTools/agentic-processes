#!/usr/bin/env bash
# Enforce log-first ordering for user interactions
# Platform-agnostic: works with both Cursor and Claude Code

INPUT=$(cat)

# Platform detection
if [ -n "$CURSOR_PROJECT_DIR" ]; then
    # Cursor environment
    SESSION_ID=$(echo "$INPUT" | grep -o '"conversation_id":"[^"]*"' | head -1 | cut -d'"' -f4)
    PROJECT_DIR="$CURSOR_PROJECT_DIR"
    FILE_PATH=$(echo "$INPUT" | grep -o '"path":"[^"]*"' | head -1 | cut -d'"' -f4)
    FLAG_DIR=".cursor"
    OUTPUT_FORMAT="cursor"
else
    # Claude Code environment
    SESSION_ID=$(echo "$INPUT" | grep -o '"session_id":"[^"]*"' | head -1 | cut -d'"' -f4)
    PROJECT_DIR="$CLAUDE_PROJECT_DIR"
    FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | cut -d'"' -f4)
    FLAG_DIR=".claude"
    OUTPUT_FORMAT="claude"
fi

if [ -z "$SESSION_ID" ]; then
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

# Block writes to process files until log is written
case "$FILE_PATH" in
  */.user-processes/active/*)
    if [ "$OUTPUT_FORMAT" = "cursor" ]; then
      cat << 'EOF'
{
  "permission": "deny",
  "user_message": "Log-first enforcement: must log user interaction before modifying process files",
  "agent_message": "Action blocked: Log the user interaction to log.json before modifying process files (log-first enforced by hook)"
}
EOF
    else
      cat << 'EOF'
{
  "decision": "block",
  "reason": "Log the user interaction to log.json before modifying process files (log-first enforced by hook)"
}
EOF
    fi
    exit 0
    ;;
esac

exit 0
