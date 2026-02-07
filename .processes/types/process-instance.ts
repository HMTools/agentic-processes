import { ChildProcessRef } from "./child-process-ref";
import { ProcessStatus, StepStatus } from "./process-status";
import { ProcessId, StepId, StepRef, ProcessPath, ISOTimestamp } from "./shared-types";

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
 *     "projectPath": "C:/Projects/MyApp",
 *     "processPath": ".user-processes/active/process-550e8400"
 *   },
 *   "status": "running",
 *   "parameters": {
 *     "userStoryTitle": "User Authentication",
 *     "userStoryDescription": "Implement login functionality"
 *   },
 *   "currentState": {
 *     "activeStepId": "a1b2c3d4-...",
 *     "activeStepName": "Create detailed step plans",
 *     "actionSummary": "Generating implementation plan",
 *     "actionDetails": "Analyzing high-level plan to create detailed steps"
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
  
  /** Current pending user interaction, if any. Set by agent when input is needed, cleared when user responds. */
  pendingInteraction?: PendingInteraction;
  
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
  
  /** Absolute path to the project root directory - optional for backward compatibility */
  projectPath?: string;
  
  /** Relative path to the process folder from project root - optional for backward compatibility */
  processPath?: ProcessPath;
}

/**
 * Current state of the process execution.
 */
export interface ProcessCurrentState {
  /** UUID of the currently active step */
  activeStepId: StepId;
  
  /** Name of the current step */
  activeStepName: string;
  
  /** Brief summary of current action (for UI status bars) */
  actionSummary: string;
  
  /** Extended details about the current action (for tooltips/logs) */
  actionDetails?: string;
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
}

/**
 * An option presented to the user for selection during process interaction.
 * Used whenever a process needs any form of user input.
 * 
 * @example
 * ```json
 * {
 *   "pendingInteraction": {
 *     "options": [
 *       { "id": "approve", "label": "Approve", "isDefault": true },
 *       { "id": "reject", "label": "Reject" },
 *       { "id": "revise", "label": "Request Changes", "description": "Ask for modifications before approving" }
 *     ]
 *   }
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
 * Represents a pending user interaction at the process level.
 * Set by the agent when user input is needed, cleared when user responds.
 */
export interface PendingInteraction {
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
  
  /** Path to the parent process folder (relative to project root) */
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
