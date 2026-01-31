/**
 * Overall status of a process instance.
 */
export type ProcessStatus = 'running' | 'completed' | 'failed' | 'paused';

/**
 * Status of an individual step within a process.
 * Unified type used across process-instance, memory-file, and log-file.
 */
export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'awaiting_approval';
