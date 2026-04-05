#!/usr/bin/env bash
# Validate process files after Write/Edit and clear log-first flag
# Checks JSON structure for process.json, memory.json, log.json
export LANG=C.UTF-8

INPUT=$(cat)

SESSION_ID=$(echo "$INPUT" | grep -oP '"session_id"\s*:\s*"\K[^"]*' | head -1)
PROJECT_DIR="$CLAUDE_PROJECT_DIR"
FILE_PATH=$(echo "$INPUT" | grep -oP '"file_path"\s*:\s*"\K[^"]*' | head -1)
FLAG_DIR=".claude"

# Check if it's a log.json write - clear the pending-log flag if exists
if [[ "$FILE_PATH" == *log.json ]]; then
    FLAG_FILE="$PROJECT_DIR/$FLAG_DIR/pending-log-$SESSION_ID"
    if [ -f "$FLAG_FILE" ]; then
        rm -f "$FLAG_FILE"
    fi
fi

# Validate process files structure
case "$FILE_PATH" in
  *process.json)
    if [ -f "$FILE_PATH" ]; then
      # Check for required type discriminator
      if ! grep -qE '"type"[[:space:]]*:[[:space:]]*"process-instance"' "$FILE_PATH"; then
        cat << 'EOF'
{
  "additional_context": "Warning: process.json may be missing 'type: process-instance' discriminator field"
}
EOF
        exit 0
      fi
      # Check for required fields
      HAS_ID=$(grep -cE '"id"[[:space:]]*:' "$FILE_PATH")
      HAS_STATUS=$(grep -cE '"status"[[:space:]]*:' "$FILE_PATH")
      HAS_STEPS=$(grep -cE '"steps"[[:space:]]*:' "$FILE_PATH")
      if [ "$HAS_ID" -eq 0 ] || [ "$HAS_STATUS" -eq 0 ] || [ "$HAS_STEPS" -eq 0 ]; then
        cat << 'EOF'
{
  "additional_context": "Warning: process.json may be missing required fields (id, status, or steps)"
}
EOF
        exit 0
      fi
    fi
    ;;
  *memory.json)
    if [ -f "$FILE_PATH" ]; then
      if ! grep -qE '"type"[[:space:]]*:[[:space:]]*"memory-file"' "$FILE_PATH"; then
        cat << 'EOF'
{
  "additional_context": "Warning: memory.json may be missing 'type: memory-file' discriminator field"
}
EOF
        exit 0
      fi
    fi
    ;;
  *log.json)
    if [ -f "$FILE_PATH" ]; then
      if ! grep -qE '"type"[[:space:]]*:[[:space:]]*"log-file"' "$FILE_PATH"; then
        cat << 'EOF'
{
  "additional_context": "Warning: log.json may be missing 'type: log-file' discriminator field"
}
EOF
        exit 0
      fi
    fi
    ;;
esac

echo '{}'
exit 0
