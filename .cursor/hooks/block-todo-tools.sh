#!/usr/bin/env bash
# Block Task tool during active process execution
# Process steps should be the task list, not external todo tools

INPUT=$(cat)

# Cursor uses conversation_id
SESSION_ID=$(echo "$INPUT" | grep -o '"conversation_id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$SESSION_ID" ]; then
  exit 0
fi

# Use CURSOR_PROJECT_DIR (CLAUDE_PROJECT_DIR is also available as alias)
PROJECT_DIR="${CURSOR_PROJECT_DIR:-$CLAUDE_PROJECT_DIR}"

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
  cat << 'EOF'
{
  "permission": "deny",
  "user_message": "Task tool blocked during process execution",
  "agent_message": "External todo tools are blocked during process execution — process steps are your task list"
}
EOF
  exit 0
fi

exit 0
