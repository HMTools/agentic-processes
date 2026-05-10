"""
Python dataclass models mirroring TypeScript types from types/ (at plugin root, via CLAUDE_PLUGIN_ROOT/types/).
Provides serialization (to_dict/from_dict) and factory methods for all process file structures.
"""

from __future__ import annotations

import json
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


# --- Enums ---

class ProcessStatus(Enum):
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"


class StepStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"
    AWAITING_APPROVAL = "awaiting_approval"


# --- Process Instance types ---

@dataclass
class ProcessMetadata:
    template: str
    created: str
    lastUpdated: str
    templateCategory: Optional[str] = None
    projectPaths: Optional[list[str]] = None
    processPath: Optional[str] = None

    def to_dict(self) -> dict:
        d: dict[str, Any] = {
            "template": self.template,
            "created": self.created,
            "lastUpdated": self.lastUpdated,
        }
        if self.templateCategory is not None:
            d["templateCategory"] = self.templateCategory
        if self.projectPaths is not None:
            d["projectPaths"] = self.projectPaths
        if self.processPath is not None:
            d["processPath"] = self.processPath
        return d

    @classmethod
    def from_dict(cls, data: dict) -> ProcessMetadata:
        # Backward compat: read legacy projectPath (string) as projectPaths (list)
        project_paths = data.get("projectPaths")
        if project_paths is None:
            old_val = data.get("projectPath")
            if old_val is not None:
                project_paths = [old_val]
        return cls(
            template=data["template"],
            created=data["created"],
            lastUpdated=data["lastUpdated"],
            templateCategory=data.get("templateCategory"),
            projectPaths=project_paths,
            processPath=data.get("processPath"),
        )


@dataclass
class ProcessCurrentState:
    activeStepId: str
    activeStepName: str
    actionSummary: str
    actionDetails: Optional[str] = None

    def to_dict(self) -> dict:
        d: dict[str, Any] = {
            "activeStepId": self.activeStepId,
            "activeStepName": self.activeStepName,
            "actionSummary": self.actionSummary,
        }
        if self.actionDetails is not None:
            d["actionDetails"] = self.actionDetails
        return d

    @classmethod
    def from_dict(cls, data: dict) -> ProcessCurrentState:
        return cls(
            activeStepId=data["activeStepId"],
            activeStepName=data["activeStepName"],
            actionSummary=data["actionSummary"],
            actionDetails=data.get("actionDetails"),
        )


@dataclass
class ProcessStep:
    id: str
    number: int
    name: str
    status: StepStatus
    stepRef: str
    startedAt: Optional[str] = None
    completedAt: Optional[str] = None
    approvalRequired: Optional[bool] = None
    approved: Optional[bool] = None

    def to_dict(self) -> dict:
        d: dict[str, Any] = {
            "id": self.id,
            "number": self.number,
            "name": self.name,
            "status": self.status.value,
            "stepRef": self.stepRef,
        }
        if self.startedAt is not None:
            d["startedAt"] = self.startedAt
        if self.completedAt is not None:
            d["completedAt"] = self.completedAt
        if self.approvalRequired is not None:
            d["approvalRequired"] = self.approvalRequired
        if self.approved is not None:
            d["approved"] = self.approved
        return d

    @classmethod
    def from_dict(cls, data: dict) -> ProcessStep:
        return cls(
            id=data["id"],
            number=data["number"],
            name=data["name"],
            status=StepStatus(data["status"]),
            stepRef=data["stepRef"],
            startedAt=data.get("startedAt"),
            completedAt=data.get("completedAt"),
            approvalRequired=data.get("approvalRequired"),
            approved=data.get("approved"),
        )


