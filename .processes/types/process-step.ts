import type { StepStatus } from './step-status';

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

