#!/usr/bin/env bash
# Block main agent from stopping when the process has remaining pending steps.
# Forces auto-advance through non-approval steps.
# Only registered on Stop (not SubagentStop) so step-executor subagents can return.
export LANG=C.UTF-8

INPUT=$(cat)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
eval "$(echo "$INPUT" | python3 "$SCRIPT_DIR/parse_hook_input.py" session_id)"
AGENTIC_DIR="$HOME/.claude/agentic-processes"

if [ -z "$SESSION_ID" ]; then
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
    exit 0
fi

# If pending-interaction.json exists, agent is properly at an approval checkpoint — allow stop
if [ -f "$PROCESS_DIR/pending-interaction.json" ]; then
    exit 0
fi

# Check if process is still running
if ! grep -qE '"status"[[:space:]]*:[[:space:]]*"running"' "$PROCESS_JSON_FILE"; then
    exit 0
fi

# Check if there are any pending steps remaining
if grep -qE '"status"[[:space:]]*:[[:space:]]*"pending"' "$PROCESS_JSON_FILE"; then
    # Extract next pending step info
    NEXT_STEP_INFO=$(python3 -c "
import json
data = json.load(open('$PROCESS_JSON_FILE'))
for s in data.get('steps', []):
    if s.get('status') == 'pending':
        print(str(s.get('number','')) + '|' + s.get('id','') + '|' + s.get('name',''))
        break
" 2>/dev/null)
    NEXT_STEP_NUMBER=$(echo "$NEXT_STEP_INFO" | cut -d'|' -f1)
    NEXT_STEP_ID=$(echo "$NEXT_STEP_INFO" | cut -d'|' -f2)
    NEXT_STEP_NAME=$(echo "$NEXT_STEP_INFO" | cut -d'|' -f3)

    cat << EOF
{
  "decision": "block",
  "reason": "Process has remaining steps — cannot stop yet.\n\nNext step to execute: Step $NEXT_STEP_NUMBER — \"$NEXT_STEP_NAME\" (ID: $NEXT_STEP_ID)\nProcess dir: $PROCESS_DIR\n\nContinue by delegating the next step to the step-executor subagent.\nOnly stop at approval checkpoints (after creating pending-interaction.json via process_manager.py write-pending) or after all steps are complete."
}
EOF
    exit 0
fi

exit 0
