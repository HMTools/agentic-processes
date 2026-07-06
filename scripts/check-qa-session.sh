#!/usr/bin/env bash
# Hook: check-qa-session
# Purpose: Block agent continuation when Q&A session is pending user response
# Registered on: UserPromptSubmit
export LANG=C.UTF-8

INPUT=$(cat)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
eval "$(echo "$INPUT" | python3 "$SCRIPT_DIR/parse_hook_input.py" session_id)"
AGENTIC_DIR="$HOME/.claude/agentic-processes"

if [ -z "$SESSION_ID" ]; then
    exit 0
fi

# Find the active process folder by matching .session file
PROCESS_DIR=""
for SESSION_FILE in "$AGENTIC_DIR"/active/*/.session; do
    if [ -f "$SESSION_FILE" ] && [ "$(cat "$SESSION_FILE" 2>/dev/null)" = "$SESSION_ID" ]; then
        PROCESS_DIR=$(dirname "$SESSION_FILE")
        break
    fi
done

if [ -z "$PROCESS_DIR" ]; then
    exit 0
fi

QA_FILE="$PROCESS_DIR/qa-session.json"

if [ ! -f "$QA_FILE" ]; then
  exit 0
fi

# Extract status and unanswered question details
QA_INFO=$(python3 -c "
import json, sys
try:
    with open('$QA_FILE', 'r') as f:
        data = json.load(f)
    status = data.get('status', '')
    if status == 'completed':
        print('completed')
        sys.exit(0)
    questions = data.get('questions', [])
    incomplete = [q for q in questions if q.get('status') != 'completed']
    summary = '; '.join(f\"{q['id']}: {q.get('topic','')} ({q.get('status','')})\" for q in incomplete)
    print(f\"{status}|{summary}\")
except Exception:
    sys.exit(1)
" 2>/dev/null)

if [ "$QA_INFO" = "completed" ]; then
  exit 0
fi

QA_STATUS=$(echo "$QA_INFO" | cut -d'|' -f1)
QA_QUESTIONS=$(echo "$QA_INFO" | cut -d'|' -f2-)

# Block continuation with actionable message
cat << EOF
Q&A Session active — answer all required questions before continuing.

Process: $PROCESS_DIR
Session status: $QA_STATUS
Incomplete questions: $QA_QUESTIONS

To process the user's answers:
  1. Read the session: python3 $SCRIPT_DIR/process_manager.py get-qa-session --process-dir "$PROCESS_DIR"
  2. Answer each question: python3 $SCRIPT_DIR/process_manager.py update-qa-answer --process-dir "$PROCESS_DIR" --question-id "<id>" --answer "<text>"
  3. Complete each question: python3 $SCRIPT_DIR/process_manager.py complete-qa-question --process-dir "$PROCESS_DIR" --question-id "<id>"
  4. Archive session: python3 $SCRIPT_DIR/process_manager.py complete-qa-session --process-dir "$PROCESS_DIR"

After the session is completed, continuation is unblocked.
EOF
exit 1
