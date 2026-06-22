"""
Migration script: Add stepDefinition to active process instances.

Resolves each step's stepRef to its source step template, extracts
execution-relevant fields, and embeds them as stepDefinition.
"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

EMBED_FIELDS = ["output", "guidance", "substeps", "flow", "memoryFileUsage", "parameters"]
EXTRA_EMBED_FIELDS = [
    "improvementCategories", "prioritization", "workflow",
    "successCriteria", "complianceChecklist", "searchModes",
    "changeProposalFormat", "captureTypes",
]

STEP_SEARCH_DIRS = [
    Path.home() / ".claude" / "agentic-processes" / "templates" / "processes",
    Path(r"C:\Projects\HM\agentic-process-templates\templates\processes"),
    Path(r"C:\Projects\HM\sdlc-process-templates\templates\processes"),
]

FRAMEWORK_STEPS_DIR = Path(__file__).parent.parent / "framework-steps"


def _build_uuid_registry() -> dict[str, Path]:
    """Scan all step definition directories and build a UUID-to-path registry."""
    registry: dict[str, Path] = {}

    # Scan template process directories for step definition subfolders
    for base in STEP_SEARCH_DIRS:
        if not base.exists():
            continue
        for step_json in base.rglob("*.json"):
            try:
                with open(step_json, encoding="utf-8") as f:
                    data = json.load(f)
                if data.get("type") in ("step", "framework-step") and "id" in data:
                    registry[data["id"]] = step_json
            except (json.JSONDecodeError, KeyError, OSError):
                pass

    # Scan framework steps directory
    if FRAMEWORK_STEPS_DIR.exists():
        for fs_dir in FRAMEWORK_STEPS_DIR.iterdir():
            if not fs_dir.is_dir():
                continue
            step_json = fs_dir / f"{fs_dir.name}.json"
            if step_json.exists():
                try:
                    with open(step_json, encoding="utf-8") as f:
                        data = json.load(f)
                    if "id" in data:
                        registry[data["id"]] = step_json
                except (json.JSONDecodeError, KeyError, OSError):
                    pass

    return registry


def extract_step_definition(step_data: dict) -> dict:
    definition = {}
    for field in EMBED_FIELDS + EXTRA_EMBED_FIELDS:
        if field in step_data:
            definition[field] = step_data[field]
    return definition


def resolve_step_ref(step_ref: str, registry: dict[str, Path]) -> dict | None:
    """Resolve a stepRef UUID to a step definition. UUID-only lookup, no fallback."""
    if not step_ref:
        return None

    # UUID-based lookup
    if step_ref in registry:
        with open(registry[step_ref], encoding="utf-8") as f:
            return json.load(f)

    return None


def migrate_process(process_dir: Path, registry: dict[str, Path]) -> dict:
    process_path = process_dir / "process.json"
    if not process_path.exists():
        return {"status": "skipped", "reason": "no process.json"}

    with open(process_path, encoding="utf-8") as f:
        data = json.load(f)

    backup_path = process_dir / "process.json.bak"
    shutil.copy2(process_path, backup_path)

    modified = 0
    skipped = 0
    unresolved = []

    for step in data.get("steps", []):
        if step.get("stepDefinition"):
            skipped += 1
            continue

        step_ref = step.get("stepRef")
        if not step_ref:
            step["stepDefinition"] = {}
            modified += 1
            continue

        step_template = resolve_step_ref(step_ref, registry)
        if step_template is None:
            unresolved.append(step_ref)
            step["stepDefinition"] = {}
            modified += 1
            continue

        step["stepDefinition"] = extract_step_definition(step_template)
        modified += 1

    with open(process_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    return {
        "status": "migrated",
        "modified": modified,
        "skipped": skipped,
        "unresolved": unresolved,
        "backup": str(backup_path),
    }


def main():
    active_dir = Path.home() / ".claude" / "agentic-processes" / "active"
    if len(sys.argv) > 1:
        active_dir = Path(sys.argv[1])

    if not active_dir.exists():
        print(f"Active directory not found: {active_dir}")
        sys.exit(1)

    registry = _build_uuid_registry()
    print(f"Built UUID registry: {len(registry)} step definitions found.")

    results = {}
    for process_dir in sorted(active_dir.iterdir()):
        if not process_dir.is_dir():
            continue
        result = migrate_process(process_dir, registry)
        results[process_dir.name] = result
        print(f"  {process_dir.name}: {result['status']}"
              f" (modified={result.get('modified', 0)}"
              f", skipped={result.get('skipped', 0)})")
        if result.get("unresolved"):
            for ref in result["unresolved"]:
                print(f"    WARNING: unresolved stepRef: {ref}")

    print(f"\nDone. {len(results)} processes processed.")


if __name__ == "__main__":
    main()
