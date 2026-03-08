#!/usr/bin/env bash
# Block action tools when pending-interaction.json exists in the active process folder
# Adapted for Cursor hooks - uses conversation_id and Cursor output format

INPUT=$(cat)

# Cursor uses conversation_id instead of session_id
SESSION_ID=$(echo "$INPUT" | grep -o '"conversation_id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$SESSION_ID" ]; then
  exit 0
fi

# Use CURSOR_PROJECT_DIR (CLAUDE_PROJECT_DIR is also available as alias)
PROJECT_DIR="${CURSOR_PROJECT_DIR:-$CLAUDE_PROJECT_DIR}"

# Find the active process folder by matching sessionId in process.json files
PENDING_FILE=""
for PROCESS_JSON in "$PROJECT_DIR"/.user-processes/active/*/process.json; do
  if [ -f "$PROCESS_JSON" ]; then
    if grep -qE "\"sessionId\"[[:space:]]*:[[:space:]]*\"$SESSION_ID\"" "$PROCESS_JSON"; then
      PROCESS_DIR=$(dirname "$PROCESS_JSON")
      PENDING_FILE="$PROCESS_DIR/pending-interaction.json"
      break
    fi
  fi
done

if [ -z "$PENDING_FILE" ] || [ ! -f "$PENDING_FILE" ]; then
  exit 0
fi

# pending-interaction.json exists — approval checkpoint is active
TOOL_NAME=$(echo "$INPUT" | grep -o '"tool_name":"[^"]*"' | head -1 | cut -d'"' -f4)

# Allow read-only tools always
case "$TOOL_NAME" in
  Read|Glob|Grep|ReadLints|SemanticSearch)
    exit 0
    ;;
esac

# Allow Write/StrReplace to process files
if [ "$TOOL_NAME" = "Write" ] || [ "$TOOL_NAME" = "StrReplace" ]; then
  # In Cursor, file path is in tool_input.path
  FILE_PATH=$(echo "$INPUT" | grep -o '"path":"[^"]*"' | head -1 | cut -d'"' -f4)
  case "$FILE_PATH" in
    *process.json|*log.json|*memory.json|*pending-interaction.json)
      exit 0
      ;;
  esac
fi

# Allow Shell commands that reference pending-interaction.json
if [ "$TOOL_NAME" = "Shell" ]; then
  COMMAND=$(echo "$INPUT" | grep -o '"command":"[^"]*"' | head -1 | cut -d'"' -f4)
  case "$COMMAND" in
    *pending-interaction.json*)
      exit 0
      ;;
  esac
fi

# Block everything else with Cursor output format
cat << 'EOF'
{
  "permission": "deny",
  "user_message": "Approval checkpoint pending — waiting for user approval before continuing",
  "agent_message": "Action blocked: pending-interaction.json exists. Stop and wait for user approval."
}
EOF
exit 0
