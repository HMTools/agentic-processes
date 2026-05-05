/**
 * Schema for memory.json files in process instances (~/.claude/agentic-processes/active/[id]/memory.json)
 * 
 * Tracks step information, decisions, and cross-references during process execution.
 */

import { ChildProcessRef } from "./child-process-ref";
import { StepStatus } from "./process-status";
import { StepId, ISOTimestamp, ProcessPath } from "./shared-types";

/**
 * Entry for a single step in the memory file
 */
export interface MemoryStepEntry {
  /** Step name */
  name: string;
  
  /** Step execution status */
  status?: StepStatus;
  
  /** When this step started (ISO 8601) */
  startedAt?: ISOTimestamp;
  
  /** When this step was last updated (ISO 8601) */
  updatedAt?: ISOTimestamp;
  
  /** Information produced during this step */
  informationProduced: Record<string, unknown>;
  
  /** Decisions made during this step */
  decisionsMade: string[];
  
  /** Files modified or created during this step */
  filesModifiedCreated: string[];
  
  /** Additional notes */
  notes?: string;
}

/**
 * Complete memory file structure for process instances
 */
export interface MemoryFile {
  /** Discriminator field - always "memory-file" */
  type: 'memory-file';
  
  /** Process metadata */
  metadata: {
    /** Process instance ID */
    process: string;
    /** Template used to create this process */
    template: string;
    /** Creation timestamp (ISO 8601) */
    created: ISOTimestamp;
    /** Last updated timestamp (ISO 8601) */
    lastUpdated: ISOTimestamp;
    /** Current step ID */
    currentStep: StepId;
  };
  
  /** Sub-process relationship state */
  subProcessState: {
    /** Parent process path (null if top-level process) */
    parentProcessPath: ProcessPath | null;
    /** Child sub-processes spawned from this process */
    childSubProcesses: ChildProcessRef[];
    /** Sync point definitions */
    syncPoints: StepId[];
  };
  
  /** Step-by-step information (keyed by StepId) */
  steps: Record<StepId, MemoryStepEntry>;
  
  /** Cross-references for quick lookup */
  crossReferences: {
    /** Key decisions made during process */
    keyDecisions: string[];
    /** Files modified during process */
    filesModified?: string[];
    /** Files created during process */
    filesCreated?: string[];
    /** Schema files (for schema-related processes) */
    schemaFiles?: string[];
    /** Target files (for file-processing processes) */
    targetFiles?: string[];
    /** Custom domain-specific references */
    custom?: Record<string, unknown>;
  };
  
  /** Search helpers for navigation */
  searchHelpers: {
    /** Files organized by category */
    byCategory: Record<string, string[]>;
    /** Files organized by type */
    byFileType?: Record<string, string[]>;
  };
}
