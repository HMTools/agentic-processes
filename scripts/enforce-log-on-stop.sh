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
cat << 'EOF'
{
  "decision": "block",
  "reason": "User interaction not yet logged. Call process_manager.py log-interaction to record this interaction in log.json before stopping."
}
EOF
exit 0
