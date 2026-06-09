#!/usr/bin/env bash
# PostToolUse hook: track file changes in activeStep.filesChanged
export LANG=C.UTF-8

INPUT=$(cat)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
eval "$(echo "$INPUT" | python3 "$SCRIPT_DIR/parse_hook_input.py" session_id tool_name file_path)"

if [ -z "$SESSION_ID" ] || [ -z "$FILE_PATH" ]; then
    echo '{}'
    exit 0
fi

# Find active process directory by session ID
ACTIVE_DIR="$HOME/.claude/agentic-processes/active"
PROCESS_DIR=""
if [ -d "$ACTIVE_DIR" ]; then
    for SESSION_FILE in "$ACTIVE_DIR"/*/.session; do
        [ -f "$SESSION_FILE" ] || continue
        if [ "$(cat "$SESSION_FILE" 2>/dev/null | tr -d '[:space:]')" = "$SESSION_ID" ]; then
            PROCESS_DIR="$(dirname "$SESSION_FILE")"
            break
        fi
    done
fi

if [ -z "$PROCESS_DIR" ]; then
    echo '{}'
    exit 0
fi

# Determine operation based on tool name
case "$TOOL_NAME" in
    Write)          OPERATION="edited" ;;
    Edit|StrReplace) OPERATION="edited" ;;
    *)              OPERATION="edited" ;;
esac

# Track the file change (fire-and-forget, don't block the agent)
python3 "$SCRIPT_DIR/process_manager.py" track-file-change \
    --process-dir "$PROCESS_DIR" \
    --file-path "$FILE_PATH" \
    --operation "$OPERATION" \
    --tool "$TOOL_NAME" >/dev/null 2>&1

echo '{}'
exit 0
