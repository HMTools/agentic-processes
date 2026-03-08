#!/usr/bin/env bash
# H1b: Block action tools when pending-interaction.json exists in the active process folder
# Reads session_id from stdin JSON (simple string extraction, no jq needed)

INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | grep -o '"session_id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$SESSION_ID" ]; then
  exit 0
fi

# Find the active process folder by matching session_id in process.json files
PENDING_FILE=""
for PROCESS_JSON in "$CLAUDE_PROJECT_DIR"/.user-processes/active/*/process.json; do
  if [ -f "$PROCESS_JSON" ]; then
    # Check if this process.json contains the matching sessionId
    # Handles both "sessionId":"value" and "sessionId": "value" formats
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
# Extract tool name from input
TOOL_NAME=$(echo "$INPUT" | grep -o '"tool_name":"[^"]*"' | head -1 | cut -d'"' -f4)

# Allow read-only tools always
case "$TOOL_NAME" in
  Read|Glob|Grep|LS)
    exit 0
    ;;
esac

# Allow Write/Edit to process files (process.json, log.json, memory.json, pending-interaction.json)
if [ "$TOOL_NAME" = "Write" ] || [ "$TOOL_NAME" = "Edit" ]; then
  FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | cut -d'"' -f4)
  case "$FILE_PATH" in
    *process.json|*log.json|*memory.json|*pending-interaction.json)
      exit 0
      ;;
  esac
fi

# Allow Bash commands that reference pending-interaction.json (e.g., deletion to clear checkpoint)
if [ "$TOOL_NAME" = "Bash" ]; then
  COMMAND=$(echo "$INPUT" | grep -o '"command":"[^"]*"' | head -1 | cut -d'"' -f4)
  case "$COMMAND" in
    *pending-interaction.json*)
      exit 0
      ;;
  esac
fi

# Block everything else
echo '{"decision":"block","reason":"Approval checkpoint pending — stop responding and wait for user approval"}'
exit 0
