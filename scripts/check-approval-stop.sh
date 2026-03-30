#!/usr/bin/env bash
# Check approval requirements before stopping (used by stop and subagentStop hooks)
# Blocks stop if there's an active step with approvalRequired: true and no pending-interaction.json
# Works with Claude Code hooks system

INPUT=$(cat)

SESSION_ID=$(echo "$INPUT" | grep -oP '"session_id"\s*:\s*"\K[^"]*' | head -1)
PROJECT_DIR="$CLAUDE_PROJECT_DIR"

if [ -z "$SESSION_ID" ] || [ -z "$PROJECT_DIR" ]; then
    echo '{}'
    exit 0
fi

# Find the active process folder by matching .session file
PROCESS_DIR=""
PROCESS_JSON_FILE=""
for SESSION_FILE in "$PROJECT_DIR"/.user-processes/active/*/.session; do
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

# Check if any step has status 'in_progress' and approvalRequired: true
HAS_APPROVAL_STEP=false

if grep -qE '"status"[[:space:]]*:[[:space:]]*"in_progress"' "$PROCESS_JSON_FILE"; then
  if grep -qE '"approvalRequired"[[:space:]]*:[[:space:]]*true' "$PROCESS_JSON_FILE"; then
    HAS_APPROVAL_STEP=true
  fi
fi

if [ "$HAS_APPROVAL_STEP" = true ]; then
    cat << 'EOF'
{
  "decision": "block",
  "reason": "Approval checkpoint skipped -- present deliverable and write pending-interaction.json before stopping"
}
EOF
    exit 0
fi

echo '{}'
exit 0
