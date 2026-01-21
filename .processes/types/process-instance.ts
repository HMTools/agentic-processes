import type { ProcessStatus } from './process-status';
import type { ProcessMetadata } from './process-metadata';
import type { ProcessCurrentState } from './process-current-state';
import type { ProcessStep } from './process-step';
import type { SubProcessState } from './sub-process-state';
import type { ProcessFiles } from './process-files';

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
