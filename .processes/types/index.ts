/**
 * Type definitions for the Agentic Process System
 * 
 * This module exports all type definitions used by:
 * - Step definition files (.processes/steps/**/*.json)
 * - Template definition files (.processes/templates/**/*.json)
 * - Process instance files (.user-processes/**/*.json)
 */

// Definition types (for .processes/ files)
export type { StepDefinition } from './step-definition';
export type { TemplateDefinition } from './template-definition';

// Instance types (for .user-processes/ files)
export type { ProcessInstance } from './process-instance';
export type { ProcessStep } from './process-step';
export type { ProcessMetadata } from './process-metadata';
export type { ProcessCurrentState } from './process-current-state';
export type { ProcessStatus } from './process-status';
export type { ProcessFiles } from './process-files';
export type { StepStatus } from './step-status';

// Memory and Log types
export type { MemoryFile, MemoryStepEntry } from './memory-file';
export type { LogFile, LogStepEntry, UserInteraction } from './log-file';

// Sub-process types
export type { SubProcessState } from './sub-process-state';
export type { ChildProcessRef } from './child-process-ref';
export type { QASession } from './qa-session';
