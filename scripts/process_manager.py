"""
Process Manager CLI — handles all process file mutations via direct Python file I/O.

Subcommands:
  create-process       Create all process files (process.json, memory.json, log.json)
  update-step-status   Change a step's status in process.json
  update-current-state Update the active step in process.json
  add-memory-entry     Add or update a step entry in memory.json
  add-log-entry        Append actions to a step entry in log.json
  log-interaction      Log a user interaction in log.json (+ clear pending-log flag)
  update-process-status    Change process status (running/completed/failed/paused)
  update-log-observations  Update processWideObservations in log.json
  write-pending        Create or delete pending-interaction.json
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from models import (
    LogFile,
    LogStepEntry,
    MemoryFile,
    MemoryStepEntry,
    PendingInteractionFile,
    InteractionOption,
    ProcessCurrentState,
    ProcessInstance,
    ProcessMetadata,
    ProcessStatus,
    ProcessStep,
    StepStatus,
    UserInteraction,
    read_json,
    write_json,
    _now_iso,
    _new_uuid,
)


def _ok(*files: str) -> None:
    json.dump({"status": "ok", "files_written": list(files)}, sys.stdout)
    print()


def _error(msg: str) -> None:
    json.dump({"status": "error", "message": msg}, sys.stdout)
    print()
    sys.exit(1)


def _check_pending_log(process_dir: Path) -> None:
    """Block state-mutating commands while a user interaction is unlogged."""
    session_file = process_dir / ".session"
    if not session_file.exists():
        return
    session_id = session_file.read_text(encoding="utf-8").strip()
    if not session_id:
        return
    flag_file = Path.home() / ".claude" / "agentic-processes" / "flags" / f"pending-log-{session_id}"
    if flag_file.exists():
        _error(
            "User interaction not yet logged — call log-interaction before modifying process state"
        )


def _check_pending_approval(process_dir: Path) -> None:
    """Block state-advancing commands while an approval checkpoint is active."""
    pending_file = process_dir / "pending-interaction.json"
    if pending_file.exists():
        _error(
            "Approval checkpoint pending — resolve the pending interaction before modifying process state"
        )


# --- Subcommand handlers ---


def cmd_create_process(args: argparse.Namespace) -> None:
    process_dir = Path(args.process_dir)
    if process_dir.exists() and (process_dir / "process.json").exists():
        _error(f"Process already exists at {process_dir}")

    process_dir.mkdir(parents=True, exist_ok=True)

    params = json.loads(args.params) if args.params else {}
    template_path = Path(args.template_path)

    if not template_path.exists():
        _error(f"Template not found: {template_path}")

    template_data = read_json(template_path)
    template_name = template_data.get("name", template_path.stem)
    template_category = template_data.get("category", None)

    steps_data = template_data.get("steps", [])
    steps = []
    for i, step_def in enumerate(steps_data):
        steps.append(ProcessStep(
            id=_new_uuid(),
            number=i,
            name=step_def.get("name", f"Step {i}"),
            status=StepStatus.PENDING,
            stepRef=step_def.get("stepRef", ""),
            approvalRequired=step_def.get("approvalRequired"),
        ))

    process = ProcessInstance.create(
        name=args.name or template_name,
        template=template_name,
        parameters=params,
        steps=steps,
        project_paths=[args.project_path or str(Path.cwd())],
        process_path=str(process_dir),
        template_category=template_category,
    )

    first_step_id = steps[0].id if steps else ""

    memory = MemoryFile.create(
        process_id=process.id,
        template=template_name,
        current_step=first_step_id,
        parent_process_path=args.parent_process_path,
    )

    log = LogFile.create(
        process_id=process.id,
        template=template_name,
        total_steps=len(steps),
        first_step_id=first_step_id,
        parent_process_path=args.parent_process_path,
    )

    write_json(process_dir / "process.json", process.to_dict())
    write_json(process_dir / "memory.json", memory.to_dict())
    write_json(process_dir / "log.json", log.to_dict())

    _ok("process.json", "memory.json", "log.json")


def cmd_update_step_status(args: argparse.Namespace) -> None:
    process_dir = Path(args.process_dir)
    process_path = process_dir / "process.json"

    if not process_path.exists():
        _error(f"process.json not found in {process_dir}")

    data = read_json(process_path)
    process = ProcessInstance.from_dict(data)

    new_status = StepStatus(args.status)
    now = _now_iso()
    found = False

    for step in process.steps:
        if step.id == args.step_id:
            step.status = new_status
            if new_status == StepStatus.IN_PROGRESS and step.startedAt is None:
                step.startedAt = now
            elif new_status == StepStatus.COMPLETED:
                step.completedAt = now
            found = True
            break

    if not found:
        _error(f"Step {args.step_id} not found")

    process.metadata.lastUpdated = now
    write_json(process_path, process.to_dict())
    _ok("process.json")


def cmd_update_current_state(args: argparse.Namespace) -> None:
    process_dir = Path(args.process_dir)
    process_path = process_dir / "process.json"

    if not process_path.exists():
        _error(f"process.json not found in {process_dir}")

    data = read_json(process_path)
    process = ProcessInstance.from_dict(data)

    process.currentState = ProcessCurrentState(
        activeStepId=args.step_id,
        activeStepName=args.step_name,
        actionSummary=args.summary,
        actionDetails=args.details,
    )
    process.metadata.lastUpdated = _now_iso()

    write_json(process_path, process.to_dict())
    _ok("process.json")


def cmd_add_memory_entry(args: argparse.Namespace) -> None:
    process_dir = Path(args.process_dir)
    memory_path = process_dir / "memory.json"

    if not memory_path.exists():
        _error(f"memory.json not found in {process_dir}")

    data = read_json(memory_path)
    memory = MemoryFile.from_dict(data)

    info = json.loads(args.info) if args.info else {}
    decisions = json.loads(args.decisions) if args.decisions else []
    files_modified = json.loads(args.files) if args.files else []

    now = _now_iso()

    if args.step_id in memory.steps:
        entry = memory.steps[args.step_id]
        entry.informationProduced.update(info)
        entry.decisionsMade.extend(decisions)
        entry.filesModifiedCreated.extend(files_modified)
        entry.updatedAt = now
        if args.status:
            entry.status = StepStatus(args.status)
    else:
        entry = MemoryStepEntry(
            name=args.name,
            informationProduced=info,
            decisionsMade=decisions,
            filesModifiedCreated=files_modified,
            status=StepStatus(args.status) if args.status else None,
            startedAt=now,
            updatedAt=now,
        )
        memory.steps[args.step_id] = entry

    memory.metadata["lastUpdated"] = now
    memory.metadata["currentStep"] = args.step_id

    write_json(memory_path, memory.to_dict())
    _ok("memory.json")


def cmd_add_log_entry(args: argparse.Namespace) -> None:
    process_dir = Path(args.process_dir)
    log_path = process_dir / "log.json"

    if not log_path.exists():
        _error(f"log.json not found in {process_dir}")

    data = read_json(log_path)
    log = LogFile.from_dict(data)

    actions = json.loads(args.actions) if args.actions else []
    reasoning = json.loads(args.reasoning) if args.reasoning else None
    files_modified = json.loads(args.files_modified) if args.files_modified else None

    now = _now_iso()

    if args.step_id in log.steps:
        entry = log.steps[args.step_id]
        if actions:
            if entry.actionsTaken is None:
                entry.actionsTaken = []
            entry.actionsTaken.extend(actions)
        if reasoning:
            if entry.agentReasoning is None:
                entry.agentReasoning = []
            entry.agentReasoning.extend(reasoning)
        if files_modified:
            if entry.filesModified is None:
                entry.filesModified = []
            entry.filesModified.extend(files_modified)
        if isinstance(entry.timestamp, dict):
            entry.timestamp["updatedAt"] = now
        else:
            entry.timestamp = {"startedAt": entry.timestamp, "updatedAt": now}
    else:
        log.steps[args.step_id] = LogStepEntry(
            timestamp={"startedAt": now},
            actionsTaken=actions if actions else None,
            agentReasoning=reasoning,
            filesModified=files_modified,
        )

    if log.executionMetrics:
        log.executionMetrics["currentStep"] = args.step_id

    write_json(log_path, log.to_dict())
    _ok("log.json")


def cmd_log_interaction(args: argparse.Namespace) -> None:
    process_dir = Path(args.process_dir)
    log_path = process_dir / "log.json"

    if not log_path.exists():
        _error(f"log.json not found in {process_dir}")

    data = read_json(log_path)
    log = LogFile.from_dict(data)

    now = _now_iso()

    interaction = UserInteraction(
        request=args.request,
        reason=args.reason,
        agentResponse=args.response,
        timestamp=now,
        forImprovementStep=args.for_improvement if args.for_improvement else None,
        potentialImprovement=args.potential_improvement,
    )

    if args.step_id in log.steps:
        entry = log.steps[args.step_id]
        if entry.userInteractions is None:
            entry.userInteractions = []
        entry.userInteractions.append(interaction)
        if isinstance(entry.timestamp, dict):
            entry.timestamp["updatedAt"] = now
    else:
        log.steps[args.step_id] = LogStepEntry(
            timestamp={"startedAt": now},
            userInteractions=[interaction],
        )

    write_json(log_path, log.to_dict())

    # Clear the pending-log flag (enforce-log-first integration)
    session_file = process_dir / ".session"
    if session_file.exists():
        session_id = session_file.read_text(encoding="utf-8").strip()
        if session_id:
            flag_file = Path.home() / ".claude" / "agentic-processes" / "flags" / f"pending-log-{session_id}"
            if flag_file.exists():
                flag_file.unlink()

    _ok("log.json")


def cmd_update_process_status(args: argparse.Namespace) -> None:
    process_dir = Path(args.process_dir)
    process_path = process_dir / "process.json"

    if not process_path.exists():
        _error(f"process.json not found in {process_dir}")

    data = read_json(process_path)
    process = ProcessInstance.from_dict(data)

    process.status = ProcessStatus(args.status)
    process.metadata.lastUpdated = _now_iso()

    write_json(process_path, process.to_dict())
    _ok("process.json")


def cmd_update_log_observations(args: argparse.Namespace) -> None:
    process_dir = Path(args.process_dir)
    log_path = process_dir / "log.json"

    if not log_path.exists():
        _error(f"log.json not found in {process_dir}")

    data = read_json(log_path)
    log = LogFile.from_dict(data)

    if args.patterns:
        items = json.loads(args.patterns)
        log.processWideObservations.setdefault("patternsDetected", []).extend(items)

    if args.feedback:
        items = json.loads(args.feedback)
        log.processWideObservations.setdefault("userFeedbackSummary", []).extend(items)

    if args.metrics:
        metrics = json.loads(args.metrics)
        log.processWideObservations.setdefault("efficiencyMetrics", {}).update(metrics)

    if args.recommendations:
        items = json.loads(args.recommendations)
        log.processWideObservations.setdefault("recommendationsForFuture", []).extend(items)

    write_json(log_path, log.to_dict())
    _ok("log.json")


def cmd_write_pending(args: argparse.Namespace) -> None:
    process_dir = Path(args.process_dir)
    pending_path = process_dir / "pending-interaction.json"

    if args.delete:
        if pending_path.exists():
            pending_path.unlink()
            _ok("pending-interaction.json (deleted)")
        else:
            _ok()
        return

    if not args.options:
        _error("--options is required when creating pending-interaction.json")

    options_data = json.loads(args.options)
    options = [InteractionOption.from_dict(o) for o in options_data]
    pending = PendingInteractionFile.create(options)

    write_json(pending_path, pending.to_dict())
    _ok("pending-interaction.json")


# --- CLI setup ---


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Process Manager — all process file mutations via direct Python file I/O",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # create-process
    p_create = subparsers.add_parser("create-process", help="Create all process files")
    p_create.add_argument("--template-path", required=True, help="Path to template JSON")
    p_create.add_argument("--name", help="Process name (defaults to template name)")
    p_create.add_argument("--params", help="JSON string of parameters")
    p_create.add_argument("--project-path", help="Absolute project path")
    p_create.add_argument("--process-dir", required=True, help="Process directory path")
    p_create.add_argument("--parent-process-path", help="Parent process path (for sub-processes)")
    p_create.set_defaults(func=cmd_create_process)

    # update-step-status
    p_step = subparsers.add_parser("update-step-status", help="Change step status")
    p_step.add_argument("--process-dir", required=True)
    p_step.add_argument("--step-id", required=True, help="UUID of the step")
    p_step.add_argument("--status", required=True, choices=[s.value for s in StepStatus])
    p_step.set_defaults(func=cmd_update_step_status)

    # update-current-state
    p_state = subparsers.add_parser("update-current-state", help="Update active step")
    p_state.add_argument("--process-dir", required=True)
    p_state.add_argument("--step-id", required=True)
    p_state.add_argument("--step-name", required=True)
    p_state.add_argument("--summary", required=True)
    p_state.add_argument("--details", default=None)
    p_state.set_defaults(func=cmd_update_current_state)

    # add-memory-entry
    p_mem = subparsers.add_parser("add-memory-entry", help="Add/update step in memory")
    p_mem.add_argument("--process-dir", required=True)
    p_mem.add_argument("--step-id", required=True)
    p_mem.add_argument("--name", required=True, help="Step name")
    p_mem.add_argument("--info", help="JSON string of informationProduced")
    p_mem.add_argument("--decisions", help="JSON array of decisions")
    p_mem.add_argument("--files", help="JSON array of files modified/created")
    p_mem.add_argument("--status", choices=[s.value for s in StepStatus])
    p_mem.set_defaults(func=cmd_add_memory_entry)

    # add-log-entry
    p_log = subparsers.add_parser("add-log-entry", help="Append log entry")
    p_log.add_argument("--process-dir", required=True)
    p_log.add_argument("--step-id", required=True)
    p_log.add_argument("--actions", help="JSON array of actions taken")
    p_log.add_argument("--reasoning", help="JSON array of agent reasoning")
    p_log.add_argument("--files-modified", help="JSON array of files modified")
    p_log.set_defaults(func=cmd_add_log_entry)

    # log-interaction
    p_interact = subparsers.add_parser("log-interaction", help="Log user interaction")
    p_interact.add_argument("--process-dir", required=True)
    p_interact.add_argument("--step-id", required=True)
    p_interact.add_argument("--request", required=True)
    p_interact.add_argument("--reason", required=True)
    p_interact.add_argument("--response", required=True)
    p_interact.add_argument("--for-improvement", action="store_true")
    p_interact.add_argument("--potential-improvement", default=None)
    p_interact.set_defaults(func=cmd_log_interaction)

    # update-process-status
    p_pstatus = subparsers.add_parser("update-process-status", help="Change process status")
    p_pstatus.add_argument("--process-dir", required=True)
    p_pstatus.add_argument("--status", required=True, choices=[s.value for s in ProcessStatus])
    p_pstatus.set_defaults(func=cmd_update_process_status)

    # update-log-observations
    p_obs = subparsers.add_parser("update-log-observations", help="Update processWideObservations in log.json")
    p_obs.add_argument("--process-dir", required=True)
    p_obs.add_argument("--patterns", help="JSON array of patterns detected")
    p_obs.add_argument("--feedback", help="JSON array of user feedback summaries")
    p_obs.add_argument("--metrics", help="JSON object of efficiency metrics")
    p_obs.add_argument("--recommendations", help="JSON array of recommendations for future")
    p_obs.set_defaults(func=cmd_update_log_observations)

    # write-pending
    p_pending = subparsers.add_parser("write-pending", help="Create/delete pending interaction")
    p_pending.add_argument("--process-dir", required=True)
    p_pending.add_argument("--options", help="JSON array of interaction options")
    p_pending.add_argument("--delete", action="store_true", help="Delete pending-interaction.json")
    p_pending.set_defaults(func=cmd_write_pending)

    _LOG_GATED_COMMANDS = {
        "update-step-status",
        "update-current-state",
        "add-memory-entry",
        "update-process-status",
        "write-pending",
    }

    _APPROVAL_GATED_COMMANDS = {
        "update-step-status",
        "update-current-state",
        "update-process-status",
    }

    parsed = parser.parse_args()
    if parsed.command in _LOG_GATED_COMMANDS:
        if not (parsed.command == "write-pending" and getattr(parsed, "delete", False)):
            _check_pending_log(Path(parsed.process_dir))
    if parsed.command in _APPROVAL_GATED_COMMANDS:
        _check_pending_approval(Path(parsed.process_dir))
    try:
        parsed.func(parsed)
    except json.JSONDecodeError as e:
        _error(f"Invalid JSON: {e}")
    except Exception as e:
        _error(str(e))


if __name__ == "__main__":
    main()
