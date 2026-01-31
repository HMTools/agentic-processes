import { ChildProcessRef } from "./child-process-ref";
import { ProcessStatus } from "./process-status";

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
 *   "id": "process-user-auth-20260120-143022",
 *   "name": "User Authentication",
 *   "metadata": {
 *     "template": "develop-user-story",
 *     "templateCategory": "development",
 *     "created": "2026-01-20T14:30:22.000Z",
 *     "lastUpdated": "2026-01-20T15:45:00.000Z",
 *     "projectPath": "C:/Projects/MyApp",
 *     "processPath": ".user-processes/active/process-user-auth-20260120-143022"
 *   },
 *   "status": "running",
 *   "parameters": {
 *     "userStoryTitle": "User Authentication",
 *     "userStoryDescription": "Implement login functionality"
 *   },
 *   "currentState": {
 *     "activeStepNumber": 3,
 *     "activeStepName": "Create detailed step plans",
 *     "currentAction": "Generating implementation plan",
 *     "details": "Analyzing high-level plan to create detailed steps"
 *   },
 *   "steps": [...],
 *   "files": {
 *     "process": "process.md",
 *     "memory": "memory.json",
 *     "log": "log.json"
 *   }
 * }
 * ```
 */
export interface ProcessInstance {
  /** Discriminator field - always "process-instance" */
  type: 'process-instance';
  
  /** Unique identifier for this process instance (e.g., "process-user-auth-20260120-143022") */
  id: string;
  
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
  
  /** References to the markdown files that make up this process */
  files: ProcessFiles;
}

/**
 * Metadata about the process instance.
 */
export interface ProcessMetadata {
  /** Name of the template used to create this process (e.g., "develop-user-story") */
  template: string;
  
  /** Category of the template (e.g., "development", "testing", "infrastructure") */
  templateCategory: string;
  
  /** ISO 8601 timestamp when the process was created */
  created: string;
  
  /** ISO 8601 timestamp when the process was last updated */
  lastUpdated: string;
  
  /** Absolute path to the project root directory */
  projectPath: string;
  
  /** Relative path to the process folder from project root */
  processPath: string;
}

/**
 * Current state of the process execution.
 */
export interface ProcessCurrentState {
  /** Current step number (1-based index) */
  activeStepNumber: number;
  
  /** Name of the current step */
  activeStepName: string;
  
  /** Description of what is currently being worked on */
  currentAction: string;
  
  /** Additional details about the current action */
  details?: string;
}

/**
 * Represents an individual step within a process.
 */
export interface ProcessStep {
  /** Step number (1-based index) */
  number: number;
  
  /** Human-readable name of the step */
  name: string;
  
  /** Current status of this step */
  status: StepStatus;
  
  /** Reference to the step definition (e.g., "@framework-step:planning/create-high-level-plan") */
  stepRef?: string;
  
  /** Description of expected output from this step */
  output?: string;
  
  /** ISO 8601 timestamp when the step was started */
  startedAt?: string;
  
  /** ISO 8601 timestamp when the step was completed */
  completedAt?: string;
  
  /** Whether this step requires explicit user approval before proceeding */
  approvalRequired?: boolean;
  
  /** Whether user approval has been granted (only relevant if approvalRequired is true) */
  approved?: boolean;
}

/**
 * Reference to a parent process that spawned this sub-process.
 */
export interface ParentProcessRef {
  /** Unique identifier of the parent process */
  id: string;
  
  /** Human-readable name of the parent process */
  name: string;
  
  /** Path to the parent process folder (relative to project root) */
  processPath: string;
  
  /** Step number in the parent process to return to after this sub-process completes */
  returnToStep: number;
}

/**
 * State information for sub-process relationships.
 */
export interface SubProcessState {
  /** Reference to the parent process, or null if this is a root process */
  parentProcess: ParentProcessRef | null;
  
  /** List of child sub-processes spawned by this process */
  childProcesses: ChildProcessRef[];
  
  /** Next sync point where parent will wait for children (if any) */
  nextSyncPoint?: string;
}



/**
 * References to the files that make up a process instance.
 */
export interface ProcessFiles {
  /** Relative path to process.md from process folder */
  process: string;
  
  /** Relative path to memory.json from process folder */
  memory: string;
  
  /** Relative path to log.json from process folder */
  log: string;
}

/**
 * Status of an individual step within a process.
 */
export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';