@dataclass
class ChildProcessRef:
    id: str
    name: str
    status: ProcessStatus
    spawnedAtStep: str
    syncPoint: str
    processPath: str

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "status": self.status.value,
            "spawnedAtStep": self.spawnedAtStep,
            "syncPoint": self.syncPoint,
            "processPath": self.processPath,
        }

    @classmethod
    def from_dict(cls, data: dict) -> ChildProcessRef:
        return cls(
            id=data["id"],
            name=data["name"],
            status=ProcessStatus(data["status"]),
            spawnedAtStep=data["spawnedAtStep"],
            syncPoint=data["syncPoint"],
            processPath=data["processPath"],
        )


@dataclass
class ParentProcessRef:
    id: str
    name: str
    processPath: str
    returnToStep: str

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "processPath": self.processPath,
            "returnToStep": self.returnToStep,
        }

    @classmethod
    def from_dict(cls, data: dict) -> ParentProcessRef:
        return cls(
            id=data["id"],
            name=data["name"],
            processPath=data["processPath"],
            returnToStep=data["returnToStep"],
        )


@dataclass
class SubProcessState:
    parentProcess: Optional[ParentProcessRef] = None
    childProcesses: list[ChildProcessRef] = field(default_factory=list)
    nextSyncPoint: Optional[str] = None

    def to_dict(self) -> dict:
        d: dict[str, Any] = {
            "parentProcess": self.parentProcess.to_dict() if self.parentProcess else None,
            "childProcesses": [c.to_dict() for c in self.childProcesses],
        }
        if self.nextSyncPoint is not None:
            d["nextSyncPoint"] = self.nextSyncPoint
        return d

    @classmethod
    def from_dict(cls, data: dict) -> SubProcessState:
        parent = data.get("parentProcess")
        return cls(
            parentProcess=ParentProcessRef.from_dict(parent) if parent else None,
            childProcesses=[ChildProcessRef.from_dict(c) for c in data.get("childProcesses", [])],
            nextSyncPoint=data.get("nextSyncPoint"),
        )


@dataclass
class ProcessInstance:
    type: str
    id: str
    name: str
    metadata: ProcessMetadata
    status: ProcessStatus
    parameters: dict[str, str]
    currentState: ProcessCurrentState
    steps: list[ProcessStep]
    subProcessState: Optional[SubProcessState] = None

    def to_dict(self) -> dict:
        d: dict[str, Any] = {
            "type": self.type,
            "id": self.id,
            "name": self.name,
            "metadata": self.metadata.to_dict(),
            "status": self.status.value,
            "parameters": self.parameters,
            "currentState": self.currentState.to_dict(),
            "steps": [s.to_dict() for s in self.steps],
        }
        if self.subProcessState is not None:
            d["subProcessState"] = self.subProcessState.to_dict()
        return d

    @classmethod
    def from_dict(cls, data: dict) -> ProcessInstance:
        sub = data.get("subProcessState")
        return cls(
            type=data["type"],
            id=data["id"],
            name=data["name"],
            metadata=ProcessMetadata.from_dict(data["metadata"]),
            status=ProcessStatus(data["status"]),
            parameters=data.get("parameters", {}),
            currentState=ProcessCurrentState.from_dict(data["currentState"]),
            steps=[ProcessStep.from_dict(s) for s in data["steps"]],
            subProcessState=SubProcessState.from_dict(sub) if sub else None,
        )

    @classmethod
    def create(
        cls,
        name: str,
        template: str,
        parameters: dict[str, str],
        steps: list[ProcessStep],
        project_paths: list[str],
        process_path: str,
        template_category: Optional[str] = None,
        parent_process: Optional[ParentProcessRef] = None,
    ) -> ProcessInstance:
        now = _now_iso()
        sub_state = None
        if parent_process is not None:
            sub_state = SubProcessState(parentProcess=parent_process)

        return cls(
            type="process-instance",
            id=_new_uuid(),
            name=name,
            metadata=ProcessMetadata(
                template=template,
                templateCategory=template_category,
                created=now,
                lastUpdated=now,
                projectPaths=project_paths,
                processPath=process_path,
            ),
            status=ProcessStatus.RUNNING,
            parameters=parameters,
            currentState=ProcessCurrentState(
                activeStepId=steps[0].id if steps else "",
                activeStepName=steps[0].name if steps else "",
                actionSummary="Initializing process",
                actionDetails="Process created, ready to begin",
            ),
            steps=steps,
            subProcessState=sub_state,
        )


