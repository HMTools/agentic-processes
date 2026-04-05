#!/usr/bin/env bash
# Create pending-log flag file when user submits a prompt during active process
# This enforces log-first ordering for user interactions
export LANG=C.UTF-8

INPUT=$(cat)

SESSION_ID=$(echo "$INPUT" | grep -oP '"session_id"\s*:\s*"\K[^"]*' | head -1)
PROJECT_DIR="$CLAUDE_PROJECT_DIR"
FLAG_DIR=".claude"

if [ -z "$PROJECT_DIR" ] || [ -z "$SESSION_ID" ]; then
    echo '{"continue": true}'
    exit 0
fi

# Find if there's an active process for this session by matching .session file
HAS_ACTIVE_PROCESS=false
for SESSION_FILE in "$PROJECT_DIR"/.user-processes/active/*/.session; do
    if [ -f "$SESSION_FILE" ] && [ "$(cat "$SESSION_FILE" 2>/dev/null)" = "$SESSION_ID" ]; then
        HAS_ACTIVE_PROCESS=true
        break
    fi
done

if [ "$HAS_ACTIVE_PROCESS" = true ]; then
    # Create the flag directory if it doesn't exist
    mkdir -p "$PROJECT_DIR/$FLAG_DIR"
    # Create the pending-log flag file
    FLAG_FILE="$PROJECT_DIR/$FLAG_DIR/pending-log-$SESSION_ID"
    touch "$FLAG_FILE"
fi

echo '{"continue": true}'
exit 0
