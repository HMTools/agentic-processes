#!/usr/bin/env python3
"""
Build the Stop-hook block message for a missing approval checkpoint.

Used by check-approval-stop.sh. Builds the JSON reason in Python (rather than a bash
heredoc) so step names and view schema keys go through json.dumps instead of being
hand-spliced into a shell string.
"""
import json
import sys


def main() -> None:
    process_json_file, script_dir, process_dir = sys.argv[1:4]
    data = json.load(open(process_json_file))

    step = next(
        (s for s in data.get("steps", [])
         if s.get("status") in ("in_progress", "in-progress") and s.get("approvalRequired")),
        None,
    )
    if not step:
        print(json.dumps({}))
        return

    view = step.get("view")  # already resolved by cmd_create_process at process-creation time
    example_options = [
        {"id": "approve", "label": "Approve", "isDefault": True},
        {"id": "reject", "label": "Reject"},
        {"id": "modify", "label": "Request Changes"},
    ]

    if view:
        for opt in example_options:
            if opt["id"] in view.get("operationIds", []):
                opt["data"] = view.get("mockData", {}).get(opt["id"], {})
        schema_lines = "\n".join(
            f'  - "{oid}": data must include: {list(view.get("mockData", {}).get(oid, {}).keys())}'
            for oid in view.get("operationIds", [])
        )
        reason = (
            f'Approval checkpoint required — step "{step.get("name", "")}" resolves to view '
            f'"{view.get("name")}". Its pending-interaction.json options must each include a '
            f'matching `data` object.\n\n'
            f"Required schema (derived from this view's mockData):\n{schema_lines}\n\n"
            f"Create the checkpoint:\n"
            f'  python3 {script_dir}/process_manager.py write-pending --process-dir "{process_dir}" '
            f"--options '{json.dumps(example_options)}'\n\n"
            "After creating the checkpoint, stopping is allowed."
        )
    else:
        reason = (
            f'Approval checkpoint required — step "{step.get("name", "")}" has approvalRequired: '
            f"true but no pending-interaction.json exists.\n\nBefore stopping, you must:\n"
            "  1. Present your deliverables to the user\n"
            "  2. Create the approval checkpoint using process-state-update skill:\n"
            f'       python3 {script_dir}/process_manager.py write-pending \\\n'
            f'         --process-dir "{process_dir}" \\\n'
            f"         --options '{json.dumps(example_options)}'\n\n"
            "After creating the checkpoint, stopping is allowed."
        )

    print(json.dumps({"decision": "block", "reason": reason}))


if __name__ == "__main__":
    main()
