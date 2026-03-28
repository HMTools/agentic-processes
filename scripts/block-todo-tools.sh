#!/usr/bin/env bash
# Block Task/Todo tools during active process execution
# Process steps should be the task list, not external todo tools
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
    # GitHub Copilot environment (no session_id — use cwd-based detection)
    SESSION_ID=""
    PROJECT_DIR=$(echo "$INPUT" | grep -o '"cwd":"[^"]*"' | head -1 | cut -d'"' -f4)
    OUTPUT_FORMAT="copilot"
fi

# For Copilot: check toolName manually (no matcher support in Copilot hooks)
if [ "$OUTPUT_FORMAT" = "copilot" ]; then
    TOOL_NAME=$(echo "$INPUT" | grep -o '"toolName":"[^"]*"' | head -1 | cut -d'"' -f4)
    case "$TOOL_NAME" in
        Task|TaskCreate|TaskUpdate) ;;  # continue — these are the tools to check
        *) exit 0 ;;                   # not a task tool — allow
    esac
fi

# For Cursor/Claude: exit if no session_id
if [ "$OUTPUT_FORMAT" != "copilot" ] && [ -z "$SESSION_ID" ]; then
    exit 0
fi

# For Copilot: exit if no project dir found
if [ "$OUTPUT_FORMAT" = "copilot" ] && [ -z "$PROJECT_DIR" ]; then
    exit 0
fi

# Find the active process folder
PROCESS_JSON_FILE=""
if [ "$OUTPUT_FORMAT" = "copilot" ]; then
    # Copilot: find active process by project directory match
    for PROCESS_JSON in "$PROJECT_DIR"/.user-processes/active/*/process.json; do
        if [ -f "$PROCESS_JSON" ]; then
            PROCESS_JSON_FILE="$PROCESS_JSON"
            break
        fi
    done
else
    # Cursor/Claude Code: find by sessionId match
    for PROCESS_JSON in "$PROJECT_DIR"/.user-processes/active/*/process.json; do
        if [ -f "$PROCESS_JSON" ]; then
            if grep -qE "\"sessionId\"[[:space:]]*:[[:space:]]*\"$SESSION_ID\"" "$PROCESS_JSON"; then
                PROCESS_JSON_FILE="$PROCESS_JSON"
                break
            fi
        fi
    done
fi

# No active process — allow the tool
if [ -z "$PROCESS_JSON_FILE" ]; then
    exit 0
fi

# Check if process status is 'running'
if grep -qE '"status"[[:space:]]*:[[:space:]]*"running"' "$PROCESS_JSON_FILE"; then
    if [ "$OUTPUT_FORMAT" = "cursor" ]; then
        cat << 'EOF'
{
  "permission": "deny",
  "user_message": "Task tool blocked during process execution",
  "agent_message": "External todo tools are blocked during process execution — process steps are your task list"
}
EOF
    elif [ "$OUTPUT_FORMAT" = "copilot" ]; then
        cat << 'EOF'
{"permissionDecision":"deny","permissionDecisionReason":"External todo tools are blocked during process execution — process steps are your task list"}
EOF
    else
        cat << 'EOF'
{
  "decision": "block",
  "reason": "External todo tools are blocked during process execution — process steps are your task list"
}
EOF
    fi
    exit 0
fi

exit 0
