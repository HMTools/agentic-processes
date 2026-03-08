#!/usr/bin/env bash
# Check approval requirements before stopping (used by stop and subagentStop hooks)
# Blocks stop if there's an active step with approvalRequired: true and no pending-interaction.json

INPUT=$(cat)

# Cursor uses conversation_id
SESSION_ID=$(echo "$INPUT" | grep -o '"conversation_id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$SESSION_ID" ]; then
  echo '{}'
  exit 0
fi

# Use CURSOR_PROJECT_DIR (CLAUDE_PROJECT_DIR is also available as alias)
PROJECT_DIR="${CURSOR_PROJECT_DIR:-$CLAUDE_PROJECT_DIR}"

# Find the active process folder by matching sessionId in process.json files
PROCESS_DIR=""
PROCESS_JSON_FILE=""
for PROCESS_JSON in "$PROJECT_DIR"/.user-processes/active/*/process.json; do
  if [ -f "$PROCESS_JSON" ]; then
    if grep -qE "\"sessionId\"[[:space:]]*:[[:space:]]*\"$SESSION_ID\"" "$PROCESS_JSON"; then
      PROCESS_JSON_FILE="$PROCESS_JSON"
      PROCESS_DIR=$(dirname "$PROCESS_JSON")
      break
    fi
  fi
done

# No active process for this session
if [ -z "$PROCESS_JSON_FILE" ]; then
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
# Using grep to find steps with both conditions (simplified check)
HAS_APPROVAL_STEP=false

# Check for in_progress status
if grep -qE '"status"[[:space:]]*:[[:space:]]*"in_progress"' "$PROCESS_JSON_FILE"; then
  # Check for approvalRequired: true
  if grep -qE '"approvalRequired"[[:space:]]*:[[:space:]]*true' "$PROCESS_JSON_FILE"; then
    HAS_APPROVAL_STEP=true
  fi
fi

if [ "$HAS_APPROVAL_STEP" = true ]; then
  cat << 'EOF'
{
  "followup_message": "Approval checkpoint skipped — present deliverable and write pending-interaction.json before stopping"
}
EOF
  exit 0
fi

echo '{}'
exit 0
