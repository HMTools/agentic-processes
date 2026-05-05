#!/usr/bin/env bash
# Migrate existing process instances from project-scoped .user-processes/ to ~/.claude/agentic-processes/
# One-shot migration script for existing users.
#
# Usage: ./migrate-to-claude-dir.sh <PROJECT_DIR>
#
# Performs:
# - Moves active/ completed/ failed/ process instances
# - Copies guidelines/
# - Updates process.json in each moved process:
#   - projectPath (string) -> projectPaths (array)
#   - processPath -> absolute path
#   - @framework-step: -> @step: in stepRef fields
set -euo pipefail

if [ $# -lt 1 ]; then
    echo "Usage: $0 <PROJECT_DIR>"
    echo "  PROJECT_DIR: The project root to migrate from (contains .user-processes/)"
    exit 1
fi

PROJECT_DIR="$1"
TARGET_DIR="$HOME/.claude/agentic-processes"

if [ ! -d "$PROJECT_DIR/.user-processes" ]; then
    echo "Error: $PROJECT_DIR/.user-processes/ does not exist. Nothing to migrate."
    exit 1
fi

echo "=== agentic-processes migration ==="
echo "Source:  $PROJECT_DIR/.user-processes/"
echo "Target:  $TARGET_DIR/"
echo ""

# Ensure target directories exist
for dir in active completed failed guidelines flags; do
    mkdir -p "$TARGET_DIR/$dir"
done

MOVED=0
UPDATED=0

# Move process instances from active/, completed/, failed/
for status_dir in active completed failed; do
    src="$PROJECT_DIR/.user-processes/$status_dir"
    if [ ! -d "$src" ]; then
        continue
    fi

    for process_dir in "$src"/*/; do
        [ -d "$process_dir" ] || continue
        dir_name=$(basename "$process_dir")
        dest="$TARGET_DIR/$status_dir/$dir_name"

        if [ -d "$dest" ]; then
            echo "  SKIP: $status_dir/$dir_name (already exists at target)"
            continue
        fi

        # Move the process directory
        mv "$process_dir" "$dest"
        echo "  MOVED: $status_dir/$dir_name"
        MOVED=$((MOVED + 1))

        # Update process.json if it exists
        process_json="$dest/process.json"
        if [ -f "$process_json" ]; then
            python3 -c "
import json, sys

path = sys.argv[1]
abs_process_path = sys.argv[2]

with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

changed = False

# projectPath -> projectPaths (array)
meta = data.get('metadata', {})
if 'projectPath' in meta:
    old_val = meta.pop('projectPath')
    if old_val:
        meta['projectPaths'] = [old_val]
    else:
        meta['projectPaths'] = []
    changed = True

# processPath -> absolute
if 'processPath' in meta:
    meta['processPath'] = abs_process_path
    changed = True

# @framework-step: -> @step: and @user-step: -> @step: in stepRef
for step in data.get('steps', []):
    ref = step.get('stepRef', '')
    new_ref = ref.replace('@framework-step:', '@step:').replace('@user-step:', '@step:')
    if new_ref != ref:
        step['stepRef'] = new_ref
        changed = True

if changed:
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print(f'  UPDATED: {path}')
" "$process_json" "$dest"
            UPDATED=$((UPDATED + 1))
        fi
    done
done

# Copy guidelines (non-destructive -- keep originals)
guidelines_src="$PROJECT_DIR/.user-processes/guidelines"
if [ -d "$guidelines_src" ]; then
    GUIDELINE_COUNT=0
    for guideline_file in "$guidelines_src"/*; do
        [ -f "$guideline_file" ] || continue
        cp "$guideline_file" "$TARGET_DIR/guidelines/"
        GUIDELINE_COUNT=$((GUIDELINE_COUNT + 1))
    done
    if [ $GUIDELINE_COUNT -gt 0 ]; then
        echo "  COPIED: $GUIDELINE_COUNT guideline files"
    fi
fi

echo ""
echo "=== Migration complete ==="
echo "  Processes moved:   $MOVED"
echo "  Processes updated: $UPDATED"
echo "  Target directory:  $TARGET_DIR/"
echo ""
echo "The original .user-processes/ directory at $PROJECT_DIR can be removed"
echo "after verifying the migration was successful."