# --- Interaction types ---

@dataclass
class InteractionOption:
    id: str
    label: str
    description: Optional[str] = None
    isDefault: Optional[bool] = None

    def to_dict(self) -> dict:
        d: dict[str, Any] = {"id": self.id, "label": self.label}
        if self.description is not None:
            d["description"] = self.description
        if self.isDefault is not None:
            d["isDefault"] = self.isDefault
        return d

    @classmethod
    def from_dict(cls, data: dict) -> InteractionOption:
        return cls(
            id=data["id"],
            label=data["label"],
            description=data.get("description"),
            isDefault=data.get("isDefault"),
        )


@dataclass
class PendingInteractionFile:
    type: str
    options: list[InteractionOption]

    def to_dict(self) -> dict:
        return {
            "type": self.type,
            "options": [o.to_dict() for o in self.options],
        }

    @classmethod
    def from_dict(cls, data: dict) -> PendingInteractionFile:
        return cls(
            type=data["type"],
            options=[InteractionOption.from_dict(o) for o in data["options"]],
        )

    @classmethod
    def create(cls, options: list[InteractionOption]) -> PendingInteractionFile:
        return cls(type="pending-interaction", options=options)


# --- Memory File types ---

@dataclass
class MemoryStepEntry:
    name: str
    informationProduced: dict[str, Any] = field(default_factory=dict)
    decisionsMade: list[str] = field(default_factory=list)
    filesModifiedCreated: list[str] = field(default_factory=list)
    status: Optional[StepStatus] = None
    startedAt: Optional[str] = None
    updatedAt: Optional[str] = None
    notes: Optional[str] = None

    def to_dict(self) -> dict:
        d: dict[str, Any] = {
            "name": self.name,
            "informationProduced": self.informationProduced,
            "decisionsMade": self.decisionsMade,
            "filesModifiedCreated": self.filesModifiedCreated,
        }
        if self.status is not None:
            d["status"] = self.status.value
        if self.startedAt is not None:
            d["startedAt"] = self.startedAt
        if self.updatedAt is not None:
            d["updatedAt"] = self.updatedAt
        if self.notes is not None:
            d["notes"] = self.notes
        return d

    @classmethod
    def from_dict(cls, data: dict) -> MemoryStepEntry:
        status_val = data.get("status")
        return cls(
            name=data["name"],
            informationProduced=data.get("informationProduced", {}),
            decisionsMade=data.get("decisionsMade", []),
            filesModifiedCreated=data.get("filesModifiedCreated", []),
            status=StepStatus(status_val) if status_val else None,
            startedAt=data.get("startedAt"),
            updatedAt=data.get("updatedAt"),
            notes=data.get("notes"),
        )


