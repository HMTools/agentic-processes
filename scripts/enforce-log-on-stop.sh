#!/usr/bin/env bash
# Block main agent from stopping when a user interaction hasn't been logged.
# Only registered on Stop (not SubagentStop).
export LANG=C.UTF-8

INPUT=$(cat)

SESSION_ID=$(echo "$INPUT" | grep -oP '"session_id"\s*:\s*"\K[^"]*' | head -1)
AGENTIC_DIR="$HOME/.claude/agentic-processes"

if [ -z "$SESSION_ID" ]; then
    exit 0
fi

# Infinite loop guard: if Stop hook already blocked once, allow stop
STOP_HOOK_ACTIVE=$(echo "$INPUT" | grep -oP '"stop_hook_active"\s*:\s*\K[a-z]*' | head -1)
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
