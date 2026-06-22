"""
Template Manager CLI — manages template marketplaces for agentic-processes.

Subcommands:
  init               Create runtime directories and default config
  add-marketplace    Add a marketplace to config
  remove-marketplace Remove a marketplace from config
  toggle-marketplace Toggle a marketplace enabled/disabled
  update-marketplace Update marketplace properties
  list-marketplaces  List configured marketplaces with status
  refresh            Fetch/update git caches for all enabled marketplaces
  catalog            List all available templates across marketplaces
  install            Install a specific template from a marketplace
  uninstall          Uninstall a specific template
  status             Show marketplace status and template counts
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
    Marketplace,
    MarketplaceConfig,
    InstalledTemplate,
    InstalledTemplatesManifest,
    read_json,
    write_json,
)

# --- Constants ---

RUNTIME_BASE = Path.home() / ".claude" / "agentic-processes"
CONFIG_DIR = RUNTIME_BASE / "config"
MARKETPLACE_CONFIG_FILE = CONFIG_DIR / "marketplaces.json"
INSTALLED_MANIFEST = CONFIG_DIR / "installed-templates.json"
CACHE_DIR = RUNTIME_BASE / "cache" / "sources"
TEMPLATES_DIR = RUNTIME_BASE / "templates"
PROCESSES_DIR = TEMPLATES_DIR / "processes"

# Legacy config file path for auto-migration
LEGACY_CONFIG_FILE = CONFIG_DIR / "template-sources.json"

RUNTIME_DIRS = [
    RUNTIME_BASE / "active",
    RUNTIME_BASE / "completed",
    RUNTIME_BASE / "failed",
    RUNTIME_BASE / "flags",
    RUNTIME_BASE / "guidelines",
    CONFIG_DIR,
    CACHE_DIR,
    PROCESSES_DIR,
]

# Locate the default config shipped with the plugin
_SCRIPT_DIR = Path(__file__).resolve().parent
_PLUGIN_ROOT = _SCRIPT_DIR.parent
DEFAULT_CONFIG_FILE = _PLUGIN_ROOT / "config" / "marketplaces.default.json"


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


def _git_commit_hash(repo_dir: Path) -> str:
    """Get the current HEAD commit hash for a git repo."""
    try:
        result = subprocess.run(
            ["git", "-C", str(repo_dir), "rev-parse", "HEAD"],
            capture_output=True,
            check=True,
            timeout=10,
        )
        return result.stdout.decode("utf-8", errors="replace").strip()
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
        return "unknown"


# --- Config helpers ---


def _migrate_legacy_config() -> bool:
    """Auto-migrate old template-sources.json to marketplaces.json. Returns True if migrated."""
    if not LEGACY_CONFIG_FILE.exists():
        return False
    if MARKETPLACE_CONFIG_FILE.exists():
        # New config already exists; just delete the old one
        LEGACY_CONFIG_FILE.unlink()
        return False

    data = read_json(LEGACY_CONFIG_FILE)
    # Transform: sources -> marketplaces, autoSyncOnStale -> autoRefreshOnStale
    new_data: dict = {
        "marketplaces": data.get("sources", []),
        "settings": {},
    }
    old_settings = data.get("settings", {})
    new_data["settings"]["autoRefreshOnStale"] = old_settings.get("autoSyncOnStale", False)
    new_data["settings"]["staleDurationMinutes"] = old_settings.get("staleDurationMinutes", 1440)

    write_json(MARKETPLACE_CONFIG_FILE, new_data)
    LEGACY_CONFIG_FILE.unlink()
    return True


def _load_config() -> MarketplaceConfig:
    """Load marketplace config, auto-migrating from legacy format if needed."""
    _migrate_legacy_config()
    if MARKETPLACE_CONFIG_FILE.exists():
        data = read_json(MARKETPLACE_CONFIG_FILE)
        return MarketplaceConfig.from_dict(data)
    return MarketplaceConfig.create()


def _save_config(config: MarketplaceConfig) -> None:
    """Write marketplace config to disk."""
    write_json(MARKETPLACE_CONFIG_FILE, config.to_dict())


# --- Installed templates manifest helpers ---


def _load_manifest() -> InstalledTemplatesManifest:
    """Load the installed templates manifest, or return empty if not found."""
    if INSTALLED_MANIFEST.exists():
        data = read_json(INSTALLED_MANIFEST)
        return InstalledTemplatesManifest.from_dict(data)
    return InstalledTemplatesManifest.create()


def _save_manifest(manifest: InstalledTemplatesManifest) -> None:
    """Write installed templates manifest to disk."""
    manifest.lastUpdated = _now_iso()
    write_json(INSTALLED_MANIFEST, manifest.to_dict())


# --- Template metadata and catalog ---


def _get_template_metadata(cache_dir: Path) -> list[dict]:
    """Scan a cached marketplace repo for template metadata. Returns list of template info dicts."""
    templates = []

    for kind in ("processes",):
        src = cache_dir / "templates" / kind
        if not src.exists():
            continue

        template_type = "process"

        for category_dir in sorted(src.iterdir()):
            if not category_dir.is_dir() or category_dir.name.startswith("_"):
                continue
            category = category_dir.name
            for template_dir in sorted(category_dir.iterdir()):
                if not template_dir.is_dir():
                    continue
                # Try to read template JSON for metadata
                title = template_dir.name
                description = ""

                # Look for a JSON file matching the template name
                json_file = template_dir / f"{template_dir.name}.json"
                if json_file.exists():
                    try:
                        tdata = read_json(json_file)
                        metadata = tdata.get("metadata", {})
                        title = metadata.get("title", template_dir.name)
                        description = metadata.get("purposeAndUsage", "")
                    except Exception:
                        pass

                templates.append({
                    "name": template_dir.name,
                    "title": title,
                    "category": category,
                    "type": template_type,
                    "description": description,
                })

    return templates


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

    # Auto-migrate legacy config
    migrated = _migrate_legacy_config()

    config_created = False
    if not MARKETPLACE_CONFIG_FILE.exists():
        if DEFAULT_CONFIG_FILE.exists():
            shutil.copy2(DEFAULT_CONFIG_FILE, MARKETPLACE_CONFIG_FILE)
            config_created = True
        else:
            # Write a minimal default config
            default_config = MarketplaceConfig.create(
                marketplaces=[
                    Marketplace.create(
                        name="official",
                        url="https://github.com/HMTools/agentic-process-templates.git",
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
        "configMigrated": migrated,
        "configPath": str(MARKETPLACE_CONFIG_FILE),
    })


def cmd_add_marketplace(args: argparse.Namespace) -> None:
    """Add a marketplace to the configuration."""
    config = _load_config()

    # Check for duplicate name
    for marketplace in config.marketplaces:
        if marketplace.name == args.name:
            _error(f"Marketplace '{args.name}' already exists. Remove it first or use a different name.")

    new_marketplace = Marketplace.create(
        name=args.name,
        url=args.url,
        branch=args.branch or "main",
        priority=args.priority if args.priority is not None else 100,
    )

    config.marketplaces.append(new_marketplace)
    _save_config(config)

    _ok({
        "marketplace": new_marketplace.to_dict(),
        "totalMarketplaces": len(config.marketplaces),
    })


def cmd_remove_marketplace(args: argparse.Namespace) -> None:
    """Remove a marketplace from the configuration."""
    config = _load_config()

    original_count = len(config.marketplaces)
    config.marketplaces = [m for m in config.marketplaces if m.name != args.name]

    if len(config.marketplaces) == original_count:
        _error(f"Marketplace '{args.name}' not found")

    # Optionally clean up the cache for the removed marketplace
    cache_dir = CACHE_DIR / args.name
    cache_removed = False
    if cache_dir.exists():
        shutil.rmtree(cache_dir)
        cache_removed = True

    _save_config(config)

    _ok({
        "removed": args.name,
        "cacheRemoved": cache_removed,
        "totalMarketplaces": len(config.marketplaces),
    })


def cmd_toggle_marketplace(args: argparse.Namespace) -> None:
    """Toggle the enabled flag on a marketplace."""
    config = _load_config()

    found = False
    for marketplace in config.marketplaces:
        if marketplace.name == args.name:
            marketplace.enabled = not marketplace.enabled
            found = True
            break

    if not found:
        _error(f"Marketplace '{args.name}' not found")

    _save_config(config)

    _ok({
        "name": args.name,
        "enabled": marketplace.enabled,
        "totalMarketplaces": len(config.marketplaces),
    })


def cmd_update_marketplace(args: argparse.Namespace) -> None:
    """Update properties of an existing marketplace."""
    config = _load_config()

    target = None
    for marketplace in config.marketplaces:
        if marketplace.name == args.name:
            target = marketplace
            break

    if target is None:
        _error(f"Marketplace '{args.name}' not found")

    name_changed = False
    cache_renamed = False

    if args.new_name and args.new_name != target.name:
        for m in config.marketplaces:
            if m.name == args.new_name:
                _error(f"Marketplace '{args.new_name}' already exists")

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
        "marketplace": target.to_dict(),
        "nameChanged": name_changed,
        "cacheRenamed": cache_renamed,
    })


def cmd_list_marketplaces(args: argparse.Namespace) -> None:
    """List all configured marketplaces with status."""
    config = _load_config()

    marketplaces_info = []
    for marketplace in sorted(config.marketplaces, key=lambda m: m.priority):
        cache_dir = CACHE_DIR / marketplace.name
        marketplaces_info.append({
            **marketplace.to_dict(),
            "cached": cache_dir.exists(),
        })

    _ok({
        "marketplaces": marketplaces_info,
        "settings": config.settings,
    })


def cmd_refresh(args: argparse.Namespace) -> None:
    """Fetch/update git caches for all enabled marketplaces."""
    # Auto-init first
    for d in RUNTIME_DIRS:
        d.mkdir(parents=True, exist_ok=True)
    if not MARKETPLACE_CONFIG_FILE.exists():
        if DEFAULT_CONFIG_FILE.exists():
            shutil.copy2(DEFAULT_CONFIG_FILE, MARKETPLACE_CONFIG_FILE)
        else:
            default_config = MarketplaceConfig.create(
                marketplaces=[
                    Marketplace.create(
                        name="official",
                        url="https://github.com/HMTools/agentic-process-templates.git",
                    )
                ]
            )
            _save_config(default_config)

    if not _git_available():
        _error("git is not available on this system. Install git and try again.")

    config = _load_config()

    # Filter marketplaces
    marketplaces_to_refresh = [m for m in config.marketplaces if m.enabled]
    if args.marketplace:
        marketplaces_to_refresh = [m for m in marketplaces_to_refresh if m.name == args.marketplace]
        if not marketplaces_to_refresh:
            _error(f"Marketplace '{args.marketplace}' not found or not enabled")

    # Sort by priority (lower number = higher priority = refreshed first)
    marketplaces_to_refresh.sort(key=lambda m: m.priority)

    refresh_results = []

    for marketplace in marketplaces_to_refresh:
        cache_dir = CACHE_DIR / marketplace.name
        result: dict = {"marketplace": marketplace.name, "operations": []}

        # Clone or pull
        if not cache_dir.exists():
            success, msg = _git_clone(marketplace.url, marketplace.branch, cache_dir)
            result["operations"].append({"type": "clone", "success": success, "message": msg})
        else:
            success, msg = _git_pull(cache_dir)
            result["operations"].append({"type": "pull", "success": success, "message": msg})

        if not success:
            if cache_dir.exists():
                result["operations"].append({
                    "type": "fallback",
                    "message": "Using cached version after refresh failure",
                })
            else:
                result["success"] = False
                refresh_results.append(result)
                continue

        # Update lastSynced on the marketplace in config
        now = _now_iso()
        for m in config.marketplaces:
            if m.name == marketplace.name:
                m.lastSynced = now
                break

        result["success"] = True
        result["refreshedAt"] = now
        refresh_results.append(result)

    _save_config(config)

    _ok({
        "refreshResults": refresh_results,
    })


def cmd_catalog(args: argparse.Namespace) -> None:
    """List all available templates across marketplaces."""
    config = _load_config()
    manifest = _load_manifest()

    # Build lookup of installed templates: (name, type, category) -> InstalledTemplate
    installed_lookup: dict[tuple[str, str, str], InstalledTemplate] = {}
    for t in manifest.templates:
        installed_lookup[(t.name, t.type, t.category)] = t

    catalog = []
    for marketplace in sorted(config.marketplaces, key=lambda m: m.priority):
        if not marketplace.enabled:
            continue
        cache_dir = CACHE_DIR / marketplace.name
        if not cache_dir.exists():
            continue

        templates = _get_template_metadata(cache_dir)
        current_hash = _git_commit_hash(cache_dir)

        for tmpl in templates:
            key = (tmpl["name"], tmpl["type"], tmpl["category"])
            installed_entry = installed_lookup.get(key)
            is_installed = installed_entry is not None and installed_entry.marketplace == marketplace.name
            update_available = (
                is_installed
                and installed_entry is not None
                and installed_entry.version != current_hash
                and current_hash != "unknown"
            )

            catalog.append({
                **tmpl,
                "marketplace": marketplace.name,
                "installed": is_installed,
                "updateAvailable": update_available,
            })

    _ok({
        "catalog": catalog,
        "totalTemplates": len(catalog),
    })


def cmd_install(args: argparse.Namespace) -> None:
    """Install a specific template from a marketplace."""
    config = _load_config()

    # Find the marketplace
    target_marketplace = None
    for m in config.marketplaces:
        if m.name == args.marketplace:
            target_marketplace = m
            break
    if target_marketplace is None:
        _error(f"Marketplace '{args.marketplace}' not found")

    cache_dir = CACHE_DIR / target_marketplace.name
    if not cache_dir.exists():
        _error(f"Marketplace '{args.marketplace}' has no cached data. Run 'refresh' first.")

    # Determine source and destination paths
    src_template = cache_dir / "templates" / "processes" / args.category / args.template
    if not src_template.exists():
        _error(f"Template '{args.category}/{args.template}' (type: {args.type}) not found in marketplace '{args.marketplace}'")

    dest_template = PROCESSES_DIR / args.category / args.template

    # Copy template to runtime
    if dest_template.exists():
        shutil.rmtree(dest_template)
    dest_template.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(src_template, dest_template)

    # Update installed manifest (upsert by name+type+category)
    manifest = _load_manifest()
    version = _git_commit_hash(cache_dir)

    # Remove any existing entry with same key
    manifest.templates = [
        t for t in manifest.templates
        if not (t.name == args.template and t.type == args.type and t.category == args.category)
    ]

    new_entry = InstalledTemplate.create(
        name=args.template,
        category=args.category,
        type=args.type,
        marketplace=args.marketplace,
        version=version,
    )
    manifest.templates.append(new_entry)
    _save_manifest(manifest)

    _ok({
        "installed": new_entry.to_dict(),
        "destination": str(dest_template),
    })


def cmd_uninstall(args: argparse.Namespace) -> None:
    """Uninstall a specific template."""
    manifest = _load_manifest()

    # Find the entry
    entry = None
    for t in manifest.templates:
        if t.name == args.template and t.type == args.type:
            entry = t
            break

    if entry is None:
        _error(f"Template '{args.template}' (type: {args.type}) is not installed")

    # Remove from runtime
    dest_template = PROCESSES_DIR / entry.category / entry.name

    template_removed = False
    if dest_template.exists():
        shutil.rmtree(dest_template)
        template_removed = True

    # Remove from manifest
    manifest.templates = [
        t for t in manifest.templates
        if not (t.name == args.template and t.type == args.type)
    ]
    _save_manifest(manifest)

    _ok({
        "uninstalled": args.template,
        "type": args.type,
        "templateRemoved": template_removed,
    })


def cmd_status(args: argparse.Namespace) -> None:
    """Show marketplace status, installed counts, and update-available counts."""
    config = _load_config()
    manifest = _load_manifest()

    # Build per-marketplace installed counts
    installed_by_marketplace: dict[str, int] = {}
    for t in manifest.templates:
        installed_by_marketplace[t.marketplace] = installed_by_marketplace.get(t.marketplace, 0) + 1

    marketplaces_status = []
    total_updates_available = 0
    for marketplace in sorted(config.marketplaces, key=lambda m: m.priority):
        cache_dir = CACHE_DIR / marketplace.name
        cached = cache_dir.exists()
        installed_count = installed_by_marketplace.get(marketplace.name, 0)

        # Check for updates
        updates_available = 0
        if cached:
            current_hash = _git_commit_hash(cache_dir)
            if current_hash != "unknown":
                for t in manifest.templates:
                    if t.marketplace == marketplace.name and t.version != current_hash:
                        updates_available += 1

        total_updates_available += updates_available

        marketplaces_status.append({
            "name": marketplace.name,
            "url": marketplace.url,
            "branch": marketplace.branch,
            "enabled": marketplace.enabled,
            "priority": marketplace.priority,
            "lastSynced": marketplace.lastSynced,
            "cached": cached,
            "installedCount": installed_count,
            "updatesAvailable": updates_available,
        })

    _ok({
        "marketplaces": marketplaces_status,
        "templates": {
            "processes": _count_templates(PROCESSES_DIR),
            "processesPath": str(PROCESSES_DIR),
            "totalInstalled": len(manifest.templates),
            "totalUpdatesAvailable": total_updates_available,
        },
        "settings": config.settings,
    })


# --- CLI setup ---


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Template Manager — manages template marketplaces for agentic-processes",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # init
    p_init = subparsers.add_parser("init", help="Create runtime directories and default config")
    p_init.set_defaults(func=cmd_init)

    # add-marketplace
    p_add = subparsers.add_parser("add-marketplace", help="Add a marketplace")
    p_add.add_argument("--name", required=True, help="Unique name for the marketplace")
    p_add.add_argument("--url", required=True, help="Git repository URL")
    p_add.add_argument("--branch", default="main", help="Branch to track (default: main)")
    p_add.add_argument("--priority", type=int, default=100, help="Priority (lower = higher, default: 100)")
    p_add.set_defaults(func=cmd_add_marketplace)

    # remove-marketplace
    p_remove = subparsers.add_parser("remove-marketplace", help="Remove a marketplace")
    p_remove.add_argument("--name", required=True, help="Name of the marketplace to remove")
    p_remove.set_defaults(func=cmd_remove_marketplace)

    # toggle-marketplace
    p_toggle = subparsers.add_parser("toggle-marketplace", help="Toggle a marketplace enabled/disabled")
    p_toggle.add_argument("--name", required=True, help="Name of the marketplace to toggle")
    p_toggle.set_defaults(func=cmd_toggle_marketplace)

    # update-marketplace
    p_update = subparsers.add_parser("update-marketplace", help="Update properties of an existing marketplace")
    p_update.add_argument("--name", required=True, help="Current name of the marketplace to update")
    p_update.add_argument("--new-name", default=None, help="New name for the marketplace")
    p_update.add_argument("--url", default=None, help="New git repository URL")
    p_update.add_argument("--branch", default=None, help="New branch to track")
    p_update.add_argument("--priority", type=int, default=None, help="New priority value")
    p_update.set_defaults(func=cmd_update_marketplace)

    # list-marketplaces
    p_list = subparsers.add_parser("list-marketplaces", help="List configured marketplaces")
    p_list.set_defaults(func=cmd_list_marketplaces)

    # refresh
    p_refresh = subparsers.add_parser("refresh", help="Fetch/update git caches for marketplaces")
    p_refresh.add_argument("--marketplace", default=None, help="Refresh only this marketplace (by name)")
    p_refresh.set_defaults(func=cmd_refresh)

    # catalog
    p_catalog = subparsers.add_parser("catalog", help="List available templates across marketplaces")
    p_catalog.set_defaults(func=cmd_catalog)

    # install
    p_install = subparsers.add_parser("install", help="Install a template from a marketplace")
    p_install.add_argument("--marketplace", required=True, help="Marketplace to install from")
    p_install.add_argument("--template", required=True, help="Template name")
    p_install.add_argument("--category", required=True, help="Template category")
    p_install.add_argument("--type", required=True, choices=["process"], help="Template type")
    p_install.set_defaults(func=cmd_install)

    # uninstall
    p_uninstall = subparsers.add_parser("uninstall", help="Uninstall a template")
    p_uninstall.add_argument("--template", required=True, help="Template name")
    p_uninstall.add_argument("--type", required=True, choices=["process"], help="Template type")
    p_uninstall.set_defaults(func=cmd_uninstall)

    # status
    p_status = subparsers.add_parser("status", help="Show marketplace status")
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
