#!/bin/bash
# Hook: check-qa-session
# Purpose: Block agent continuation when Q&A session is pending user response
# Trigger: before-agent-turn

PROCESS_PATH="$1"
QA_FILE="$PROCESS_PATH/qa-session.json"

if [ ! -f "$QA_FILE" ]; then
  exit 0  # No Q&A session, allow continuation
fi

# Use Python to parse JSON (more reliable than bash)
STATUS=$(python3 -c "
import json
import sys
try:
    with open('$QA_FILE', 'r') as f:
        data = json.load(f)
        print(data.get('status', ''))
except Exception as e:
    sys.exit(1)
")

if [ "$STATUS" = "completed" ]; then
  exit 0  # All required questions completed, allow continuation
fi

# Block continuation
echo "⏸ Q&A Session Pending: Please answer all required questions before continuing."
echo "Status: $STATUS"
exit 1
