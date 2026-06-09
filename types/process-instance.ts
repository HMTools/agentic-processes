import { ChildProcessRef } from "./child-process-ref";
import { ProcessStatus, StepStatus } from "./process-status";
import { ProcessId, StepId, StepRef, ProcessPath, ISOTimestamp } from "./shared-types";
import { EmbeddedStepDefinition } from "./step-definition";

/**
 * Complete process instance as stored in process.json.
 * 
 * This is the main type that represents a running, completed, or failed process.
 * The process.json file is generated when a process is created and updated
 * whenever the process state changes.
 * 
 * @example
 * ```json
 * {
 *   "type": "process-instance",
 *   "id": "550e8400-e29b-41d4-a716-446655440000",
 *   "name": "User Authentication",
 *   "metadata": {
 *     "template": "develop-user-story",
 *     "templateCategory": "development",
 *     "created": "2026-01-20T14:30:22.000Z",
 *     "lastUpdated": "2026-01-20T15:45:00.000Z",
 *     "projectPaths": ["C:/Projects/MyApp"],
 *     "processPath": "~/.claude/agentic-processes/active/process-550e8400-a1b2c3"
 *   },
 *   "status": "running",
 *   "parameters": {
 *     "userStoryTitle": "User Authentication",
 *     "userStoryDescription": "Implement login functionality"
 *   },
 *   "currentState": {
 *     "activeStep": {
 *       "id": "a1b2c3d4-...",
 *       "name": "Create detailed step plans",
 *       "actionSummary": "Generating implementation plan",
 *       "actionDetails": "Analyzing high-level plan to create detailed steps",
 *       "totalSubsteps": 10,
 *       "currentSubstep": {
 *         "number": 3,
 *         "name": "Clarify Requirements"
 *       }
 *     }
 *   },
 *   "steps": [...]
 * }
 * ```
 */
export interface ProcessInstance {
  /** Discriminator field - always "process-instance" */
  type: 'process-instance';
  
  /** Unique identifier for this process instance (UUID) */
  id: ProcessId;
  
  /** Human-readable name of the process */
  name: string;
  
  /** Metadata about the process (template, timestamps, paths) */
  metadata: ProcessMetadata;
  
  /** Current overall status of the process */
  status: ProcessStatus;
  
  /** Parameters that were provided when creating this process from a template */
  parameters: Record<string, string>;
  
  /** Current execution state (active step, current action) */
  currentState: ProcessCurrentState;
  
  /** All steps in this process with their current status */
  steps: ProcessStep[];
  
  /** Sub-process relationship information (optional, only present if process has parent or children) */
  subProcessState?: SubProcessState;
}

/**
 * Metadata about the process instance.
 */
export interface ProcessMetadata {
  /** Name of the template used to create this process (e.g., "develop-user-story") */
  template: string;
  
  /** Category of the template (e.g., "development", "testing", "infrastructure") - optional for backward compatibility */
  templateCategory?: string;
  
  /** ISO 8601 timestamp when the process was created */
  created: ISOTimestamp;
  
  /** ISO 8601 timestamp when the process was last updated */
  lastUpdated: ISOTimestamp;
  
  /** Absolute paths to the project root directories this process operates on */
  projectPaths?: string[];

  /** Absolute path to the process folder (e.g., ~/.claude/agentic-processes/active/process-name-YYYYMMDD-shortid) */
  processPath?: ProcessPath;

  /**
   * @deprecated Session binding moved to .session file in process directory.
   * The bind-session-to-process hook writes the session ID to a dedicated
   * .session file (plain text) alongside process.json. Consumer hooks read
   * that file instead of grepping process.json. This field is no longer used.
   */
  sessionId?: string;
}

/**
 * Tracks which substep is currently executing within the active step.
 * Only the cursor position is stored; completed/pending status is derived at render time.
 */
export interface ActiveStepSubstep {
  /** 1-based substep number within the step */
  number: number;
  /** Name of the substep (e.g., "Gather Process Parameters") */
  name: string;
}

/**
 * A record of a file operation performed during step execution.
 * Tracked automatically by the PostToolUse hook.
 */
export interface FileChange {
  /** Absolute file path */
  path: string;
  /** What happened to the file */
  operation: 'created' | 'edited' | 'deleted';
  /** Which tool performed it (Write, Edit, Bash) */
  tool: string;
  /** When it happened */
  timestamp: string;
}

