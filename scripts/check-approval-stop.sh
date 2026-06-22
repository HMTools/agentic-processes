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

# Check if any SINGLE step has BOTH status 'in_progress' AND approvalRequired: true
# Uses Python to check both conditions on the same step object (not file-wide grep)
STEP_INFO=$(python3 -c "
import json
data = json.load(open('$PROCESS_JSON_FILE'))
for s in data.get('steps', []):
    if s.get('status') in ('in_progress', 'in-progress') and s.get('approvalRequired'):
        print(s.get('id','') + '|' + s.get('name',''))
        break
" 2>/dev/null)

if [ -n "$STEP_INFO" ]; then
    APPROVAL_STEP_ID=$(echo "$STEP_INFO" | cut -d'|' -f1)
    APPROVAL_STEP_NAME=$(echo "$STEP_INFO" | cut -d'|' -f2)

    cat << EOF
{
  "decision": "block",
  "reason": "Approval checkpoint required — step \"$APPROVAL_STEP_NAME\" (ID: $APPROVAL_STEP_ID) has approvalRequired: true but no pending-interaction.json exists.\n\nBefore stopping, you must:\n  1. Present your deliverables to the user\n  2. Create the approval checkpoint using process-state-update skill:\n       python3 $SCRIPT_DIR/process_manager.py write-pending \\\\\n         --process-dir \"$PROCESS_DIR\" \\\\\n         --options '[{\"id\": \"approve\", \"label\": \"Approve\", \"isDefault\": true}, {\"id\": \"reject\", \"label\": \"Reject\"}, {\"id\": \"modify\", \"label\": \"Request Changes\"}]'\n\nAfter creating the checkpoint, stopping is allowed."
}
EOF
    exit 0
fi

echo '{}'
exit 0
