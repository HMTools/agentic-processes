#!/usr/bin/env python3
"""
Minimal assert-based self-check for the views feature (no test framework, matches this
repo's existing greenfield test posture). Run directly: python3 scripts/test_view_resolution.py
"""
import json
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path

SCRIPT = Path(__file__).parent / "process_manager.py"


def _run(*args: str) -> dict:
    result = subprocess.run(
        [sys.executable, str(SCRIPT), *args],
        capture_output=True, text=True,
    )
    return json.loads(result.stdout)


def _write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data))


def _make_template(tmp: Path, view_ref: str | None) -> Path:
    step_id = str(uuid.uuid4())
    view_id = str(uuid.uuid4())

    _write_json(tmp / "tpl" / "mystep" / "mystep.json", {
        "type": "step", "id": step_id, "name": "mystep",
        "output": {"description": "", "artifacts": [], "memoryUpdates": []},
        "guidance": {"prerequisites": [], "specificActions": [], "files": {"read": [], "create": [], "update": []}, "tools": [], "bestPractices": []},
        "substeps": [],
    })
    _write_json(tmp / "tpl" / "views" / "mywidget" / "mywidget.json", {
        "type": "view", "id": view_id, "name": "mywidget", "htmlFile": "widget.html",
        "operationIds": ["approve", "reject"], "mockData": {"approve": {"count": 7}},
    })
    (tmp / "tpl" / "views" / "mywidget" / "widget.html").write_text("<html></html>")

    step_entry = {"number": 0, "name": "My Step", "stepRef": step_id, "approvalRequired": True}
    if view_ref is not None:
        step_entry["viewRef"] = view_ref

    tpl_path = tmp / "tpl" / "tpl.json"
    _write_json(tpl_path, {
        "type": "template", "id": str(uuid.uuid4()), "name": "tpl", "category": "test",
        "metadata": {"title": "t", "purposeAndUsage": "t", "lastUpdated": "2026-01-01"},
        "parameters": {"required": [], "optional": [], "definitions": {}},
        "steps": [step_entry],
        "references": {"steps": [], "relatedTemplates": [], "dependencies": []},
    })
    return tpl_path, view_id


def _create_process(tmp: Path, tpl_path: Path) -> Path:
    proc_dir = tmp / "proc"
    result = _run("create-process", "--process-dir", str(proc_dir), "--template-path", str(tpl_path), "--params", "{}")
    assert result.get("status") == "ok", result
    return proc_dir


def _activate_step(proc_dir: Path) -> str:
    data = json.loads((proc_dir / "process.json").read_text())
    step_id = data["steps"][0]["id"]
    data["currentState"]["activeStep"]["id"] = step_id
    data["steps"][0]["status"] = "in_progress"
    (proc_dir / "process.json").write_text(json.dumps(data))
    return step_id


def test_valid_view_ref_resolves():
    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        tpl_path, view_id = _make_template(tmp, view_ref=None)
        data = json.loads(tpl_path.read_text())
        data["steps"][0]["viewRef"] = view_id
        tpl_path.write_text(json.dumps(data))

        proc_dir = _create_process(tmp, tpl_path)
        process_data = json.loads((proc_dir / "process.json").read_text())
        view = process_data["steps"][0].get("view")
        assert view is not None
        assert view["id"] == view_id
        assert view["operationIds"] == ["approve", "reject"]
        assert view["html"] == "<html></html>"
        print("test_valid_view_ref_resolves: OK")


def test_unresolvable_view_ref_errors():
    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        tpl_path, _ = _make_template(tmp, view_ref=str(uuid.uuid4()))
        proc_dir = tmp / "proc"
        result = _run("create-process", "--process-dir", str(proc_dir), "--template-path", str(tpl_path), "--params", "{}")
        assert result.get("status") == "error", result
        assert "View UUID not found" in result.get("message", "")
        print("test_unresolvable_view_ref_errors: OK")


def test_no_view_ref_unaffected():
    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        tpl_path, _ = _make_template(tmp, view_ref=None)
        proc_dir = _create_process(tmp, tpl_path)
        process_data = json.loads((proc_dir / "process.json").read_text())
        assert "view" not in process_data["steps"][0]
        print("test_no_view_ref_unaffected: OK")


def test_write_pending_requires_matching_data():
    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        tpl_path, view_id = _make_template(tmp, view_ref=None)
        data = json.loads(tpl_path.read_text())
        data["steps"][0]["viewRef"] = view_id
        tpl_path.write_text(json.dumps(data))

        proc_dir = _create_process(tmp, tpl_path)
        _activate_step(proc_dir)

        # Missing data -> error
        result = _run("write-pending", "--process-dir", str(proc_dir),
                      "--options", json.dumps([{"id": "approve", "label": "Approve"}, {"id": "reject", "label": "Reject"}]))
        assert result.get("status") == "error", result
        assert "missing or have empty data" in result.get("message", "")

        # Full data -> success
        result = _run("write-pending", "--process-dir", str(proc_dir),
                      "--options", json.dumps([
                          {"id": "approve", "label": "Approve", "data": {"count": 7}},
                          {"id": "reject", "label": "Reject", "data": {"note": "n/a"}},
                      ]))
        assert result.get("status") == "ok", result
        pending = json.loads((proc_dir / "pending-interaction.json").read_text())
        assert pending["options"][0]["data"] == {"count": 7}
        print("test_write_pending_requires_matching_data: OK")


if __name__ == "__main__":
    test_valid_view_ref_resolves()
    test_unresolvable_view_ref_errors()
    test_no_view_ref_unaffected()
    test_write_pending_requires_matching_data()
    print("All tests passed.")
