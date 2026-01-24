import type { ChildProcessRef } from './child-process-ref';

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

