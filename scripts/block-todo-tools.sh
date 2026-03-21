#!/usr/bin/env bash
# Block Task/Todo tools during active process execution
# Process steps should be the task list, not external todo tools
# Platform-agnostic: works with both Cursor and Claude Code

INPUT=$(cat)

# Platform detection
if [ -n "$CURSOR_PROJECT_DIR" ]; then
    # Cursor environment
    SESSION_ID=$(echo "$INPUT" | grep -o '"conversation_id":"[^"]*"' | head -1 | cut -d'"' -f4)
    PROJECT_DIR="$CURSOR_PROJECT_DIR"
    OUTPUT_FORMAT="cursor"
else
    # Claude Code environment
    SESSION_ID=$(echo "$INPUT" | grep -o '"session_id":"[^"]*"' | head -1 | cut -d'"' -f4)
    PROJECT_DIR="$CLAUDE_PROJECT_DIR"
    OUTPUT_FORMAT="claude"
fi

if [ -z "$SESSION_ID" ]; then
  exit 0
fi

# Find the active process folder by matching sessionId in process.json files
PROCESS_JSON_FILE=""
for PROCESS_JSON in "$PROJECT_DIR"/.user-processes/active/*/process.json; do
  if [ -f "$PROCESS_JSON" ]; then
    if grep -qE "\"sessionId\"[[:space:]]*:[[:space:]]*\"$SESSION_ID\"" "$PROCESS_JSON"; then
      PROCESS_JSON_FILE="$PROCESS_JSON"
      break
    fi
  fi
done

# No active process for this session - allow the tool
if [ -z "$PROCESS_JSON_FILE" ]; then
  exit 0
fi

# Check if process status is 'running'
if grep -qE '"status"[[:space:]]*:[[:space:]]*"running"' "$PROCESS_JSON_FILE"; then
  if [ "$OUTPUT_FORMAT" = "cursor" ]; then
    cat << 'EOF'
{
  "permission": "deny",
  "user_message": "Task tool blocked during process execution",
  "agent_message": "External todo tools are blocked during process execution — process steps are your task list"
}
EOF
  else
    cat << 'EOF'
{
  "decision": "block",
  "reason": "External todo tools are blocked during process execution — process steps are your task list"
}
EOF
  fi
  exit 0
fi

exit 0
