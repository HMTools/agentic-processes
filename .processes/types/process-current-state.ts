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

