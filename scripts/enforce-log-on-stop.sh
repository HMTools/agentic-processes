#!/usr/bin/env bash
# Block main agent from stopping when a user interaction hasn't been logged.
# Only registered on Stop (not SubagentStop).
export LANG=C.UTF-8

INPUT=$(cat)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
eval "$(echo "$INPUT" | python3 "$SCRIPT_DIR/parse_hook_input.py" session_id stop_hook_active)"
AGENTIC_DIR="$HOME/.claude/agentic-processes"

if [ -z "$SESSION_ID" ]; then
    exit 0
fi

# Infinite loop guard: if Stop hook already blocked once, allow stop
if [ "$STOP_HOOK_ACTIVE" = "true" ]; then
    exit 0
fi

# Check pending-log flag
FLAG_FILE="$AGENTIC_DIR/flags/pending-log-$SESSION_ID"
if [ ! -f "$FLAG_FILE" ]; then
    exit 0
fi

# Flag exists — user interaction not yet logged
# Find process for better error message
PROCESS_DIR=""
STEP_ID=""
for SESSION_FILE in "$AGENTIC_DIR"/active/*/.session; do
    if [ -f "$SESSION_FILE" ] && [ "$(cat "$SESSION_FILE" 2>/dev/null)" = "$SESSION_ID" ]; then
        PROCESS_DIR=$(dirname "$SESSION_FILE")
        if [ -f "$PROCESS_DIR/process.json" ]; then
            STEP_ID=$(python3 -c "import json; print(json.load(open('$PROCESS_DIR/process.json')).get('currentState',{}).get('activeStep',{}).get('id',''))" 2>/dev/null)
        fi
        break
    fi
done

cat << EOF
{
  "decision": "block",
  "reason": "User interaction not yet logged.\n\nYou cannot stop until the user interaction from this turn is logged.\n\nCommand to log:\n  python3 $SCRIPT_DIR/process_manager.py log-interaction \\\\\n    --process-dir \"$PROCESS_DIR\" \\\\\n    --step-id \"$STEP_ID\" \\\\\n    --request \"User requested: [describe what user asked]\" \\\\\n    --reason \"User feedback on [topic]\" \\\\\n    --response \"Action taken: [what you're doing]\"\n\nAfter logging, the flag will be cleared and you can stop."
}
EOF
exit 0
