import type { ProcessStatus } from './process-status';

/**
 * Reference to a child sub-process spawned by this process.
 */
export interface ChildProcessRef {
  /** Unique identifier of the child process */
  id: string;
  
  /** Human-readable name of the child process */
  name: string;
  
  /** Template used to create the child process */
  template: string;
  
  /** Current status of the child process */
  status: ProcessStatus;
  
  /** Step number in the parent process where this child was spawned */
  spawnedAtStep: number;
  
  /** When the parent should wait for this child ("immediate", "step-N", or "end") */
  syncPoint: 'immediate' | string;
  
  /** Path to the child process folder (relative to project root) */
  processPath: string;
}

