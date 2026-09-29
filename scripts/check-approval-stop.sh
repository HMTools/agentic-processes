#!/usr/bin/env bash
# Check approval requirements before stopping (used by stop and subagentStop hooks)
# Blocks stop if there's an active step with approvalRequired: true and no pending-interaction.json
# Works with Claude Code hooks system
export LANG=C.UTF-8

INPUT=$(cat)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
eval "$(echo "$INPUT" | python3 "$SCRIPT_DIR/parse_hook_input.py" session_id)"
AGENTIC_DIR="$HOME/.claude/agentic-processes"

if [ -z "$SESSION_ID" ]; then
    echo '{}'
    exit 0
fi

# Find the active process folder by matching .session file
PROCESS_DIR=""
PROCESS_JSON_FILE=""
for SESSION_FILE in "$AGENTIC_DIR"/active/*/.session; do
    if [ -f "$SESSION_FILE" ] && [ "$(cat "$SESSION_FILE" 2>/dev/null)" = "$SESSION_ID" ]; then
        PROCESS_DIR=$(dirname "$SESSION_FILE")
        PROCESS_JSON_FILE="$PROCESS_DIR/process.json"
        break
    fi
done

if [ -z "$PROCESS_JSON_FILE" ] || [ ! -f "$PROCESS_JSON_FILE" ]; then
    echo '{}'
    exit 0
fi

# Check if pending-interaction.json already exists
PENDING_FILE="$PROCESS_DIR/pending-interaction.json"
if [ -f "$PENDING_FILE" ]; then
  echo '{}'
  exit 0
fi

# Check if any SINGLE step has BOTH status 'in_progress' AND approvalRequired: true,
# and build the block message (with a schema hint when the step declares a view)
python3 "$SCRIPT_DIR/build_approval_block_message.py" "$PROCESS_JSON_FILE" "$SCRIPT_DIR" "$PROCESS_DIR"
exit 0
