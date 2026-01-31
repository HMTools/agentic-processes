/**
 * Schema for log.json files in process instances (.user-processes/**/log.json)
 * 
 * Captures detailed execution history, user interactions, and process-wide observations.
 */

/**
 * A single user interaction record
 */
export interface UserInteraction {
  /** What the user requested */
  request: string;
  /** Why the user made this request */
  reason: string;
  /** How the agent responded */
  agentResponse: string;
  /** When this interaction occurred (ISO 8601) */
  timestamp: string;
  /** Flag indicating this should be reviewed in continuous improvement step */
  forImprovementStep?: boolean;
  /** Potential improvement to consider based on this interaction */
  potentialImprovement?: string;
}

/**
 * Log entry for a single step
 */
export interface LogStepEntry {
  /** User interactions during this step */
  userInteractions?: UserInteraction[];
  /** Timestamp when step started (ISO 8601) */
  timestamp?: string;
  /** Actions taken during this step */
  actionsTaken?: string[];
  /** Agent reasoning during this step */
  agentReasoning?: string[];
  /** Problems encountered during this step */
  problemsEncountered?: string[];
  /** Files modified during this step */
  filesModified?: string[];
  /** Decisions made during this step */
  decisionsMade?: string[];
  /** Performance notes */
  performanceNotes?: string[];
}

/**
 * Complete log file structure for process instances
 */
export interface LogFile {
  /** Discriminator field (optional for backwards compatibility) */
  type?: 'log-file';
  
  /** Process metadata */
  metadata: {
    /** Process instance ID */
    process: string;
    /** Template used to create this process */
    template: string;
    /** When process started (ISO 8601) */
    started: string;
    /** When process completed (ISO 8601, null if still running) */
    completed: string | null;
    /** Parent process path (null if top-level process) */
    parentProcess: string | null;
    /** Sub-processes spawned from this process */
    subProcesses: string[];
  };
  
  /** Execution metrics (optional) */
  executionMetrics?: {
    /** Total steps in process */
    totalSteps: number;
    /** Steps completed so far */
    stepsCompleted: number;
    /** Current step number */
    currentStep: number;
  };
  
  /** Step-by-step log entries (keyed by step number as string) */
  steps: Record<string, LogStepEntry>;
  
  /** User interactions at process level (alternative location) */
  userInteractions?: UserInteraction[];
  
  /** Process-wide observations for learning and improvement */
  processWideObservations: {
    /** Patterns detected during execution */
    patternsDetected: string[];
    /** Summary of user feedback received */
    userFeedbackSummary: string[];
    /** Efficiency metrics collected */
    efficiencyMetrics: Record<string, unknown>;
    /** Recommendations for future process executions */
    recommendationsForFuture: string[];
  };
}
