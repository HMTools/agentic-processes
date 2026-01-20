import type { ChildProcessRef } from './child-process-ref';

/**
 * State information for sub-process relationships.
 */
export interface SubProcessState {
  /** ID of the parent process, or null if this is a root process */
  parentProcess: string | null;
  
  /** List of child sub-processes spawned by this process */
  childProcesses: ChildProcessRef[];
  
  /** Next sync point where parent will wait for children (if any) */
  nextSyncPoint?: string;
}

