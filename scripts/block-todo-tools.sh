#!/usr/bin/env bash
# Block Task/Todo tools during active process execution
# Process steps should be the task list, not external todo tools

INPUT=$(cat)

SESSION_ID=$(echo "$INPUT" | grep -o '"session_id":"[^"]*"' | head -1 | cut -d'"' -f4)
PROJECT_DIR="$CLAUDE_PROJECT_DIR"

if [ -z "$SESSION_ID" ] || [ -z "$PROJECT_DIR" ]; then
    exit 0
fi

# Find the active process folder
PROCESS_JSON_FILE=""
for PROCESS_JSON in "$PROJECT_DIR"/.user-processes/active/*/process.json; do
    if [ -f "$PROCESS_JSON" ]; then
        if grep -qE "\"sessionId\"[[:space:]]*:[[:space:]]*\"$SESSION_ID\"" "$PROCESS_JSON"; then
            PROCESS_JSON_FILE="$PROCESS_JSON"
            break
        fi
    fi
done

# No active process — allow the tool
if [ -z "$PROCESS_JSON_FILE" ]; then
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
