#!/usr/bin/env bash
# Block action tools when pending-interaction.json exists in the active process folder

INPUT=$(cat)

SESSION_ID=$(echo "$INPUT" | grep -o '"session_id":"[^"]*"' | head -1 | cut -d'"' -f4)
PROJECT_DIR="$CLAUDE_PROJECT_DIR"
TOOL_NAME=$(echo "$INPUT" | grep -o '"tool_name":"[^"]*"' | head -1 | cut -d'"' -f4)
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | cut -d'"' -f4)
COMMAND=$(echo "$INPUT" | grep -o '"command":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$SESSION_ID" ] || [ -z "$PROJECT_DIR" ]; then
    exit 0
fi

# Find the active process folder and check for pending-interaction.json
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

# Allow read-only tools always
case "$TOOL_NAME" in
  Read|Glob|Grep|ReadLints|SemanticSearch|View|LS)
    exit 0
    ;;
esac

# Allow writes to process files
if [ "$TOOL_NAME" = "Write" ] || [ "$TOOL_NAME" = "StrReplace" ] || [ "$TOOL_NAME" = "Edit" ]; then
  case "$FILE_PATH" in
    *process.json|*log.json|*memory.json|*pending-interaction.json)
      exit 0
      ;;
  esac
fi

# Allow Shell/Bash commands that reference pending-interaction.json
if [ "$TOOL_NAME" = "Shell" ] || [ "$TOOL_NAME" = "Bash" ]; then
  case "$COMMAND" in
    *pending-interaction.json*)
      exit 0
      ;;
  esac
fi

# Block everything else
cat << 'EOF'
{
  "decision": "block",
  "reason": "Approval checkpoint pending — waiting for user approval before continuing"
}
EOF
exit 0
