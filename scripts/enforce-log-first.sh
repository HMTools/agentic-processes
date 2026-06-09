#!/usr/bin/env bash
# Enforce log-first ordering for user interactions
export LANG=C.UTF-8

INPUT=$(cat)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
eval "$(echo "$INPUT" | python3 "$SCRIPT_DIR/parse_hook_input.py" session_id tool_name file_path command)"
AGENTIC_DIR="$HOME/.claude/agentic-processes"

if [ -z "$SESSION_ID" ]; then
    exit 0
fi

FLAG_FILE="$AGENTIC_DIR/flags/pending-log-$SESSION_ID"

# No flag = no pending interactions
if [ ! -f "$FLAG_FILE" ]; then
    exit 0
fi

# Flag exists — user message not yet logged

# Only allow process_manager.py operations (script handles validation)
case "$TOOL_NAME" in
    Bash|PowerShell)
        # Check if calling process_manager.py
        case "$COMMAND" in
            *process_manager.py*)
                # Script handles operation validation
                exit 0
                ;;
        esac
        ;;
esac

# Block ALL other operations when flag exists
BLOCK_TOOL=false

case "$TOOL_NAME" in
    Write|Edit|StrReplace|Task)
        # Always block these when flag exists (including log.json direct writes)
        BLOCK_TOOL=true
        ;;
    Bash|PowerShell)
        # Check if command modifies files
        case "$COMMAND" in
            *">"*|*">>"*|*"tee"*|*"write"*|*"sed -i"*|*"rm "*|*"mv "*|*"cp "*)
                BLOCK_TOOL=true
                ;;
        esac
        ;;
esac

if [ "$BLOCK_TOOL" = true ]; then
    # Find process dir for better error message
    PROCESS_DIR=""
    STEP_ID=""
    for SESSION_FILE in "$AGENTIC_DIR"/active/*/.session; do
        if [ -f "$SESSION_FILE" ] && [ "$(cat "$SESSION_FILE" 2>/dev/null)" = "$SESSION_ID" ]; then
            PROCESS_DIR=$(dirname "$SESSION_FILE")
            # Try to get current step from process.json
            if [ -f "$PROCESS_DIR/process.json" ]; then
                STEP_ID=$(python3 -c "import json; print(json.load(open('$PROCESS_DIR/process.json')).get('currentState',{}).get('activeStep',{}).get('id',''))" 2>/dev/null)
            fi
            break
        fi
    done

    cat << EOF
{
  "decision": "block",
  "reason": "User interaction not yet logged.

Before modifying files, you must log the user interaction to maintain the audit trail.

Command to log:
  python3 $SCRIPT_DIR/process_manager.py log-interaction \\
    --process-dir \"$PROCESS_DIR\" \\
    --step-id \"$STEP_ID\" \\
    --request \"User requested: [describe what user asked]\" \\
    --reason \"User feedback on [topic]\" \\
    --response \"Action taken: [what you're doing]\"

After logging, the flag will be cleared and you can proceed."
}
EOF
    exit 0
fi

exit 0