@dataclass
class MemoryFile:
    type: str
    metadata: dict[str, Any]
    subProcessState: dict[str, Any]
    steps: dict[str, MemoryStepEntry]
    crossReferences: dict[str, Any]
    searchHelpers: dict[str, Any]

    def to_dict(self) -> dict:
        return {
            "type": self.type,
            "metadata": self.metadata,
            "subProcessState": {
                "parentProcessPath": self.subProcessState.get("parentProcessPath"),
                "childSubProcesses": [
                    c if isinstance(c, dict) else c.to_dict()
                    for c in self.subProcessState.get("childSubProcesses", [])
                ],
                "syncPoints": self.subProcessState.get("syncPoints", []),
            },
            "steps": {k: v.to_dict() for k, v in self.steps.items()},
            "crossReferences": self.crossReferences,
            "searchHelpers": self.searchHelpers,
        }

    @classmethod
    def from_dict(cls, data: dict) -> MemoryFile:
        steps = {}
        for step_id, entry in data.get("steps", {}).items():
            steps[step_id] = MemoryStepEntry.from_dict(entry)
        return cls(
            type=data["type"],
            metadata=data["metadata"],
            subProcessState=data.get("subProcessState", {
                "parentProcessPath": None,
                "childSubProcesses": [],
                "syncPoints": [],
            }),
            steps=steps,
            crossReferences=data.get("crossReferences", {"keyDecisions": []}),
            searchHelpers=data.get("searchHelpers", {"byCategory": {}}),
        )

    @classmethod
    def create(
        cls,
        process_id: str,
        template: str,
        current_step: str,
        parent_process_path: Optional[str] = None,
    ) -> MemoryFile:
        now = _now_iso()
        return cls(
            type="memory-file",
            metadata={
                "process": process_id,
                "template": template,
                "created": now,
                "lastUpdated": now,
                "currentStep": current_step,
            },
            subProcessState={
                "parentProcessPath": parent_process_path,
                "childSubProcesses": [],
                "syncPoints": [],
            },
            steps={},
            crossReferences={"keyDecisions": [], "filesModified": [], "filesCreated": []},
            searchHelpers={"byCategory": {}},
        )


# --- Log File types ---

@dataclass
class UserInteraction:
    request: str
    reason: str
    agentResponse: str
    timestamp: str
    forImprovementStep: Optional[bool] = None
    potentialImprovement: Optional[str] = None

    def to_dict(self) -> dict:
        d: dict[str, Any] = {
            "request": self.request,
            "reason": self.reason,
            "agentResponse": self.agentResponse,
            "timestamp": self.timestamp,
        }
        if self.forImprovementStep is not None:
            d["forImprovementStep"] = self.forImprovementStep
        if self.potentialImprovement is not None:
            d["potentialImprovement"] = self.potentialImprovement
        return d

    @classmethod
    def from_dict(cls, data: dict) -> UserInteraction:
        return cls(
            request=data["request"],
            reason=data["reason"],
            agentResponse=data["agentResponse"],
            timestamp=data["timestamp"],
            forImprovementStep=data.get("forImprovementStep"),
            potentialImprovement=data.get("potentialImprovement"),
        )


@dataclass
class LogStepEntry:
    timestamp: Any  # str (ISO) or dict (StepTimestamp)
    userInteractions: Optional[list[UserInteraction]] = None
    actionsTaken: Optional[list[str]] = None
    agentReasoning: Optional[list[str]] = None
    problemsEncountered: Optional[list[str]] = None
    filesModified: Optional[list[str]] = None
    decisionsMade: Optional[list[str]] = None
    performanceNotes: Optional[list[str]] = None

    def to_dict(self) -> dict:
        d: dict[str, Any] = {}
        if isinstance(self.timestamp, dict):
            d["timestamp"] = self.timestamp
        else:
            d["timestamp"] = self.timestamp
        if self.userInteractions is not None:
            d["userInteractions"] = [ui.to_dict() for ui in self.userInteractions]
        if self.actionsTaken is not None:
            d["actionsTaken"] = self.actionsTaken
        if self.agentReasoning is not None:
            d["agentReasoning"] = self.agentReasoning
        if self.problemsEncountered is not None:
            d["problemsEncountered"] = self.problemsEncountered
        if self.filesModified is not None:
            d["filesModified"] = self.filesModified
        if self.decisionsMade is not None:
            d["decisionsMade"] = self.decisionsMade
        if self.performanceNotes is not None:
            d["performanceNotes"] = self.performanceNotes
        return d

    @classmethod
    def from_dict(cls, data: dict) -> LogStepEntry:
        interactions = data.get("userInteractions")
        return cls(
            timestamp=data["timestamp"],
            userInteractions=[UserInteraction.from_dict(ui) for ui in interactions] if interactions else None,
            actionsTaken=data.get("actionsTaken"),
            agentReasoning=data.get("agentReasoning"),
            problemsEncountered=data.get("problemsEncountered"),
            filesModified=data.get("filesModified"),
            decisionsMade=data.get("decisionsMade"),
            performanceNotes=data.get("performanceNotes"),
        )


