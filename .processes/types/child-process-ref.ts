import { ProcessStatus } from "./process-status";
import { ProcessId, StepId, SyncPoint, ProcessPath } from "./shared-types";

/**
 * Reference to a child sub-process spawned by a parent process.
 */
export interface ChildProcessRef {
  /** Unique identifier of the child process (UUID) */
  id: ProcessId;
  
  /** Human-readable name of the child process */
  name: string;
  
  /** Current status of the child process */
  status: ProcessStatus;
  
  /** Step ID in the parent process where this child was spawned */
  spawnedAtStep: StepId;
  
  /** Step ID after which the parent should wait for this child to complete */
  syncPoint: SyncPoint;
  
  /** Absolute path to the child process folder */
  processPath: ProcessPath;
}
