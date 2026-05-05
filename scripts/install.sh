#!/usr/bin/env bash
# Install/copy agentic-processes framework files to ~/.claude/agentic-processes/
# Copies templates, steps, and types from the plugin repo to the user-scoped location.
# Idempotent: safe to re-run (overwrites on upgrade).
set -euo pipefail

# Resolve the plugin repo root (parent of scripts/)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

TARGET_DIR="$HOME/.claude/agentic-processes"

echo "=== agentic-processes install ==="
echo "Source:  $REPO_DIR/.processes/"
echo "Target:  $TARGET_DIR/"
echo ""

# Create all required directories
for dir in templates steps types guidelines flags active completed failed; do
    mkdir -p "$TARGET_DIR/$dir"
done

# Copy framework files (overwrite on upgrade)
COPIED=0

if [ -d "$REPO_DIR/.processes/templates" ]; then
    cp -r "$REPO_DIR/.processes/templates/"* "$TARGET_DIR/templates/" 2>/dev/null || true
    COUNT=$(find "$REPO_DIR/.processes/templates" -type f | wc -l)
    echo "  Copied $COUNT template files"
    COPIED=$((COPIED + COUNT))
fi

if [ -d "$REPO_DIR/.processes/steps" ]; then
    cp -r "$REPO_DIR/.processes/steps/"* "$TARGET_DIR/steps/" 2>/dev/null || true
    COUNT=$(find "$REPO_DIR/.processes/steps" -type f | wc -l)
    echo "  Copied $COUNT step files"
    COPIED=$((COPIED + COUNT))
fi

if [ -d "$REPO_DIR/.processes/types" ]; then
    cp -r "$REPO_DIR/.processes/types/"* "$TARGET_DIR/types/" 2>/dev/null || true
    COUNT=$(find "$REPO_DIR/.processes/types" -type f | wc -l)
    echo "  Copied $COUNT type files"
    COPIED=$((COPIED + COUNT))
fi

echo ""
echo "=== Install complete ==="
echo "  Total files copied: $COPIED"
echo "  Target directory:   $TARGET_DIR/"
echo ""
echo "Directory structure:"
echo "  $TARGET_DIR/"
echo "    templates/    - Process templates"
echo "    steps/        - Step definitions"
echo "    types/        - TypeScript type definitions"
echo "    guidelines/   - User guidelines"
echo "    flags/        - Runtime flag files"
echo "    active/       - Active process instances"
echo "    completed/    - Completed process instances"
echo "    failed/       - Failed process instances"
