#!/usr/bin/env bash
# Block action tools when pending-interaction.json exists in the active process folder

INPUT=$(cat)

SESSION_ID=$(echo "$INPUT" | grep -oP '"session_id"\s*:\s*"\K[^"]*' | head -1)
PROJECT_DIR="$CLAUDE_PROJECT_DIR"
TOOL_NAME=$(echo "$INPUT" | grep -oP '"tool_name"\s*:\s*"\K[^"]*' | head -1)
FILE_PATH=$(echo "$INPUT" | grep -oP '"file_path"\s*:\s*"\K[^"]*' | head -1)
COMMAND=$(echo "$INPUT" | grep -oP '"command"\s*:\s*"\K[^"]*' | head -1)

if [ -z "$SESSION_ID" ] || [ -z "$PROJECT_DIR" ]; then
    exit 0
fi

# Find the active process folder by matching .session file
PENDING_FILE=""
for SESSION_FILE in "$PROJECT_DIR"/.user-processes/active/*/.session; do
    if [ -f "$SESSION_FILE" ] && [ "$(cat "$SESSION_FILE" 2>/dev/null)" = "$SESSION_ID" ]; then
        PROCESS_DIR=$(dirname "$SESSION_FILE")
        PENDING_FILE="$PROCESS_DIR/pending-interaction.json"
        break
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
