"""
Template Manager CLI — manages git-based template sources for agentic-processes.

Subcommands:
  init            Create runtime directories and default config
  add-source      Add a template source to config
  remove-source   Remove a template source from config
  list-sources    List configured template sources with status
  sync            Fetch/update templates from configured git sources
  status          Show sync status per source and template counts
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from models import (
    TemplateSource,
    TemplateSourcesConfig,
    read_json,
    write_json,
)

# --- Constants ---

RUNTIME_BASE = Path.home() / ".claude" / "agentic-processes"
CONFIG_DIR = RUNTIME_BASE / "config"
CONFIG_FILE = CONFIG_DIR / "template-sources.json"
CACHE_DIR = RUNTIME_BASE / "cache" / "sources"
TEMPLATES_DIR = RUNTIME_BASE / "templates"
PROCESSES_DIR = TEMPLATES_DIR / "processes"
STEPS_DIR = TEMPLATES_DIR / "steps"

RUNTIME_DIRS = [
    RUNTIME_BASE / "active",
    RUNTIME_BASE / "completed",
    RUNTIME_BASE / "failed",
    RUNTIME_BASE / "flags",
    RUNTIME_BASE / "guidelines",
    CONFIG_DIR,
    CACHE_DIR,
    PROCESSES_DIR,
    STEPS_DIR,
]

# Locate the default config shipped with the plugin
_SCRIPT_DIR = Path(__file__).resolve().parent
_PLUGIN_ROOT = _SCRIPT_DIR.parent
DEFAULT_CONFIG_FILE = _PLUGIN_ROOT / "config" / "template-sources.default.json"


# --- Output helpers (match process_manager.py convention) ---


def _ok(data: dict | None = None) -> None:
    result: dict = {"status": "ok"}
    if data:
        result.update(data)
    json.dump(result, sys.stdout, indent=2, ensure_ascii=False)
    print()


def _error(msg: str) -> None:
    json.dump({"status": "error", "message": msg}, sys.stdout, indent=2, ensure_ascii=False)
    print()
    sys.exit(1)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


# --- Git helpers ---


def _git_available() -> bool:
    """Check if git is available on the system."""
    try:
        subprocess.run(
            ["git", "--version"],
            capture_output=True,
            check=True,
            timeout=10,
        )
        return True
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
        return False


def _git_clone(url: str, branch: str, dest: Path) -> tuple[bool, str]:
    """Shallow-clone a git repo. Returns (success, message)."""
    try:
        subprocess.run(
            ["git", "clone", "--depth", "1", "--branch", branch, url, str(dest)],
            capture_output=True,
            check=True,
            timeout=120,
        )
        return True, f"Cloned {url} (branch: {branch})"
    except subprocess.CalledProcessError as e:
        stderr = e.stderr.decode("utf-8", errors="replace").strip() if e.stderr else str(e)
        return False, f"Clone failed for {url}: {stderr}"
    except subprocess.TimeoutExpired:
        return False, f"Clone timed out for {url}"


def _git_pull(repo_dir: Path) -> tuple[bool, str]:
    """Pull latest changes in an existing repo. Returns (success, message)."""
    try:
        result = subprocess.run(
            ["git", "-C", str(repo_dir), "pull"],
            capture_output=True,
            check=True,
            timeout=120,
        )
        stdout = result.stdout.decode("utf-8", errors="replace").strip()
        return True, f"Updated: {stdout}"
    except subprocess.CalledProcessError as e:
        stderr = e.stderr.decode("utf-8", errors="replace").strip() if e.stderr else str(e)
        return False, f"Pull failed: {stderr}"
    except subprocess.TimeoutExpired:
        return False, "Pull timed out"


# --- Config helpers ---


def _load_config() -> TemplateSourcesConfig:
    """Load template sources config, or return empty config if not found."""
    if CONFIG_FILE.exists():
        data = read_json(CONFIG_FILE)
        return TemplateSourcesConfig.from_dict(data)
    return TemplateSourcesConfig.create()


def _save_config(config: TemplateSourcesConfig) -> None:
    """Write template sources config to disk."""
    write_json(CONFIG_FILE, config.to_dict())


# --- Template copying ---


def _copy_templates(source_dir: Path, kind: str, installed: dict[str, str]) -> list[str]:
    """
    Copy templates from a source cache directory to the runtime templates directory.

    Args:
        source_dir: The cache directory for a specific source.
        kind: Either "processes" or "steps".
        installed: Dict of {template_relative_path: source_name} already installed
                   (for conflict detection).

    Returns:
        List of templates copied (as relative paths like "category/name").
    """
    src = source_dir / "templates" / kind
    if not src.exists():
        return []

    if kind == "processes":
        dest = PROCESSES_DIR
    else:
        dest = STEPS_DIR

    copied = []
    # Walk the source templates directory
    for item in sorted(src.iterdir()):
        if not item.is_dir():
            continue
        # item is a category directory (e.g., "development", "api")
        category = item.name
        for template in sorted(item.iterdir()):
            if not template.is_dir():
                continue
            rel_path = f"{category}/{template.name}"

            # Conflict check: skip if already installed from higher-priority source
            if rel_path in installed:
                continue

            dest_path = dest / category / template.name
            if dest_path.exists():
                shutil.rmtree(dest_path)
            shutil.copytree(template, dest_path)
            copied.append(rel_path)

    # Also copy top-level non-category items for steps (e.g., underscore-prefixed folders)
    if kind == "steps":
        for item in sorted(src.iterdir()):
            if item.is_dir() and item.name.startswith("_"):
                rel_path = item.name
                if rel_path in installed:
                    continue
                dest_path = dest / item.name
                if dest_path.exists():
                    shutil.rmtree(dest_path)
                shutil.copytree(item, dest_path)
                copied.append(rel_path)
            elif item.is_file():
                # Copy loose files, skip .md files (except README.md)
                if item.suffix == '.md' and item.name != 'README.md':
                    continue
                shutil.copy2(item, dest / item.name)

    if kind == "processes":
        # Copy loose files, skip .md files (except README.md)
        for item in sorted(src.iterdir()):
            if item.is_file():
                if item.suffix == '.md' and item.name != 'README.md':
                    continue
                shutil.copy2(item, dest / item.name)

    return copied


def _count_templates(base_dir: Path) -> int:
    """Count template directories (category/name pairs) under a base directory."""
    count = 0
    if not base_dir.exists():
        return 0
    for category in base_dir.iterdir():
        if not category.is_dir() or category.name.startswith("_"):
            continue
        for template in category.iterdir():
            if template.is_dir():
                count += 1
    return count


# --- Subcommand handlers ---


def cmd_init(args: argparse.Namespace) -> None:
    """Create all runtime directories and write default config if not present."""
    created_dirs = []
    for d in RUNTIME_DIRS:
        if not d.exists():
            d.mkdir(parents=True, exist_ok=True)
            created_dirs.append(str(d))

    config_created = False
    if not CONFIG_FILE.exists():
        if DEFAULT_CONFIG_FILE.exists():
            shutil.copy2(DEFAULT_CONFIG_FILE, CONFIG_FILE)
            config_created = True
        else:
            # Write a minimal default config
            default_config = TemplateSourcesConfig.create(
                sources=[
                    TemplateSource.create(
                        name="official",
                        url="https://github.com/user/agentic-process-templates.git",
                        branch="main",
                        priority=100,
                    )
                ]
            )
            _save_config(default_config)
            config_created = True

    _ok({
        "dirsCreated": created_dirs,
        "configCreated": config_created,
        "configPath": str(CONFIG_FILE),
    })


def cmd_add_source(args: argparse.Namespace) -> None:
    """Add a template source to the configuration."""
    config = _load_config()

    # Check for duplicate name
    for source in config.sources:
        if source.name == args.name:
            _error(f"Source '{args.name}' already exists. Remove it first or use a different name.")

    new_source = TemplateSource.create(
        name=args.name,
        url=args.url,
        branch=args.branch or "main",
        priority=args.priority if args.priority is not None else 100,
    )

    config.sources.append(new_source)
    _save_config(config)

    _ok({
        "source": new_source.to_dict(),
        "totalSources": len(config.sources),
    })


def cmd_remove_source(args: argparse.Namespace) -> None:
    """Remove a template source from the configuration."""
    config = _load_config()

    original_count = len(config.sources)
    config.sources = [s for s in config.sources if s.name != args.name]

    if len(config.sources) == original_count:
        _error(f"Source '{args.name}' not found")

    # Optionally clean up the cache for the removed source
    cache_dir = CACHE_DIR / args.name
    cache_removed = False
    if cache_dir.exists():
        shutil.rmtree(cache_dir)
        cache_removed = True

    _save_config(config)

    _ok({
        "removed": args.name,
        "cacheRemoved": cache_removed,
        "totalSources": len(config.sources),
    })


def cmd_toggle_source(args: argparse.Namespace) -> None:
    """Toggle the enabled flag on a template source."""
    config = _load_config()

    found = False
    for source in config.sources:
        if source.name == args.name:
            source.enabled = not source.enabled
            found = True
            break

    if not found:
        _error(f"Source '{args.name}' not found")

    _save_config(config)

    _ok({
        "name": args.name,
        "enabled": source.enabled,
        "totalSources": len(config.sources),
    })


def cmd_update_source(args: argparse.Namespace) -> None:
    """Update properties of an existing template source."""
    config = _load_config()

    target = None
    for source in config.sources:
        if source.name == args.name:
            target = source
            break

    if target is None:
        _error(f"Source '{args.name}' not found")

    name_changed = False
    cache_renamed = False

    if args.new_name and args.new_name != target.name:
        for s in config.sources:
            if s.name == args.new_name:
                _error(f"Source '{args.new_name}' already exists")

        old_cache = CACHE_DIR / target.name
        new_cache = CACHE_DIR / args.new_name
        if old_cache.exists():
            old_cache.rename(new_cache)
            cache_renamed = True

        target.name = args.new_name
        name_changed = True

    if args.url is not None:
        target.url = args.url
    if args.branch is not None:
        target.branch = args.branch
    if args.priority is not None:
        target.priority = args.priority

    _save_config(config)

    _ok({
        "source": target.to_dict(),
        "nameChanged": name_changed,
        "cacheRenamed": cache_renamed,
    })


def cmd_list_sources(args: argparse.Namespace) -> None:
    """List all configured template sources with status."""
    config = _load_config()

    sources_info = []
    for source in sorted(config.sources, key=lambda s: s.priority):
        cache_dir = CACHE_DIR / source.name
        sources_info.append({
            **source.to_dict(),
            "cached": cache_dir.exists(),
        })

    _ok({
        "sources": sources_info,
        "settings": config.settings,
    })


def cmd_sync(args: argparse.Namespace) -> None:
    """Sync templates from configured git sources."""
    # Auto-init first
    for d in RUNTIME_DIRS:
        d.mkdir(parents=True, exist_ok=True)
    if not CONFIG_FILE.exists():
        if DEFAULT_CONFIG_FILE.exists():
            shutil.copy2(DEFAULT_CONFIG_FILE, CONFIG_FILE)
        else:
            default_config = TemplateSourcesConfig.create(
                sources=[
                    TemplateSource.create(
                        name="official",
                        url="https://github.com/user/agentic-process-templates.git",
                    )
                ]
            )
            _save_config(default_config)

    if not _git_available():
        _error("git is not available on this system. Install git and try again.")

    config = _load_config()

    # Filter sources
    sources_to_sync = [s for s in config.sources if s.enabled]
    if args.source:
        sources_to_sync = [s for s in sources_to_sync if s.name == args.source]
        if not sources_to_sync:
            _error(f"Source '{args.source}' not found or not enabled")

    # Sort by priority (lower number = higher priority = synced first)
    sources_to_sync.sort(key=lambda s: s.priority)

    sync_results = []
    # Track installed templates to detect conflicts
    installed_processes: dict[str, str] = {}  # rel_path -> source_name
    installed_steps: dict[str, str] = {}

    for source in sources_to_sync:
        cache_dir = CACHE_DIR / source.name
        result: dict = {"source": source.name, "operations": []}

        # Clone or pull
        if not cache_dir.exists():
            success, msg = _git_clone(source.url, source.branch, cache_dir)
            result["operations"].append({"type": "clone", "success": success, "message": msg})
        else:
            success, msg = _git_pull(cache_dir)
            result["operations"].append({"type": "pull", "success": success, "message": msg})

        if not success:
            # If clone/pull failed but cache exists, use cached version
            if cache_dir.exists():
                result["operations"].append({
                    "type": "fallback",
                    "message": "Using cached version after sync failure",
                })
            else:
                result["success"] = False
                sync_results.append(result)
                continue

        # Copy templates from cache to runtime directories
        processes_copied = _copy_templates(cache_dir, "processes", installed_processes)
        steps_copied = _copy_templates(cache_dir, "steps", installed_steps)

        # Track what was installed for conflict detection
        for p in processes_copied:
            installed_processes[p] = source.name
        for s in steps_copied:
            installed_steps[s] = source.name

        # Log conflicts (templates that existed but were skipped)
        conflicts = []
        process_src = cache_dir / "templates" / "processes"
        if process_src.exists():
            for category in process_src.iterdir():
                if not category.is_dir() or category.name.startswith("_"):
                    continue
                for template in category.iterdir():
                    if not template.is_dir():
                        continue
                    rel = f"{category.name}/{template.name}"
                    if rel in installed_processes and installed_processes[rel] != source.name:
                        conflicts.append({
                            "template": rel,
                            "type": "process",
                            "winningSouce": installed_processes[rel],
                        })

        step_src = cache_dir / "templates" / "steps"
        if step_src.exists():
            for category in step_src.iterdir():
                if not category.is_dir() or category.name.startswith("_"):
                    continue
                for template in category.iterdir():
                    if not template.is_dir():
                        continue
                    rel = f"{category.name}/{template.name}"
                    if rel in installed_steps and installed_steps[rel] != source.name:
                        conflicts.append({
                            "template": rel,
                            "type": "step",
                            "winningSource": installed_steps[rel],
                        })

        # Update lastSynced on the source in config
        now = _now_iso()
        for s in config.sources:
            if s.name == source.name:
                s.lastSynced = now
                break

        result["success"] = True
        result["processesCopied"] = processes_copied
        result["stepsCopied"] = steps_copied
        result["conflicts"] = conflicts
        result["syncedAt"] = now
        sync_results.append(result)

    _save_config(config)

    _ok({
        "syncResults": sync_results,
        "totalProcessTemplates": _count_templates(PROCESSES_DIR),
        "totalStepTemplates": _count_templates(STEPS_DIR),
    })


def cmd_status(args: argparse.Namespace) -> None:
    """Show sync status for all configured sources."""
    config = _load_config()

    sources_status = []
    for source in sorted(config.sources, key=lambda s: s.priority):
        cache_dir = CACHE_DIR / source.name
        sources_status.append({
            "name": source.name,
            "url": source.url,
            "branch": source.branch,
            "enabled": source.enabled,
            "priority": source.priority,
            "lastSynced": source.lastSynced,
            "cached": cache_dir.exists(),
        })

    _ok({
        "sources": sources_status,
        "templates": {
            "processes": _count_templates(PROCESSES_DIR),
            "steps": _count_templates(STEPS_DIR),
            "processesPath": str(PROCESSES_DIR),
            "stepsPath": str(STEPS_DIR),
        },
        "settings": config.settings,
    })


# --- CLI setup ---


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Template Manager — manages git-based template sources for agentic-processes",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # init
    p_init = subparsers.add_parser("init", help="Create runtime directories and default config")
    p_init.set_defaults(func=cmd_init)

    # add-source
    p_add = subparsers.add_parser("add-source", help="Add a template source")
    p_add.add_argument("--name", required=True, help="Unique name for the source")
    p_add.add_argument("--url", required=True, help="Git repository URL")
    p_add.add_argument("--branch", default="main", help="Branch to track (default: main)")
    p_add.add_argument("--priority", type=int, default=100, help="Priority (lower = higher, default: 100)")
    p_add.set_defaults(func=cmd_add_source)

    # remove-source
    p_remove = subparsers.add_parser("remove-source", help="Remove a template source")
    p_remove.add_argument("--name", required=True, help="Name of the source to remove")
    p_remove.set_defaults(func=cmd_remove_source)

    # toggle-source
    p_toggle = subparsers.add_parser("toggle-source", help="Toggle a source enabled/disabled")
    p_toggle.add_argument("--name", required=True, help="Name of the source to toggle")
    p_toggle.set_defaults(func=cmd_toggle_source)

    # update-source
    p_update = subparsers.add_parser("update-source", help="Update properties of an existing template source")
    p_update.add_argument("--name", required=True, help="Current name of the source to update")
    p_update.add_argument("--new-name", default=None, help="New name for the source")
    p_update.add_argument("--url", default=None, help="New git repository URL")
    p_update.add_argument("--branch", default=None, help="New branch to track")
    p_update.add_argument("--priority", type=int, default=None, help="New priority value")
    p_update.set_defaults(func=cmd_update_source)

    # list-sources
    p_list = subparsers.add_parser("list-sources", help="List configured template sources")
    p_list.set_defaults(func=cmd_list_sources)

    # sync
    p_sync = subparsers.add_parser("sync", help="Sync templates from git sources")
    p_sync.add_argument("--source", default=None, help="Sync only this source (by name)")
    p_sync.set_defaults(func=cmd_sync)

    # status
    p_status = subparsers.add_parser("status", help="Show sync status")
    p_status.set_defaults(func=cmd_status)

    parsed = parser.parse_args()
    try:
        parsed.func(parsed)
    except json.JSONDecodeError as e:
        _error(f"Invalid JSON: {e}")
    except Exception as e:
        _error(str(e))


if __name__ == "__main__":
    main()
