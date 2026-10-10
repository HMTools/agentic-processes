"""
One-time cleanup: remove the retired `currentState.activeStep.filesChanged` field
from every process.json under ~/.claude/agentic-processes/{active,completed,failed}.

Usage: python3 strip_files_changed.py [--dry-run] [--root DIR]
"""

from __future__ import annotations

import argparse
from pathlib import Path

from models import read_json, write_json

STATES = ("active", "completed", "failed")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--root", default=str(Path.home() / ".claude" / "agentic-processes"))
    args = ap.parse_args()

    changed = 0
    for state in STATES:
        for path in sorted((Path(args.root) / state).glob("*/process.json")):
            data = read_json(path)
            step = (data.get("currentState") or {}).get("activeStep") or {}
            if "filesChanged" not in step:
                continue
            changed += 1
            print(("would strip " if args.dry_run else "stripped ") + str(path))
            if not args.dry_run:
                del step["filesChanged"]
                write_json(path, data)
    print(f"{changed} file(s) {'would change' if args.dry_run else 'changed'}")


if __name__ == "__main__":
    main()
