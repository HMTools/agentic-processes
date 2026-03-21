#!/usr/bin/env bash
# Check approval requirements before stopping (used by stop and subagentStop hooks)
# Blocks stop if there's an active step with approvalRequired: true and no pending-interaction.json
# Platform-agnostic: works with both Cursor and Claude Code

INPUT=$(cat)

# Platform detection
if [ -n "$CURSOR_PROJECT_DIR" ]; then
    # Cursor environment
    SESSION_ID=$(echo "$INPUT" | grep -o '"conversation_id":"[^"]*"' | head -1 | cut -d'"' -f4)
    PROJECT_DIR="$CURSOR_PROJECT_DIR"
    OUTPUT_FORMAT="cursor"
else
    # Claude Code environment
    SESSION_ID=$(echo "$INPUT" | grep -o '"session_id":"[^"]*"' | head -1 | cut -d'"' -f4)
    PROJECT_DIR="$CLAUDE_PROJECT_DIR"
    OUTPUT_FORMAT="claude"
fi

if [ -z "$SESSION_ID" ]; then
  echo '{}'
  exit 0
fi

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
HAS_APPROVAL_STEP=false

if grep -qE '"status"[[:space:]]*:[[:space:]]*"in_progress"' "$PROCESS_JSON_FILE"; then
  if grep -qE '"approvalRequired"[[:space:]]*:[[:space:]]*true' "$PROCESS_JSON_FILE"; then
    HAS_APPROVAL_STEP=true
  fi
fi

if [ "$HAS_APPROVAL_STEP" = true ]; then
  if [ "$OUTPUT_FORMAT" = "cursor" ]; then
    cat << 'EOF'
{
  "followup_message": "Approval checkpoint skipped — present deliverable and write pending-interaction.json before stopping"
}
EOF
  else
    cat << 'EOF'
{
  "decision": "block",
  "reason": "Approval checkpoint skipped — present deliverable and write pending-interaction.json before stopping"
}
EOF
  fi
  exit 0
fi

echo '{}'
exit 0
