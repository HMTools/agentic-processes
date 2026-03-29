#!/usr/bin/env bash
# Create pending-log flag file when user submits a prompt during active process
# This enforces log-first ordering for user interactions

INPUT=$(cat)

SESSION_ID=$(echo "$INPUT" | grep -oP '"session_id"\s*:\s*"\K[^"]*' | head -1)
PROJECT_DIR="$CLAUDE_PROJECT_DIR"
FLAG_DIR=".claude"

if [ -z "$PROJECT_DIR" ] || [ -z "$SESSION_ID" ]; then
    echo '{"continue": true}'
    exit 0
fi

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
    # Create the flag directory if it doesn't exist
    mkdir -p "$PROJECT_DIR/$FLAG_DIR"
    # Create the pending-log flag file
    FLAG_FILE="$PROJECT_DIR/$FLAG_DIR/pending-log-$SESSION_ID"
    touch "$FLAG_FILE"
fi

echo '{"continue": true}'
exit 0
