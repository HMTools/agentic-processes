"""
Process Manager CLI — handles all process file mutations via direct Python file I/O.

Subcommands:
  create-process           Create process files (process.json, memory/_cross-references.json, log.json)
  update-step-status       Change a step's status in process.json
  approve-step             Record explicit approval for steps with approvalRequired: true
  update-current-state     Update the active step in process.json
  add-memory-entry         Add or update a step entry in memory/<topic>.json
  read-memory-topic        Read a memory topic file with access validation
  add-log-entry            Append actions to a step entry in log.json
  log-interaction          Log a user interaction in log.json (+ clear pending-log flag)
  update-process-status    Change process status (running/completed/failed/paused)
  register-child-process   Register a child subprocess in parent's process.json
  update-child-status      Update a child's status in parent's process.json
  update-log-observations  Update processWideObservations in log.json
  write-pending            Create or delete pending-interaction.json
  create-qa-session        Create Q&A session with questions
  update-qa-answer         Add or update answer for a question
  complete-qa-question     Mark question as completed
  complete-qa-session      Archive session and delete file
  get-qa-session           Read current Q&A session
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from models import (
    ActiveStep,
    ActiveStepSubstep,
    ChildProcessRef,
    LogFile,
    LogStepEntry,
    MemoryCrossReferences,
    MemoryTopicEntry,
    MemoryTopicFile,
    ParentProcessRef,
    PendingInteractionFile,
    InteractionOption,
    ProcessCurrentState,
    ProcessInstance,
    ProcessMetadata,
    ProcessStatus,
    ProcessStep,
    StepStatus,
    SubProcessState,
    UserInteraction,
    read_json,
    write_json,
    _now_iso,
    _new_uuid,
)

# Helper functions for Q&A session operations

def derive_session_status(questions: list[dict]) -> str:
    """
    Derive session status from question statuses.
    Returns 'pending' if any required question is 'unanswered'
    Returns 'partial' if all required answered but not all 'completed'
    Returns 'completed' if all required questions 'completed'
    """
    required_questions = [q for q in questions if q.get('priority') == 'required']

    if not required_questions:
        # No required questions, check all questions
        all_completed = all(q.get('status') == 'completed' for q in questions)
        return 'completed' if all_completed else 'partial'

    # Check if any required question is unanswered
    any_unanswered = any(q.get('status') == 'unanswered' for q in required_questions)
    if any_unanswered:
        return 'pending'

    # All required questions have at least been answered
    # Check if all required questions are completed
    all_completed = all(q.get('status') == 'completed' for q in required_questions)
    if all_completed:
        return 'completed'

    return 'partial'


def validate_qa_session(data: dict) -> None:
    """Validate QASessionFile structure against schema."""
    required_fields = ['type', 'stepId', 'stepName', 'timestamp', 'questions', 'status']
    for field in required_fields:
        if field not in data:
            raise ValueError(f"Missing required field: {field}")

    if data['type'] != 'qa-session':
        raise ValueError(f"Invalid type: expected 'qa-session', got '{data['type']}'")

    if not isinstance(data['questions'], list):
        raise ValueError("questions must be an array")

    valid_statuses = ['pending', 'partial', 'completed']
    if data['status'] not in valid_statuses:
        raise ValueError(f"Invalid status: {data['status']}")

    # Validate each question
    for q in data['questions']:
        q_required = ['id', 'topic', 'question', 'priority', 'status', 'answerHistory']
        for field in q_required:
            if field not in q:
                raise ValueError(f"Question missing required field: {field}")

        valid_q_statuses = ['unanswered', 'answered', 'refined', 'completed']
        if q['status'] not in valid_q_statuses:
            raise ValueError(f"Invalid question status: {q['status']}")

        if not isinstance(q['answerHistory'], list):
            raise ValueError("answerHistory must be an array")


def map_to_qa_session_log(qa_session: dict) -> dict:
    """Convert QASessionFile to QASessionLog format for log.json."""
    questions_asked = []
    answers_received = []
    unanswered_questions = []

    for q in qa_session['questions']:
        # Add to questionsAsked (without status and answerHistory)
        questions_asked.append({
            'id': q['id'],
            'topic': q['topic'],
            'question': q['question'],
            'priority': q['priority'],
            'context': q.get('context'),
            'options': q.get('options'),
        })

        # Process answers
        if q['answerHistory']:
            # Get the most recent answer
            latest_answer = q['answerHistory'][-1]
            answers_received.append({
                'questionId': q['id'],
                'answer': latest_answer['answer'],
                'timestamp': latest_answer['timestamp'],
            })
        else:
            unanswered_questions.append(q['id'])

    # Determine outcome
    if not unanswered_questions:
        outcome = 'all_answered'
    elif len(unanswered_questions) < len(qa_session['questions']):
        outcome = 'partial'
    else:
        outcome = 'deferred'

    return {
        'timestamp': qa_session['timestamp'],
        'questionsAsked': questions_asked,
        'answersReceived': answers_received,
        'unansweredQuestions': unanswered_questions,
        'outcome': outcome,
    }


def create_qa_session_memory(qa_session: dict) -> dict:
    """Generate QASessionMemory summary for memory.json."""
    answered_count = sum(1 for q in qa_session['questions'] if q['answerHistory'])
    total_count = len(qa_session['questions'])

    # Create keyAnswers map from answered questions
    key_answers = {}
    assumptions = []

    for q in qa_session['questions']:
        if q['answerHistory']:
            # Use most recent answer
            latest_answer = q['answerHistory'][-1]['answer']
            key_answers[q['topic']] = latest_answer
        elif q['priority'] == 'required':
            # Track required unanswered questions as assumptions
            assumptions.append(f"No answer provided for: {q['question']}")

    memory_entry = {
        'conducted': True,
        'questionsCount': total_count,
        'answeredCount': answered_count,
        'keyAnswers': key_answers,
    }

    if assumptions:
        memory_entry['assumptions'] = assumptions

    return memory_entry


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
        step_id = "<active-step-id>"
        try:
            pdata = json.loads((process_dir / "process.json").read_text(encoding="utf-8"))
            step_id = pdata.get("currentState", {}).get("activeStep", {}).get("id", step_id)
        except Exception:
            pass
        script_path = Path(__file__)
        _error(
            "User interaction not yet logged — call log-interaction before modifying process state.\n\n"
            "Command:\n"
            f"  python3 {script_path} log-interaction \\\n"
            f"    --process-dir \"{process_dir}\" \\\n"
            f"    --step-id \"{step_id}\" \\\n"
            "    --request \"User requested: [describe what user asked]\" \\\n"
            "    --reason \"User feedback on [topic]\" \\\n"
            "    --response \"Action taken: [what you're doing]\"\n\n"
            "After logging, the flag is cleared and you can proceed."
        )


def _check_pending_approval(process_dir: Path) -> None:
    """Block state-advancing commands while an approval checkpoint is active."""
    pending_file = process_dir / "pending-interaction.json"
    if pending_file.exists():
        script_path = Path(__file__)
        _error(
            "Approval checkpoint pending — resolve the pending interaction before modifying process state.\n\n"
            "To resolve:\n"
            f"  1. Read the pending interaction: Read {pending_file}\n"
            "  2. Process the user's response and determine their choice\n"
            f"  3. Delete the checkpoint:\n"
            f"       python3 {script_path} write-pending --process-dir \"{process_dir}\" --delete\n\n"
            "After deleting pending-interaction.json, state-advancing commands are unblocked."
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

    # --- Constants for step definition fields to embed ---
    EMBED_FIELDS = ["output", "guidance", "substeps", "flow", "memoryFileUsage", "parameters"]
    EXTRA_EMBED_FIELDS = ["improvementCategories", "prioritization", "workflow",
                          "successCriteria", "complianceChecklist", "searchModes",
                          "changeProposalFormat", "captureTypes"]

    # --- Resolve template steps from subfolders ---
    template_dir = template_path.parent
    steps_data = template_data.get("steps", [])
    steps = []
    for i, step_def in enumerate(steps_data):
        step_ref = step_def.get("stepRef")
        step_definition = {}

        if step_ref:  # Non-null, non-empty stepRef
            # Resolve step file from template directory subfolder
            step_json_path = template_dir / step_ref / f"{step_ref}.json"
            if step_json_path.exists():
                step_data = read_json(step_json_path)
                for f in EMBED_FIELDS + EXTRA_EMBED_FIELDS:
                    if f in step_data:
                        step_definition[f] = step_data[f]
            else:
                # Fallback: use inline stepDefinition if step file not found
                step_definition = step_def.get("stepDefinition", {})
        else:
            # Null/empty stepRef: orchestrator step, keep empty definition
            step_definition = step_def.get("stepDefinition", {})

        steps.append(ProcessStep(
            id=_new_uuid(),
            number=i,
            name=step_def.get("name", f"Step {i}"),
            status=StepStatus.PENDING,
            stepRef=step_ref or "",
            approvalRequired=step_def.get("approvalRequired"),
            stepDefinition=step_definition,
        ))

    # --- Auto-inject framework steps ---
    framework_steps_dir = Path(__file__).parent.parent / "framework-steps"
    FRAMEWORK_STEPS = ["continuous-improvement", "end-process-validation"]

    for fs_name in FRAMEWORK_STEPS:
        step_json_path = framework_steps_dir / fs_name / f"{fs_name}.json"
        if not step_json_path.exists():
            continue
        step_data = read_json(step_json_path)
        step_definition = {}
        for f in EMBED_FIELDS + EXTRA_EMBED_FIELDS:
            if f in step_data:
                step_definition[f] = step_data[f]
        steps.append(ProcessStep(
            id=_new_uuid(),
            number=len(steps),
            name=step_data.get("metadata", {}).get("title", fs_name),
            status=StepStatus.PENDING,
            stepRef=f"@framework-step:{fs_name}",
            approvalRequired=step_data.get("approvalRequired"),
            stepDefinition=step_definition,
        ))

    parent_process = None
    if args.parent_process_path:
        if args.parent_id and args.parent_name:
            parent_process = ParentProcessRef(
                id=args.parent_id,
                name=args.parent_name,
                processPath=args.parent_process_path,
                returnToStep=args.return_to_step or "",
            )
        else:
            parent_path = Path(args.parent_process_path) / "process.json"
            if parent_path.exists():
                parent_data = read_json(parent_path)
                parent_process = ParentProcessRef(
                    id=parent_data["id"],
                    name=parent_data["name"],
                    processPath=args.parent_process_path,
                    returnToStep=args.return_to_step or "",
                )

    process = ProcessInstance.create(
        name=args.name or template_name,
        template=template_name,
        parameters=params,
        steps=steps,
        project_paths=[args.project_path or str(Path.cwd())],
        process_path=str(process_dir),
        template_category=template_category,
        parent_process=parent_process,
    )

    first_step_id = steps[0].id if steps else ""

    cross_refs = MemoryCrossReferences.create()

    log = LogFile.create(
        process_id=process.id,
        template=template_name,
        total_steps=len(steps),
        first_step_id=first_step_id,
        parent_process_path=args.parent_process_path,
    )

    write_json(process_dir / "process.json", process.to_dict())
    memory_dir = process_dir / "memory"
    memory_dir.mkdir(parents=True, exist_ok=True)
    write_json(memory_dir / "_cross-references.json", cross_refs.to_dict())
    write_json(process_dir / "log.json", log.to_dict())

    _ok("process.json", "memory/_cross-references.json", "log.json")


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
            # Approval gate: block completion of approval-required steps without explicit approval
            if (
                new_status == StepStatus.COMPLETED
                and step.approvalRequired
                and step.approved is not True
            ):
                script_path = Path(__file__)
                _error(
                    f"Step \"{step.name}\" requires explicit approval before completion.\n\n"
                    "This step has approvalRequired: true but approved is not set.\n"
                    "The approval workflow is:\n"
                    f"  1. Create approval checkpoint:\n"
                    f"       python3 {script_path} write-pending --process-dir \"{process_dir}\" --options '[...]'\n"
                    f"  2. Wait for user to respond (approve/reject/modify)\n"
                    f"  3. Delete the checkpoint:\n"
                    f"       python3 {script_path} write-pending --process-dir \"{process_dir}\" --delete\n"
                    f"  4. Record approval:\n"
                    f"       python3 {script_path} approve-step --process-dir \"{process_dir}\" --step-id \"{step.id}\"\n"
                    f"  5. Then retry:\n"
                    f"       python3 {script_path} update-step-status --process-dir \"{process_dir}\" --step-id \"{step.id}\" --status completed\n"
                )

            step.status = new_status
            if new_status == StepStatus.IN_PROGRESS and step.startedAt is None:
                step.startedAt = now
            elif new_status == StepStatus.COMPLETED:
                step.completedAt = now
            found = True
            break

    if not found:
        _error(f"Step {args.step_id} not found")

    if new_status == StepStatus.COMPLETED:
        log_path = process_dir / "log.json"
        if log_path.exists():
            log_data = read_json(log_path)
            log = LogFile.from_dict(log_data)
            if log.executionMetrics:
                # Compute actual count from process steps to avoid double-counting on retries
                completed_count = sum(
                    1 for s in process.steps if s.status == StepStatus.COMPLETED
                )
                log.executionMetrics["stepsCompleted"] = completed_count
                write_json(log_path, log.to_dict())

    process.metadata.lastUpdated = now
    write_json(process_path, process.to_dict())
    _ok("process.json")


def cmd_approve_step(args: argparse.Namespace) -> None:
    """Record explicit approval for a step with approvalRequired: true."""
    process_dir = Path(args.process_dir)
    process_path = process_dir / "process.json"

    if not process_path.exists():
        _error(f"process.json not found in {process_dir}")

    data = read_json(process_path)
    process = ProcessInstance.from_dict(data)

    found = False
    for step in process.steps:
        if step.id == args.step_id:
            # Validation 1: step must have approvalRequired
            if not step.approvalRequired:
                _error(
                    f"Step \"{step.name}\" does not have approvalRequired: true — "
                    "only approval-required steps can be approved."
                )

            # Validation 2: pending-interaction.json must NOT exist
            pending_file = process_dir / "pending-interaction.json"
            if pending_file.exists():
                script_path = Path(__file__)
                _error(
                    "Cannot approve step while pending-interaction.json exists.\n\n"
                    "The approval checkpoint must be resolved first:\n"
                    "  1. Process the user's response\n"
                    f"  2. Delete the checkpoint:\n"
                    f"       python3 {script_path} write-pending --process-dir \"{process_dir}\" --delete\n"
                    f"  3. Then retry:\n"
                    f"       python3 {script_path} approve-step --process-dir \"{process_dir}\" --step-id \"{step.id}\"\n"
                )

            step.approved = True
            found = True
            break

    if not found:
        _error(f"Step {args.step_id} not found")

    process.metadata.lastUpdated = _now_iso()
    write_json(process_path, process.to_dict())
    _ok("process.json")


def cmd_update_current_state(args: argparse.Namespace) -> None:
    process_dir = Path(args.process_dir)
    process_path = process_dir / "process.json"

    if not process_path.exists():
        _error(f"process.json not found in {process_dir}")

    data = read_json(process_path)
    process = ProcessInstance.from_dict(data)

    current_substep = None
    if getattr(args, 'substep_number', None) is not None and getattr(args, 'substep_name', None) is not None:
        current_substep = ActiveStepSubstep(
            number=args.substep_number,
            name=args.substep_name,
        )

    process.currentState = ProcessCurrentState(
        activeStep=ActiveStep(
            id=args.step_id,
            name=args.step_name,
            actionSummary=args.summary,
            totalSubsteps=args.total_substeps if getattr(args, 'total_substeps', None) is not None else 0,
            actionDetails=args.details,
            currentSubstep=current_substep,
        )
    )
    process.metadata.lastUpdated = _now_iso()

    write_json(process_path, process.to_dict())
    _ok("process.json")


def cmd_update_active_substep(args: argparse.Namespace) -> None:
    process_dir = Path(args.process_dir)
    process_path = process_dir / "process.json"

    if not process_path.exists():
        _error(f"process.json not found in {process_dir}")

    data = read_json(process_path)
    process = ProcessInstance.from_dict(data)

    process.currentState.activeStep.currentSubstep = ActiveStepSubstep(
        number=args.substep_number,
        name=args.substep_name,
    )
    if args.summary is not None:
        process.currentState.activeStep.actionSummary = args.summary
    process.metadata.lastUpdated = _now_iso()

    write_json(process_path, process.to_dict())
    _ok("process.json")


def _resolve_step_name(process_dir: Path, step_id: str) -> str:
    """Look up step name from process.json by step ID."""
    process_path = process_dir / "process.json"
    if process_path.exists():
        pdata = read_json(process_path)
        for step in pdata.get("steps", []):
            if step["id"] == step_id:
                return step.get("name", "")
    return ""


def _get_step_memory_usage(process_dir: Path, step_id: str) -> dict:
    """Get memoryFileUsage for a step from process.json."""
    process_path = process_dir / "process.json"
    if process_path.exists():
        pdata = read_json(process_path)
        for step in pdata.get("steps", []):
            if step["id"] == step_id:
                step_def = step.get("stepDefinition", {})
                return step_def.get("memoryFileUsage", {})
    return {}


def _validate_topic_access(process_dir: Path, step_id: str, topic: str, access_type: str) -> None:
    """Validate that a step is allowed to read/write a specific topic.
    access_type must be 'readFrom' or 'writeTo'.
    _cross-references is always readable by any step."""
    if topic == "_cross-references":
        return  # Always allowed
    usage = _get_step_memory_usage(process_dir, step_id)
    allowed_topics = usage.get(access_type, [])
    # If memoryFileUsage is not defined or is old-format string, skip validation
    if not isinstance(allowed_topics, list):
        return
    # Empty list means no restrictions defined yet — allow access
    if not allowed_topics:
        return
    topic_file = f"{topic}.json"
    if topic_file not in allowed_topics and topic not in allowed_topics:
        step_name = _resolve_step_name(process_dir, step_id)
        access_label = "write to" if access_type == "writeTo" else "read from"
        _error(
            f'Step "{step_name}" is not allowed to {access_label} topic "{topic_file}". '
            f"Allowed {access_type} topics: {allowed_topics}"
        )


def cmd_add_memory_entry(args: argparse.Namespace) -> None:
    process_dir = Path(args.process_dir)
    memory_dir = process_dir / "memory"

    if not memory_dir.exists():
        _error(f"memory/ directory not found in {process_dir}")

    topic = args.topic

    # Validate topic access
    _validate_topic_access(process_dir, args.step_id, topic, "writeTo")

    topic_path = memory_dir / f"{topic}.json"

    info = json.loads(args.info) if args.info else {}
    decisions = json.loads(args.decisions) if args.decisions else []
    files_modified = json.loads(args.files) if args.files else []

    now = _now_iso()

    # Read or create topic file
    if topic_path.exists():
        data = read_json(topic_path)
        topic_file = MemoryTopicFile.from_dict(data)
    else:
        topic_file = MemoryTopicFile.create(topic)

    # Resolve step name from process.json
    step_name = _resolve_step_name(process_dir, args.step_id)

    if args.step_id in topic_file.entries:
        entry = topic_file.entries[args.step_id]
        entry.informationProduced.update(info)
        entry.decisionsMade.extend(decisions)
        entry.filesModifiedCreated.extend(files_modified)
        entry.updatedAt = now
    else:
        entry = MemoryTopicEntry(
            stepName=step_name,
            informationProduced=info,
            decisionsMade=decisions,
            filesModifiedCreated=files_modified,
            updatedAt=now,
        )
        topic_file.entries[args.step_id] = entry

    topic_file.lastUpdated = now

    write_json(topic_path, topic_file.to_dict())

    # Also update _cross-references.json with any new decisions and files
    xref_path = memory_dir / "_cross-references.json"
    if xref_path.exists():
        xref_data = read_json(xref_path)
        xref = MemoryCrossReferences.from_dict(xref_data)
    else:
        xref = MemoryCrossReferences.create()

    if decisions:
        xref.keyDecisions.extend(decisions)
    if files_modified:
        xref.filesModified.extend(files_modified)
    write_json(xref_path, xref.to_dict())

    _ok(f"memory/{topic}.json", "memory/_cross-references.json")


def cmd_read_memory_topic(args: argparse.Namespace) -> None:
    """Read a specific memory topic file with access validation."""
    process_dir = Path(args.process_dir)
    memory_dir = process_dir / "memory"

    if not memory_dir.exists():
        _error(f"memory/ directory not found in {process_dir}")

    topic = args.topic

    # Validate topic access
    _validate_topic_access(process_dir, args.step_id, topic, "readFrom")

    topic_path = memory_dir / f"{topic}.json"
    if not topic_path.exists():
        json.dump({"status": "ok", "topic": topic, "data": None}, sys.stdout)
        print()
        return

    data = read_json(topic_path)
    json.dump({"status": "ok", "topic": topic, "data": data}, sys.stdout)
    print()


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
    problems = json.loads(args.problems) if args.problems else None
    decisions = json.loads(args.decisions) if args.decisions else None
    performance_notes = json.loads(args.performance_notes) if args.performance_notes else None

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
        if problems:
            if entry.problemsEncountered is None:
                entry.problemsEncountered = []
            entry.problemsEncountered.extend(problems)
        if decisions:
            if entry.decisionsMade is None:
                entry.decisionsMade = []
            entry.decisionsMade.extend(decisions)
        if performance_notes:
            if entry.performanceNotes is None:
                entry.performanceNotes = []
            entry.performanceNotes.extend(performance_notes)
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
            problemsEncountered=problems,
            decisionsMade=decisions,
            performanceNotes=performance_notes,
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

    new_status = ProcessStatus(args.status)

    # Auto-notify parent when a sub-process completes
    if new_status == ProcessStatus.COMPLETED and process.subProcessState and process.subProcessState.parentProcess:
        parent_ref = process.subProcessState.parentProcess
        summary = getattr(args, 'summary', None)

        if not summary:
            _error(
                f"This process is a sub-process of '{parent_ref.name}' "
                f"(path: {parent_ref.processPath}). "
                f"When completing a sub-process, you must provide --summary "
                f"describing what was accomplished. The parent process needs "
                f"this summary to continue.\n\n"
                f"Example: --summary \"Implemented feature X, created PR #123, all tests passing\""
            )

        try:
            parent_process_path = Path(parent_ref.processPath) / "process.json"
            if parent_process_path.exists():
                parent_data = read_json(parent_process_path)
                parent_process = ProcessInstance.from_dict(parent_data)

                # Update child status in parent's process.json
                if parent_process.subProcessState:
                    for child in parent_process.subProcessState.childProcesses:
                        if child.id == process.id:
                            child.status = ProcessStatus.COMPLETED
                            break

                    parent_process.metadata.lastUpdated = _now_iso()
                    write_json(parent_process_path, parent_process.to_dict())

                # Add summary to parent's memory/sub-processes.json topic file
                parent_memory_dir = Path(parent_ref.processPath) / "memory"
                if parent_memory_dir.exists():
                    topic_path = parent_memory_dir / "sub-processes.json"
                    if topic_path.exists():
                        topic_data = read_json(topic_path)
                        topic_file = MemoryTopicFile.from_dict(topic_data)
                    else:
                        topic_file = MemoryTopicFile.create("sub-processes")

                    # Find the spawning step ID from parent's child reference
                    spawn_step_id = None
                    if parent_process.subProcessState:
                        for child in parent_process.subProcessState.childProcesses:
                            if child.id == process.id:
                                spawn_step_id = child.spawnedAtStep
                                break

                    if spawn_step_id:
                        now = _now_iso()
                        if spawn_step_id in topic_file.entries:
                            entry = topic_file.entries[spawn_step_id]
                            entry.informationProduced[f"childSummary_{process.id}"] = summary
                            entry.updatedAt = now
                        else:
                            step_name = _resolve_step_name(Path(parent_ref.processPath), spawn_step_id)
                            topic_file.entries[spawn_step_id] = MemoryTopicEntry(
                                stepName=step_name,
                                informationProduced={f"childSummary_{process.id}": summary},
                                updatedAt=now,
                            )
                        topic_file.lastUpdated = now
                        write_json(topic_path, topic_file.to_dict())

                print(f"[auto-notify] Updated parent '{parent_ref.name}' with child completion and summary", file=sys.stderr)
        except Exception as exc:
            # Parent notification is best-effort -- child completion must not fail
            print(f"[auto-notify] Warning: Could not notify parent '{parent_ref.name}': {exc}", file=sys.stderr)

    process.status = new_status
    process.metadata.lastUpdated = _now_iso()

    write_json(process_path, process.to_dict())

    # --- Relocate process directory based on new status ---
    STATUS_DIRS = {
        ProcessStatus.COMPLETED: "completed",
        ProcessStatus.FAILED: "failed",
        ProcessStatus.RUNNING: "active",
        ProcessStatus.PAUSED: "active",
    }
    target_folder = STATUS_DIRS.get(new_status)
    if target_folder:
        agentic_root = process_dir.parent.parent  # e.g. ~/.claude/agentic-processes
        current_folder = process_dir.parent.name   # e.g. "active"
        if current_folder != target_folder:
            target_parent = agentic_root / target_folder
            target_parent.mkdir(parents=True, exist_ok=True)
            new_process_dir = target_parent / process_dir.name
            if new_process_dir.exists():
                _error(f"Cannot relocate: target directory already exists: {new_process_dir}")
            shutil.move(str(process_dir), str(new_process_dir))
            # Update processPath in the moved process.json
            new_process_path = new_process_dir / "process.json"
            moved_data = read_json(new_process_path)
            moved_data["metadata"]["processPath"] = str(new_process_dir)
            write_json(new_process_path, moved_data)
            json.dump({"status": "ok", "files_written": ["process.json"], "relocated_to": str(new_process_dir)}, sys.stdout)
            print()
            return

    _ok("process.json")


def cmd_register_child_process(args: argparse.Namespace) -> None:
    process_dir = Path(args.process_dir)
    process_path = process_dir / "process.json"

    if not process_path.exists():
        _error(f"process.json not found in {process_dir}")

    data = read_json(process_path)
    process = ProcessInstance.from_dict(data)

    child_ref = ChildProcessRef(
        id=args.child_id,
        name=args.child_name,
        status=ProcessStatus(args.child_status),
        spawnedAtStep=args.spawned_at_step,
        syncPoint=args.sync_point,
        processPath=args.child_process_path,
    )

    if process.subProcessState is None:
        process.subProcessState = SubProcessState(
            parentProcess=None,
            childProcesses=[child_ref],
        )
    else:
        existing_ids = {c.id for c in process.subProcessState.childProcesses}
        if child_ref.id not in existing_ids:
            process.subProcessState.childProcesses.append(child_ref)
        else:
            for i, c in enumerate(process.subProcessState.childProcesses):
                if c.id == child_ref.id:
                    process.subProcessState.childProcesses[i] = child_ref
                    break

    process.metadata.lastUpdated = _now_iso()
    write_json(process_path, process.to_dict())
    _ok("process.json")


def cmd_update_child_status(args: argparse.Namespace) -> None:
    process_dir = Path(args.process_dir)
    process_path = process_dir / "process.json"

    if not process_path.exists():
        _error(f"process.json not found in {process_dir}")

    data = read_json(process_path)
    process = ProcessInstance.from_dict(data)

    if process.subProcessState is None:
        _error("No subProcessState found on this process")

    new_status = ProcessStatus(args.child_status)
    found = False
    for child in process.subProcessState.childProcesses:
        if child.id == args.child_id:
            child.status = new_status
            found = True
            break

    if not found:
        _error(f"Child process {args.child_id} not found in subProcessState.childProcesses")

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

    # Check if Q&A session exists (Q&A blocks pending-interactions)
    qa_session_path = process_dir / "qa-session.json"
    if qa_session_path.exists():
        script_path = Path(__file__)
        _error(
            "Cannot create pending-interaction while Q&A session is active.\n\n"
            "Complete the Q&A session first:\n"
            f"  1. Check session status: python3 {script_path} get-qa-session --process-dir \"{process_dir}\"\n"
            f"  2. Answer remaining questions: python3 {script_path} update-qa-answer --process-dir \"{process_dir}\" --question-id \"<id>\" --answer \"<text>\"\n"
            f"  3. Complete each question: python3 {script_path} complete-qa-question --process-dir \"{process_dir}\" --question-id \"<id>\"\n"
            f"  4. Archive the session: python3 {script_path} complete-qa-session --process-dir \"{process_dir}\"\n\n"
            "After the session is archived, you can create the pending interaction."
        )

    if not args.options:
        _error("--options is required when creating pending-interaction.json")

    # Guard: only allow pending-interaction on steps with approvalRequired
    process_path = process_dir / "process.json"
    if process_path.exists():
        pdata = read_json(process_path)
        active_step_id = pdata.get("currentState", {}).get("activeStep", {}).get("id", "")
        for step in pdata.get("steps", []):
            if step["id"] == active_step_id:
                if not step.get("approvalRequired"):
                    _error(
                        f"Cannot create pending-interaction: step \"{step.get('name', '')}\" "
                        f"(id: {active_step_id}) does not have approvalRequired: true.\n\n"
                        "Pending interactions (approval checkpoints) are only allowed on steps "
                        "that have approvalRequired set to true in the process template. "
                        "This step should complete without user approval."
                    )
                break

    options_data = json.loads(args.options)
    options = [InteractionOption.from_dict(o) for o in options_data]
    pending = PendingInteractionFile.create(options)

    write_json(pending_path, pending.to_dict())
    _ok("pending-interaction.json")


def cmd_create_qa_session(args: argparse.Namespace) -> None:
    """Create a new Q&A session with questions."""
    process_dir = Path(args.process_dir)
    qa_session_path = process_dir / "qa-session.json"

    if qa_session_path.exists():
        script_path = Path(__file__)
        _error(
            "Q&A session already exists. Complete current session before creating a new one.\n\n"
            "To complete the existing session:\n"
            f"  1. Review it: python3 {script_path} get-qa-session --process-dir \"{process_dir}\"\n"
            f"  2. Answer remaining questions: python3 {script_path} update-qa-answer --process-dir \"{process_dir}\" --question-id \"<id>\" --answer \"<text>\"\n"
            f"  3. Complete each question: python3 {script_path} complete-qa-question --process-dir \"{process_dir}\" --question-id \"<id>\"\n"
            f"  4. Archive: python3 {script_path} complete-qa-session --process-dir \"{process_dir}\""
        )

    questions_data = json.loads(args.questions)
    if not isinstance(questions_data, list):
        _error("questions must be a JSON array")

    now = _now_iso()

    # Initialize all questions with unanswered status and empty answerHistory
    questions = []
    for q in questions_data:
        question = {
            'id': q.get('id'),
            'topic': q.get('topic'),
            'question': q.get('question'),
            'priority': q.get('priority', 'required'),
            'status': 'unanswered',
            'answerHistory': [],
        }
        if 'context' in q:
            question['context'] = q['context']
        if 'options' in q:
            question['options'] = q['options']
        questions.append(question)

    # Derive session status
    session_status = derive_session_status(questions)

    qa_session = {
        'type': 'qa-session',
        'stepId': args.step_id,
        'stepName': args.step_name,
        'timestamp': now,
        'questions': questions,
        'status': session_status,
    }

    # Validate before write
    validate_qa_session(qa_session)

    # Atomic write
    write_json(qa_session_path, qa_session)
    _ok("qa-session.json")


def cmd_update_qa_answer(args: argparse.Namespace) -> None:
    """Add or update answer for a question."""
    process_dir = Path(args.process_dir)
    qa_session_path = process_dir / "qa-session.json"

    if not qa_session_path.exists():
        script_path = Path(__file__)
        _error(
            f"No active Q&A session found in {process_dir}.\n\n"
            "Create one first with:\n"
            f"  python3 {script_path} create-qa-session --process-dir \"{process_dir}\" "
            "--step-id \"<step-id>\" --step-name \"<step-name>\" "
            "--questions '[{\"id\": \"q1\", \"topic\": \"...\", \"question\": \"...\", \"priority\": \"required\"}]'"
        )

    qa_session = read_json(qa_session_path)
    now = _now_iso()

    # Find question by ID
    question = None
    for q in qa_session['questions']:
        if q['id'] == args.question_id:
            question = q
            break

    if not question:
        _error(f"Question not found: {args.question_id}")

    # Add new answer iteration
    if not question['answerHistory']:
        # First answer
        iteration = 1
        question['status'] = 'answered'
    else:
        # Refinement
        iteration = max(a['iteration'] for a in question['answerHistory']) + 1
        question['status'] = 'refined'

    question['answerHistory'].append({
        'answer': args.answer,
        'timestamp': now,
        'iteration': iteration,
    })

    # Re-derive session status
    qa_session['status'] = derive_session_status(qa_session['questions'])

    # Validate and write
    validate_qa_session(qa_session)
    write_json(qa_session_path, qa_session)
    _ok("qa-session.json")


def cmd_complete_qa_question(args: argparse.Namespace) -> None:
    """Mark a question as completed."""
    process_dir = Path(args.process_dir)
    qa_session_path = process_dir / "qa-session.json"

    if not qa_session_path.exists():
        _error(f"No active Q&A session found in {process_dir}. Cannot complete question without an active session.")

    qa_session = read_json(qa_session_path)

    # Find question by ID
    question = None
    for q in qa_session['questions']:
        if q['id'] == args.question_id:
            question = q
            break

    if not question:
        _error(f"Question not found: {args.question_id}")

    # Verify answerHistory is not empty
    if not question['answerHistory']:
        script_path = Path(__file__)
        _error(
            f"Cannot complete unanswered question '{args.question_id}'. Provide at least one answer first.\n\n"
            "Command to answer:\n"
            f"  python3 {script_path} update-qa-answer --process-dir \"{process_dir}\" "
            f"--question-id \"{args.question_id}\" --answer \"<answer text>\"\n\n"
            "After answering, retry the complete-qa-question command."
        )

    # Mark as completed
    question['status'] = 'completed'

    # Re-derive session status
    qa_session['status'] = derive_session_status(qa_session['questions'])

    # Validate and write
    validate_qa_session(qa_session)
    write_json(qa_session_path, qa_session)
    _ok("qa-session.json")


def cmd_complete_qa_session(args: argparse.Namespace) -> None:
    """Archive completed session and delete file."""
    process_dir = Path(args.process_dir)
    qa_session_path = process_dir / "qa-session.json"

    if not qa_session_path.exists():
        _error(f"No active Q&A session found in {process_dir}. Cannot archive without an active session.")

    qa_session = read_json(qa_session_path)

    # Verify all required questions are completed
    required_questions = [q for q in qa_session['questions'] if q['priority'] == 'required']
    incomplete_required = [q for q in required_questions if q['status'] != 'completed']

    if incomplete_required:
        question_ids = [q['id'] for q in incomplete_required]
        script_path = Path(__file__)
        ids_str = ', '.join(question_ids)
        _error(
            f"Cannot complete session: required questions not completed: {ids_str}\n\n"
            "For each incomplete question, answer it then mark it complete:\n"
            f"  python3 {script_path} update-qa-answer --process-dir \"{process_dir}\" --question-id \"<id>\" --answer \"<text>\"\n"
            f"  python3 {script_path} complete-qa-question --process-dir \"{process_dir}\" --question-id \"<id>\"\n\n"
            "After all required questions are completed, retry complete-qa-session."
        )

    # Create log entry
    log_path = process_dir / "log.json"
    if log_path.exists():
        log_data = read_json(log_path)
        log = LogFile.from_dict(log_data)

        step_id = qa_session['stepId']
        qa_log_entry = map_to_qa_session_log(qa_session)

        if step_id in log.steps:
            entry = log.steps[step_id]
            # Add qaSession field to log entry
            if not hasattr(entry, 'qaSession'):
                # Store as additional field in the step entry
                pass
            # We'll add it directly to the dict representation
        else:
            # Create new log entry with qa session
            log.steps[step_id] = LogStepEntry(
                timestamp=qa_session['timestamp'],
            )

        # Write log (we'll add qaSession directly to dict)
        log_dict = log.to_dict()
        if step_id not in log_dict['steps']:
            log_dict['steps'][step_id] = {'timestamp': qa_session['timestamp']}
        log_dict['steps'][step_id]['qaSession'] = qa_log_entry
        write_json(log_path, log_dict)

    # Create memory entry in memory/qa-sessions.json topic file
    memory_dir = process_dir / "memory"
    if memory_dir.exists():
        step_id = qa_session['stepId']
        qa_memory_entry = create_qa_session_memory(qa_session)

        topic_path = memory_dir / "qa-sessions.json"
        if topic_path.exists():
            topic_data = read_json(topic_path)
            topic_file = MemoryTopicFile.from_dict(topic_data)
        else:
            topic_file = MemoryTopicFile.create("qa-sessions")

        now = _now_iso()
        if step_id in topic_file.entries:
            entry = topic_file.entries[step_id]
            entry.informationProduced["qaSession"] = qa_memory_entry
            entry.updatedAt = now
        else:
            topic_file.entries[step_id] = MemoryTopicEntry(
                stepName=qa_session['stepName'],
                informationProduced={"qaSession": qa_memory_entry},
                updatedAt=now,
            )

        topic_file.lastUpdated = now
        write_json(topic_path, topic_file.to_dict())

    # Delete qa-session.json
    qa_session_path.unlink()
    _ok("qa-session.json (archived and deleted)")


def cmd_get_qa_session(args: argparse.Namespace) -> None:
    """Read current Q&A session."""
    process_dir = Path(args.process_dir)
    qa_session_path = process_dir / "qa-session.json"

    if not qa_session_path.exists():
        json.dump({"status": "ok", "session": None}, sys.stdout)
        print()
        return

    qa_session = read_json(qa_session_path)
    json.dump({"status": "ok", "session": qa_session}, sys.stdout)
    print()


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
    p_create.add_argument("--parent-id", help="Parent process UUID")
    p_create.add_argument("--parent-name", help="Parent process name")
    p_create.add_argument("--return-to-step", help="Step ID in parent to return to after child completes")
    p_create.set_defaults(func=cmd_create_process)

    # update-step-status
    p_step = subparsers.add_parser("update-step-status", help="Change step status")
    p_step.add_argument("--process-dir", required=True)
    p_step.add_argument("--step-id", required=True, help="UUID of the step")
    p_step.add_argument("--status", required=True, choices=[s.value for s in StepStatus])
    p_step.set_defaults(func=cmd_update_step_status)

    # approve-step
    p_approve = subparsers.add_parser("approve-step",
        help="Record explicit approval for steps with approvalRequired: true")
    p_approve.add_argument("--process-dir", required=True)
    p_approve.add_argument("--step-id", required=True, help="UUID of the step to approve")
    p_approve.set_defaults(func=cmd_approve_step)

    # update-current-state
    p_state = subparsers.add_parser("update-current-state", help="Update active step")
    p_state.add_argument("--process-dir", required=True)
    p_state.add_argument("--step-id", required=True)
    p_state.add_argument("--step-name", required=True)
    p_state.add_argument("--summary", required=True)
    p_state.add_argument("--details", default=None)
    p_state.add_argument("--total-substeps", type=int, default=None)
    p_state.add_argument("--substep-number", type=int, default=None)
    p_state.add_argument("--substep-name", default=None)
    p_state.set_defaults(func=cmd_update_current_state)

    # update-active-substep
    p_substep = subparsers.add_parser("update-active-substep", help="Update active substep within current step")
    p_substep.add_argument("--process-dir", required=True)
    p_substep.add_argument("--substep-number", type=int, required=True)
    p_substep.add_argument("--substep-name", required=True)
    p_substep.add_argument("--summary", default=None, help="Optionally update actionSummary")
    p_substep.set_defaults(func=cmd_update_active_substep)

    # add-memory-entry
    p_mem = subparsers.add_parser("add-memory-entry", help="Add/update step in memory topic file")
    p_mem.add_argument("--process-dir", required=True)
    p_mem.add_argument("--step-id", required=True)
    p_mem.add_argument("--topic", required=True, help="Topic file name (e.g., context, identified-files)")
    p_mem.add_argument("--info", help="JSON string of informationProduced")
    p_mem.add_argument("--decisions", help="JSON array of decisions")
    p_mem.add_argument("--files", help="JSON array of files modified/created")
    p_mem.set_defaults(func=cmd_add_memory_entry)

    # read-memory-topic
    p_read_mem = subparsers.add_parser("read-memory-topic", help="Read a memory topic file with access validation")
    p_read_mem.add_argument("--process-dir", required=True)
    p_read_mem.add_argument("--step-id", required=True, help="Step ID (for access validation)")
    p_read_mem.add_argument("--topic", required=True, help="Topic name (e.g., context, _cross-references)")
    p_read_mem.set_defaults(func=cmd_read_memory_topic)

    # add-log-entry
    p_log = subparsers.add_parser("add-log-entry", help="Append log entry")
    p_log.add_argument("--process-dir", required=True)
    p_log.add_argument("--step-id", required=True)
    p_log.add_argument("--actions", help="JSON array of actions taken")
    p_log.add_argument("--reasoning", help="JSON array of agent reasoning")
    p_log.add_argument("--files-modified", help="JSON array of files modified")
    p_log.add_argument("--problems", help="JSON array of problems encountered")
    p_log.add_argument("--decisions", help="JSON array of decisions made")
    p_log.add_argument("--performance-notes", help="JSON array of performance notes")
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
    p_pstatus.add_argument("--summary", default=None,
        help="Completion summary (required when completing a sub-process)")
    p_pstatus.set_defaults(func=cmd_update_process_status)

    # register-child-process
    p_register_child = subparsers.add_parser("register-child-process",
        help="Register a child subprocess in parent's process.json")
    p_register_child.add_argument("--process-dir", required=True, help="Parent process directory")
    p_register_child.add_argument("--child-id", required=True, help="Child process UUID")
    p_register_child.add_argument("--child-name", required=True, help="Child process name")
    p_register_child.add_argument("--child-status", required=True,
        choices=[s.value for s in ProcessStatus], help="Child process status")
    p_register_child.add_argument("--spawned-at-step", required=True,
        help="Step UUID in parent that spawned this child")
    p_register_child.add_argument("--sync-point", required=True,
        help="Step UUID where parent waits for child")
    p_register_child.add_argument("--child-process-path", required=True,
        help="Absolute path to child process directory")
    p_register_child.set_defaults(func=cmd_register_child_process)

    # update-child-status
    p_update_child = subparsers.add_parser("update-child-status",
        help="Update a child's status in parent's process.json")
    p_update_child.add_argument("--process-dir", required=True, help="Parent process directory")
    p_update_child.add_argument("--child-id", required=True, help="Child process UUID")
    p_update_child.add_argument("--child-status", required=True,
        choices=[s.value for s in ProcessStatus], help="New status for child")
    p_update_child.set_defaults(func=cmd_update_child_status)

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

    # create-qa-session
    p_qa_create = subparsers.add_parser("create-qa-session", help="Create Q&A session with questions")
    p_qa_create.add_argument("--process-dir", required=True)
    p_qa_create.add_argument("--step-id", required=True, help="Step ID for this Q&A session")
    p_qa_create.add_argument("--step-name", required=True, help="Step name for this Q&A session")
    p_qa_create.add_argument("--questions", required=True, help="JSON array of questions")
    p_qa_create.set_defaults(func=cmd_create_qa_session)

    # update-qa-answer
    p_qa_answer = subparsers.add_parser("update-qa-answer", help="Add or update answer for a question")
    p_qa_answer.add_argument("--process-dir", required=True)
    p_qa_answer.add_argument("--question-id", required=True, help="ID of question to answer")
    p_qa_answer.add_argument("--answer", required=True, help="Answer text")
    p_qa_answer.set_defaults(func=cmd_update_qa_answer)

    # complete-qa-question
    p_qa_complete = subparsers.add_parser("complete-qa-question", help="Mark question as completed")
    p_qa_complete.add_argument("--process-dir", required=True)
    p_qa_complete.add_argument("--question-id", required=True, help="ID of question to complete")
    p_qa_complete.set_defaults(func=cmd_complete_qa_question)

    # complete-qa-session
    p_qa_session_complete = subparsers.add_parser("complete-qa-session", help="Archive session and delete file")
    p_qa_session_complete.add_argument("--process-dir", required=True)
    p_qa_session_complete.set_defaults(func=cmd_complete_qa_session)

    # get-qa-session
    p_qa_get = subparsers.add_parser("get-qa-session", help="Read current Q&A session")
    p_qa_get.add_argument("--process-dir", required=True)
    p_qa_get.set_defaults(func=cmd_get_qa_session)

    _LOG_GATED_COMMANDS = {
        "update-step-status",
        "approve-step",
        "update-current-state",
        "update-active-substep",
        "add-memory-entry",
        "update-process-status",
        "write-pending",
    }

    _APPROVAL_GATED_COMMANDS = {
        "update-step-status",
        "update-current-state",
        "update-active-substep",
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
