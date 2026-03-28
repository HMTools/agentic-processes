#!/usr/bin/env bash
# Enforce log-first ordering for user interactions
# Platform-agnostic: works with Cursor, Claude Code, and GitHub Copilot

INPUT=$(cat)

# Platform detection
if [ -n "$CURSOR_PROJECT_DIR" ]; then
    # Cursor environment
    SESSION_ID=$(echo "$INPUT" | grep -o '"conversation_id":"[^"]*"' | head -1 | cut -d'"' -f4)
    PROJECT_DIR="$CURSOR_PROJECT_DIR"
    FILE_PATH=$(echo "$INPUT" | grep -o '"path":"[^"]*"' | head -1 | cut -d'"' -f4)
    FLAG_DIR=".cursor"
    OUTPUT_FORMAT="cursor"
elif [ -n "$CLAUDE_PROJECT_DIR" ]; then
    # Claude Code environment
    SESSION_ID=$(echo "$INPUT" | grep -o '"session_id":"[^"]*"' | head -1 | cut -d'"' -f4)
    PROJECT_DIR="$CLAUDE_PROJECT_DIR"
    FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | cut -d'"' -f4)
    FLAG_DIR=".claude"
    OUTPUT_FORMAT="claude"
else
    # GitHub Copilot environment (no session_id — use cwd and fixed flag name)
    SESSION_ID=""
    PROJECT_DIR=$(echo "$INPUT" | grep -o '"cwd":"[^"]*"' | head -1 | cut -d'"' -f4)
    TOOL_ARGS=$(echo "$INPUT" | grep -o '"toolArgs":"[^"]*"' | head -1 | cut -d'"' -f4)
    FILE_PATH=$(echo "$TOOL_ARGS" | grep -o '"path":"[^"]*"' | head -1 | cut -d'"' -f4)
    FLAG_DIR=".github"
    OUTPUT_FORMAT="copilot"
fi

if [ "$OUTPUT_FORMAT" != "copilot" ] && [ -z "$SESSION_ID" ]; then
    exit 0
fi
if [ "$OUTPUT_FORMAT" = "copilot" ] && [ -z "$PROJECT_DIR" ]; then
    exit 0
fi

if [ -n "$SESSION_ID" ]; then
    FLAG_FILE="$PROJECT_DIR/$FLAG_DIR/pending-log-$SESSION_ID"
else
    # Copilot: use fixed flag name
    FLAG_FILE="$PROJECT_DIR/$FLAG_DIR/pending-log"
fi

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
        elif [ "$OUTPUT_FORMAT" = "copilot" ]; then
            cat << 'EOF'
{"permissionDecision":"deny","permissionDecisionReason":"Log-first enforcement: log the user interaction to log.json before modifying process files"}
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
