#!/usr/bin/env bash
# Block action tools when pending-interaction.json exists in the active process folder
export LANG=C.UTF-8

INPUT=$(cat)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

eval "$(echo "$INPUT" | python3 "$SCRIPT_DIR/parse_hook_input.py" session_id tool_name file_path command)"
AGENTIC_DIR="$HOME/.claude/agentic-processes"

if [ -z "$SESSION_ID" ]; then
    exit 0
fi

# Find the active process folder by matching .session file
PENDING_FILE=""
for SESSION_FILE in "$AGENTIC_DIR"/active/*/.session; do
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

# Allow Shell/Bash commands that call process_manager.py (approval resolution)
if [ "$TOOL_NAME" = "Shell" ] || [ "$TOOL_NAME" = "Bash" ] || [ "$TOOL_NAME" = "PowerShell" ]; then
  case "$COMMAND" in
    *process_manager.py*)
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
