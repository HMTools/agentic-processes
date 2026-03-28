#!/usr/bin/env bash
# Create pending-log flag file when user submits a prompt during active process
# This enforces log-first ordering for user interactions
# Platform-agnostic: works with Cursor, Claude Code, and GitHub Copilot

INPUT=$(cat)

# Platform detection
if [ -n "$CURSOR_PROJECT_DIR" ]; then
    # Cursor environment
    SESSION_ID=$(echo "$INPUT" | grep -o '"conversation_id":"[^"]*"' | head -1 | cut -d'"' -f4)
    PROJECT_DIR="$CURSOR_PROJECT_DIR"
    FLAG_DIR=".cursor"
elif [ -n "$CLAUDE_PROJECT_DIR" ]; then
    # Claude Code environment
    SESSION_ID=$(echo "$INPUT" | grep -o '"session_id":"[^"]*"' | head -1 | cut -d'"' -f4)
    PROJECT_DIR="$CLAUDE_PROJECT_DIR"
    FLAG_DIR=".claude"
else
    # GitHub Copilot environment (no session_id — use cwd and fixed flag name)
    SESSION_ID=""
    PROJECT_DIR=$(echo "$INPUT" | grep -o '"cwd":"[^"]*"' | head -1 | cut -d'"' -f4)
    FLAG_DIR=".github"
fi

if [ -z "$PROJECT_DIR" ]; then
    echo '{"continue": true}'
    exit 0
fi
if [ -n "$CURSOR_PROJECT_DIR" ] && [ -z "$SESSION_ID" ]; then
    echo '{"continue": true}'
    exit 0
fi
if [ -n "$CLAUDE_PROJECT_DIR" ] && [ -z "$SESSION_ID" ]; then
    echo '{"continue": true}'
    exit 0
fi

# Find if there's an active process for this session/project
HAS_ACTIVE_PROCESS=false
if [ -n "$SESSION_ID" ]; then
    # Cursor/Claude Code: find by sessionId
    for PROCESS_JSON in "$PROJECT_DIR"/.user-processes/active/*/process.json; do
        if [ -f "$PROCESS_JSON" ]; then
            if grep -qE "\"sessionId\"[[:space:]]*:[[:space:]]*\"$SESSION_ID\"" "$PROCESS_JSON"; then
                HAS_ACTIVE_PROCESS=true
                break
            fi
        fi
    done
else
    # Copilot: find any active process in the project directory
    for PROCESS_JSON in "$PROJECT_DIR"/.user-processes/active/*/process.json; do
        if [ -f "$PROCESS_JSON" ]; then
            HAS_ACTIVE_PROCESS=true
            break
        fi
    done
fi

if [ "$HAS_ACTIVE_PROCESS" = true ]; then
    # Create the flag directory if it doesn't exist
    mkdir -p "$PROJECT_DIR/$FLAG_DIR"
    # Create the pending-log flag file
    if [ -n "$SESSION_ID" ]; then
        FLAG_FILE="$PROJECT_DIR/$FLAG_DIR/pending-log-$SESSION_ID"
    else
        # Copilot: use fixed flag name (no session_id available)
        FLAG_FILE="$PROJECT_DIR/$FLAG_DIR/pending-log"
    fi
    touch "$FLAG_FILE"
fi

echo '{"continue": true}'
exit 0
