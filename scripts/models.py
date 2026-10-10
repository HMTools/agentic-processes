"""
Python dataclass models for the template marketplaces (scripts/template_manager.py), and the JSON helpers.
The process, log, memory and finding files are written by the process tools of the mod (hooks/infra/process-manager/).
"""

from __future__ import annotations

import json
import os
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Optional


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _new_uuid() -> str:
    return str(uuid.uuid4())


# --- Marketplace types ---

@dataclass
class Marketplace:
    name: str
    url: str
    branch: str = "main"
    enabled: bool = True
    priority: int = 100
    lastSynced: Optional[str] = None

    def to_dict(self) -> dict:
        d: dict[str, Any] = {
            "name": self.name,
            "url": self.url,
            "branch": self.branch,
            "enabled": self.enabled,
            "priority": self.priority,
        }
        if self.lastSynced is not None:
            d["lastSynced"] = self.lastSynced
        return d

    @classmethod
    def from_dict(cls, data: dict) -> Marketplace:
        return cls(
            name=data["name"],
            url=data["url"],
            branch=data.get("branch", "main"),
            enabled=data.get("enabled", True),
            priority=data.get("priority", 100),
            lastSynced=data.get("lastSynced"),
        )

    @classmethod
    def create(
        cls,
        name: str,
        url: str,
        branch: str = "main",
        enabled: bool = True,
        priority: int = 100,
    ) -> Marketplace:
        return cls(
            name=name,
            url=url,
            branch=branch,
            enabled=enabled,
            priority=priority,
        )


@dataclass
class InstalledTemplate:
    name: str
    category: str
    type: str  # 'process' | 'step'
    marketplace: str
    installedAt: str
    version: str  # git commit hash at install time

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "category": self.category,
            "type": self.type,
            "marketplace": self.marketplace,
            "installedAt": self.installedAt,
            "version": self.version,
        }

    @classmethod
    def from_dict(cls, data: dict) -> InstalledTemplate:
        return cls(
            name=data["name"],
            category=data["category"],
            type=data["type"],
            marketplace=data["marketplace"],
            installedAt=data["installedAt"],
            version=data["version"],
        )

    @classmethod
    def create(
        cls,
        name: str,
        category: str,
        type: str,
        marketplace: str,
        version: str,
    ) -> InstalledTemplate:
        return cls(
            name=name,
            category=category,
            type=type,
            marketplace=marketplace,
            installedAt=_now_iso(),
            version=version,
        )


@dataclass
class InstalledTemplatesManifest:
    templates: list[InstalledTemplate]
    lastUpdated: str

    def to_dict(self) -> dict:
        return {
            "templates": [t.to_dict() for t in self.templates],
            "lastUpdated": self.lastUpdated,
        }

    @classmethod
    def from_dict(cls, data: dict) -> InstalledTemplatesManifest:
        return cls(
            templates=[InstalledTemplate.from_dict(t) for t in data.get("templates", [])],
            lastUpdated=data.get("lastUpdated", ""),
        )

    @classmethod
    def create(cls) -> InstalledTemplatesManifest:
        return cls(
            templates=[],
            lastUpdated=_now_iso(),
        )


@dataclass
class MarketplaceConfig:
    marketplaces: list[Marketplace]
    settings: dict[str, Any]

    def to_dict(self) -> dict:
        return {
            "marketplaces": [m.to_dict() for m in self.marketplaces],
            "settings": self.settings,
        }

    @classmethod
    def from_dict(cls, data: dict) -> MarketplaceConfig:
        return cls(
            marketplaces=[Marketplace.from_dict(m) for m in data.get("marketplaces", [])],
            settings=data.get("settings", {
                "autoRefreshOnStale": False,
                "staleDurationMinutes": 1440,
            }),
        )

    @classmethod
    def create(
        cls,
        marketplaces: Optional[list[Marketplace]] = None,
        settings: Optional[dict[str, Any]] = None,
    ) -> MarketplaceConfig:
        return cls(
            marketplaces=marketplaces or [],
            settings=settings or {
                "autoRefreshOnStale": False,
                "staleDurationMinutes": 1440,
            },
        )


# --- File I/O helpers ---

def read_json(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_name(path.name + ".tmp")
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    os.replace(tmp_path, path)