/**
 * Structured representation of the currently active step and its progress.
 * Consolidates the former flat fields (activeStepId, activeStepName, actionSummary, actionDetails)
 * into a single object and adds substep-level tracking.
 */
export interface ActiveStep {
  /** UUID of the currently active step (was: activeStepId) */
  id: StepId;
  /** Name of the current step (was: activeStepName) */
  name: string;
  /** Brief summary of current action for UI status bars (was: actionSummary) */
  actionSummary: string;
  /** Extended details about the current action for tooltips/logs (was: actionDetails) */
  actionDetails?: string;
  /** Total number of substeps in this step (derived from stepDefinition.substeps) */
  totalSubsteps: number;
  /** Currently executing substep cursor (absent if step just started or has no substeps) */
  currentSubstep?: ActiveStepSubstep;
  /** Files changed during this step's execution, tracked by PostToolUse hook */
  filesChanged?: FileChange[];
}

/**
 * Current state of the process execution.
 */
export interface ProcessCurrentState {
  /** Structured active step with progress tracking */
  activeStep: ActiveStep;
}

/**
 * Represents an individual step within a process.
 */
export interface ProcessStep {
  /** Unique identifier for this step (UUID) */
  id: StepId;
  
  /** Step number (for ordering and display) */
  number: number;
  
  /** Human-readable name of the step */
  name: string;
  
  /** Current status of this step */
  status: StepStatus;
  
  /** Reference to the step definition */
  stepRef: StepRef;
  
  /** ISO 8601 timestamp when the step was started */
  startedAt?: ISOTimestamp;
  
  /** ISO 8601 timestamp when the step was completed */
  completedAt?: ISOTimestamp;
  
  /** Whether this step requires explicit user approval before proceeding */
  approvalRequired?: boolean;
  
  /** Whether user approval has been granted (only relevant if approvalRequired is true) */
  approved?: boolean;

  /** Embedded step definition with full execution guidance */
  stepDefinition: EmbeddedStepDefinition;
}

/**
 * An option presented to the user for selection during process interaction.
 * Used whenever a process needs any form of user input.
 *
 * @example
 * ```json
 * {
 *   "type": "pending-interaction",
 *   "options": [
 *     { "id": "approve", "label": "Approve", "isDefault": true },
 *     { "id": "reject", "label": "Reject" },
 *     { "id": "revise", "label": "Request Changes", "description": "Ask for modifications before approving" }
 *   ]
 * }
 * ```
 */
export interface InteractionOption {
  /** Unique identifier for this option (e.g., "approve", "reject", "option-a") */
  id: string;
  
  /** Display label for this option in the UI */
  label: string;
  
  /** Optional longer description shown as tooltip or help text */
  description?: string;
  
  /** Whether this option should be pre-selected/highlighted as default */
  isDefault?: boolean;
}

/**
 * The options shape used within a PendingInteractionFile.
 * Kept as a named interface for reuse and clarity.
 */
export interface PendingInteraction {
  /** Options for user selection, dynamically generated by the agent */
  options: InteractionOption[];
}

/**
 * The content of a pending-interaction.json file in a process folder.
 * Created by the agent when user input is needed, deleted when user responds.
 * Stored as a separate file from process.json to isolate volatile interaction state.
 *
 * File location: {process-folder}/pending-interaction.json
 * File absence = no pending interaction.
 */
export interface PendingInteractionFile {
  /** Discriminator field - always "pending-interaction" */
  type: 'pending-interaction';
  /** Options for user selection, dynamically generated by the agent */
  options: InteractionOption[];
}

/**
 * Reference to a parent process that spawned this sub-process.
 */
export interface ParentProcessRef {
  /** Unique identifier of the parent process (UUID) */
  id: ProcessId;
  
  /** Human-readable name of the parent process */
  name: string;
  
  /** Absolute path to the parent process folder */
  processPath: ProcessPath;
  
  /** Step ID in the parent process to return to after this sub-process completes */
  returnToStep: StepId;
}

/**
 * State information for sub-process relationships.
 */
export interface SubProcessState {
  /** Reference to the parent process, or null if this is a root process */
  parentProcess: ParentProcessRef | null;
  
  /** List of child sub-processes spawned by this process */
  childProcesses: ChildProcessRef[];
  
  /** Next sync point where parent will wait for children (StepId) */
  nextSyncPoint?: StepId;
}
