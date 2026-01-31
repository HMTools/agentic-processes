/**
 * Schema for memory.json files in process instances (.user-processes/**/memory.json)
 * 
 * Tracks step information, decisions, and cross-references during process execution.
 */

import type { ChildProcessRef } from './child-process-ref';

/**
 * Entry for a single step in the memory file
 */
export interface MemoryStepEntry {
  /** Step name */
  name: string;
  /** Step execution status */
  status?: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'awaiting_approval';
  /** When this step was last updated (ISO 8601) */
  timestamp?: string;
  /** Information produced during this step */
  informationProduced: Record<string, unknown>;
  /** Decisions made during this step */
  decisionsMade: string[];
  /** Files modified or created during this step */
  filesModifiedCreated: string[];
  /** Additional notes */
  notes?: string;
  /** Last updated timestamp (ISO 8601) */
  updated?: string;
}

/**
 * Complete memory file structure for process instances
 */
export interface MemoryFile {
  /** Discriminator field (optional for backwards compatibility) */
  type?: 'memory-file';
  
  /** Process metadata */
  metadata: {
    /** Process instance ID */
    process: string;
    /** Template used to create this process */
    template: string;
    /** Creation timestamp (ISO 8601) */
    created: string;
    /** Last updated timestamp (ISO 8601) */
    lastUpdated: string;
    /** Current step number */
    currentStep: number;
  };
  
  /** Sub-process relationship state */
  subProcessState: {
    /** Parent process path (null if top-level process) */
    parentProcess: string | null;
    /** Child sub-processes spawned from this process */
    childSubProcesses: ChildProcessRef[];
    /** Sync point definitions */
    syncPoints: string[];
  };
  
  /** Step-by-step information (keyed by step number as string, e.g., "0", "1", "step0", "step1") */
  steps: Record<string, MemoryStepEntry>;
  
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
    /** Other domain-specific references */
    [key: string]: unknown;
  };
  
  /** Search helpers for navigation */
  searchHelpers: {
    /** Files organized by category */
    byCategory: Record<string, string[]>;
    /** Files organized by type */
    byFileType?: Record<string, string[]>;
  };
}
