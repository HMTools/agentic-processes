#!/usr/bin/env bash
# Block Task/Todo tools during active process execution
# Process steps should be the task list, not external todo tools
export LANG=C.UTF-8

INPUT=$(cat)

SESSION_ID=$(echo "$INPUT" | grep -oP '"session_id"\s*:\s*"\K[^"]*' | head -1)
TOOL_NAME=$(echo "$INPUT" | grep -oP '"tool_name"\s*:\s*"\K[^"]*' | head -1)
AGENTIC_DIR="$HOME/.claude/agentic-processes"

if [ -z "$SESSION_ID" ]; then
    exit 0
fi

# Only block actual task/todo tools — allow everything else through
case "$TOOL_NAME" in
    Task|TaskCreate|TaskUpdate|TaskGet|TaskList|TaskStop|TaskOutput)
        ;;
    *)
        exit 0
        ;;
esac

# Find the active process folder by matching .session file
PROCESS_JSON_FILE=""
for SESSION_FILE in "$AGENTIC_DIR"/active/*/.session; do
    if [ -f "$SESSION_FILE" ] && [ "$(cat "$SESSION_FILE" 2>/dev/null)" = "$SESSION_ID" ]; then
        PROCESS_DIR=$(dirname "$SESSION_FILE")
        PROCESS_JSON_FILE="$PROCESS_DIR/process.json"
        break
    fi
done

# No active process — allow the tool
if [ -z "$PROCESS_JSON_FILE" ] || [ ! -f "$PROCESS_JSON_FILE" ]; then
    exit 0
fi

# Check if process status is 'running'
if grep -qE '"status"[[:space:]]*:[[:space:]]*"running"' "$PROCESS_JSON_FILE"; then
    cat << 'EOF'
{
  "decision": "block",
  "reason": "External todo tools are blocked during process execution — process steps are your task list"
}
EOF
    exit 0
fi

exit 0
