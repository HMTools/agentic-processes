#!/usr/bin/env bash
# Enforce log-first ordering for user interactions
export LANG=C.UTF-8

INPUT=$(cat)

SESSION_ID=$(echo "$INPUT" | grep -oP '"session_id"\s*:\s*"\K[^"]*' | head -1)
AGENTIC_DIR="$HOME/.claude/agentic-processes"
TOOL_NAME=$(echo "$INPUT" | grep -oP '"tool_name"\s*:\s*"\K[^"]*' | head -1)

if [ -z "$SESSION_ID" ]; then
    exit 0
fi

FLAG_FILE="$AGENTIC_DIR/flags/pending-log-$SESSION_ID"

if [ ! -f "$FLAG_FILE" ]; then
  exit 0
fi

# Flag exists — user message not yet logged

# Block subagent spawning until interaction is logged
if [ "$TOOL_NAME" = "Task" ]; then
    cat << 'EOF'
{
  "decision": "block",
  "reason": "Log the user interaction to log.json before spawning subagents (log-first enforced by hook)"
}
EOF
    exit 0
fi

# For Write/StrReplace/Edit: check file path
FILE_PATH=$(echo "$INPUT" | grep -oP '"file_path"\s*:\s*"\K(?:\\\\.|[^"])*' | head -1)

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
    */.claude/agentic-processes/active/*)
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
