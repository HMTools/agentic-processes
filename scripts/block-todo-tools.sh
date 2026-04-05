#!/usr/bin/env bash
# Block Task/Todo tools during active process execution
# Process steps should be the task list, not external todo tools
export LANG=C.UTF-8

INPUT=$(cat)

SESSION_ID=$(echo "$INPUT" | grep -oP '"session_id"\s*:\s*"\K[^"]*' | head -1)
PROJECT_DIR="$CLAUDE_PROJECT_DIR"

if [ -z "$SESSION_ID" ] || [ -z "$PROJECT_DIR" ]; then
    exit 0
fi

# Find the active process folder by matching .session file
PROCESS_JSON_FILE=""
for SESSION_FILE in "$PROJECT_DIR"/.user-processes/active/*/.session; do
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
