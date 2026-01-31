/**
 * Process Types - Barrel Export
 * 
 * This file provides a single entry point for importing all process-related types.
 * 
 * @example
 * ```typescript
 * import { ProcessInstance, LogFile, StepStatus, ProcessId } from '.processes/types';
 * ```
 */

// Shared utility types
export * from './shared-types';

// Status types
export * from './process-status';

// Process reference types
export * from './child-process-ref';

// Main process types
export * from './process-instance';

// File schema types
export * from './memory-file';
export * from './log-file';

// Q&A types
export * from './qa-session';

// Definition types (for templates and steps)
export * from './step-definition';
export * from './template-definition';
