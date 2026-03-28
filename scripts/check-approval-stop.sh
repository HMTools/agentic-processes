#!/usr/bin/env bash
# Check approval requirements before stopping (used by stop and subagentStop hooks)
# Blocks stop if there's an active step with approvalRequired: true and no pending-interaction.json
# Platform-agnostic: works with Cursor, Claude Code, and GitHub Copilot

INPUT=$(cat)

# Platform detection
if [ -n "$CURSOR_PROJECT_DIR" ]; then
    # Cursor environment
    SESSION_ID=$(echo "$INPUT" | grep -o '"conversation_id":"[^"]*"' | head -1 | cut -d'"' -f4)
    PROJECT_DIR="$CURSOR_PROJECT_DIR"
    OUTPUT_FORMAT="cursor"
elif [ -n "$CLAUDE_PROJECT_DIR" ]; then
    # Claude Code environment
    SESSION_ID=$(echo "$INPUT" | grep -o '"session_id":"[^"]*"' | head -1 | cut -d'"' -f4)
    PROJECT_DIR="$CLAUDE_PROJECT_DIR"
    OUTPUT_FORMAT="claude"
else
    # GitHub Copilot environment (not wired to any Copilot hook — defensive only)
    SESSION_ID=""
    PROJECT_DIR=$(echo "$INPUT" | grep -o '"cwd":"[^"]*"' | head -1 | cut -d'"' -f4)
    OUTPUT_FORMAT="copilot"
fi

if [ "$OUTPUT_FORMAT" != "copilot" ] && [ -z "$SESSION_ID" ]; then
    echo '{}'
    exit 0
fi
if [ "$OUTPUT_FORMAT" = "copilot" ] && [ -z "$PROJECT_DIR" ]; then
    echo '{}'
    exit 0
fi

# Find the active process folder
PROCESS_DIR=""
PROCESS_JSON_FILE=""
if [ "$OUTPUT_FORMAT" = "copilot" ]; then
    for PROCESS_JSON in "$PROJECT_DIR"/.user-processes/active/*/process.json; do
        if [ -f "$PROCESS_JSON" ]; then
            PROCESS_JSON_FILE="$PROCESS_JSON"
            PROCESS_DIR=$(dirname "$PROCESS_JSON")
            break
        fi
    done
else
    for PROCESS_JSON in "$PROJECT_DIR"/.user-processes/active/*/process.json; do
        if [ -f "$PROCESS_JSON" ]; then
            if grep -qE "\"sessionId\"[[:space:]]*:[[:space:]]*\"$SESSION_ID\"" "$PROCESS_JSON"; then
                PROCESS_JSON_FILE="$PROCESS_JSON"
                PROCESS_DIR=$(dirname "$PROCESS_JSON")
                break
            fi
        fi
    done
fi

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
    elif [ "$OUTPUT_FORMAT" = "copilot" ]; then
        cat << 'EOF'
{"permissionDecision":"deny","permissionDecisionReason":"Approval checkpoint skipped — present deliverable and write pending-interaction.json before stopping"}
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
