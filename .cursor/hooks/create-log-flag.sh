#!/usr/bin/env bash
# Create pending-log flag file when user submits a prompt during active process
# This enforces log-first ordering for user interactions

INPUT=$(cat)

# Cursor uses conversation_id
SESSION_ID=$(echo "$INPUT" | grep -o '"conversation_id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$SESSION_ID" ]; then
  echo '{"continue": true}'
  exit 0
fi

# Use CURSOR_PROJECT_DIR (CLAUDE_PROJECT_DIR is also available as alias)
PROJECT_DIR="${CURSOR_PROJECT_DIR:-$CLAUDE_PROJECT_DIR}"

# Find if there's an active process for this session
HAS_ACTIVE_PROCESS=false
for PROCESS_JSON in "$PROJECT_DIR"/.user-processes/active/*/process.json; do
  if [ -f "$PROCESS_JSON" ]; then
    if grep -qE "\"sessionId\"[[:space:]]*:[[:space:]]*\"$SESSION_ID\"" "$PROCESS_JSON"; then
      HAS_ACTIVE_PROCESS=true
      break
    fi
  fi
done

if [ "$HAS_ACTIVE_PROCESS" = true ]; then
  # Create the pending-log flag file
  FLAG_FILE="$PROJECT_DIR/.cursor/pending-log-$SESSION_ID"
  touch "$FLAG_FILE"
fi

echo '{"continue": true}'
exit 0