@dataclass
class LogFile:
    type: str
    metadata: dict[str, Any]
    steps: dict[str, LogStepEntry]
    processWideObservations: dict[str, Any]
    executionMetrics: Optional[dict[str, Any]] = None
    userInteractions: Optional[list[UserInteraction]] = None

    def to_dict(self) -> dict:
        d: dict[str, Any] = {
            "type": self.type,
            "metadata": self.metadata,
            "steps": {k: v.to_dict() for k, v in self.steps.items()},
            "processWideObservations": self.processWideObservations,
        }
        if self.executionMetrics is not None:
            d["executionMetrics"] = self.executionMetrics
        if self.userInteractions is not None:
            d["userInteractions"] = [ui.to_dict() for ui in self.userInteractions]
        return d

    @classmethod
    def from_dict(cls, data: dict) -> LogFile:
        steps = {}
        for step_id, entry in data.get("steps", {}).items():
            steps[step_id] = LogStepEntry.from_dict(entry)
        top_interactions = data.get("userInteractions")
        return cls(
            type=data["type"],
            metadata=data["metadata"],
            steps=steps,
            processWideObservations=data.get("processWideObservations", {
                "patternsDetected": [],
                "userFeedbackSummary": [],
                "efficiencyMetrics": {},
                "recommendationsForFuture": [],
            }),
            executionMetrics=data.get("executionMetrics"),
            userInteractions=[UserInteraction.from_dict(ui) for ui in top_interactions] if top_interactions else None,
        )

    @classmethod
    def create(
        cls,
        process_id: str,
        template: str,
        total_steps: int,
        first_step_id: str,
        parent_process_path: Optional[str] = None,
    ) -> LogFile:
        now = _now_iso()
        return cls(
            type="log-file",
            metadata={
                "process": process_id,
                "template": template,
                "started": now,
                "completed": None,
                "parentProcessPath": parent_process_path,
                "subProcessPaths": [],
            },
            steps={},
            processWideObservations={
                "patternsDetected": [],
                "userFeedbackSummary": [],
                "efficiencyMetrics": {},
                "recommendationsForFuture": [],
            },
            executionMetrics={
                "totalSteps": total_steps,
                "stepsCompleted": 0,
                "currentStep": first_step_id,
            },
        )


# --- Template Source types ---

@dataclass
class TemplateSource:
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
    def from_dict(cls, data: dict) -> TemplateSource:
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
    ) -> TemplateSource:
        return cls(
            name=name,
            url=url,
            branch=branch,
            enabled=enabled,
            priority=priority,
        )


@dataclass
class TemplateSourcesConfig:
    sources: list[TemplateSource]
    settings: dict[str, Any]

    def to_dict(self) -> dict:
        return {
            "sources": [s.to_dict() for s in self.sources],
            "settings": self.settings,
        }

    @classmethod
    def from_dict(cls, data: dict) -> TemplateSourcesConfig:
        return cls(
            sources=[TemplateSource.from_dict(s) for s in data.get("sources", [])],
            settings=data.get("settings", {
                "autoSyncOnStale": False,
                "staleDurationMinutes": 1440,
            }),
        )

    @classmethod
    def create(
        cls,
        sources: Optional[list[TemplateSource]] = None,
        settings: Optional[dict[str, Any]] = None,
    ) -> TemplateSourcesConfig:
        return cls(
            sources=sources or [],
            settings=settings or {
                "autoSyncOnStale": False,
                "staleDurationMinutes": 1440,
            },
        )


# --- File I/O helpers ---

def read_json(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
