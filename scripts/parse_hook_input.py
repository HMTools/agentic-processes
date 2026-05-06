#!/usr/bin/env python3
"""Parse Claude Code hook JSON input and output shell variable assignments.

Usage:
    echo '{"session_id":"x","tool_name":"Bash","tool_input":{"command":"..."}}' \
        | python3 parse_hook_input.py session_id tool_name command file_path

Output (one assignment per line, safe for eval):
    SESSION_ID='x'
    TOOL_NAME='Bash'
    COMMAND='...'
    FILE_PATH=''
"""

import json
import shlex
import sys


def main() -> None:
    fields = sys.argv[1:]
    if not fields:
        return

    try:
        data = json.loads(sys.stdin.read())
    except Exception:
        data = {}

    tool_input = data.get("tool_input") or {}
    if not isinstance(tool_input, dict):
        tool_input = {}

    for field in fields:
        var_name = field.upper()
        if field in ("command", "file_path"):
            value = tool_input.get(field, "") or data.get(field, "")
        elif field == "stop_hook_active":
            val = data.get("stop_hook_active")
            value = "true" if val is True else ""
        else:
            value = data.get(field, "")

        value = str(value) if value else ""
        print(f"{var_name}={shlex.quote(value)}")


if __name__ == "__main__":
    main()
