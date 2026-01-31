/**
 * Shared utility types used across all process type definitions.
 * 
 * These types provide semantic meaning to primitive types and ensure
 * consistency across the codebase.
 */

/**
 * UUID identifier for a process instance.
 * Format: Standard UUID v4 (e.g., "550e8400-e29b-41d4-a716-446655440000")
 */
export type ProcessId = string;

/**
 * UUID identifier for a step within a process.
 * Format: Standard UUID v4
 */
export type StepId = string;

/**
 * ISO 8601 timestamp string.
 * Format: "2026-01-31T14:30:00.000Z"
 */
export type ISOTimestamp = string;

/**
 * Relative path to a process directory from the project root.
 * Example: ".user-processes/active/process-abc123"
 */
export type ProcessPath = string;

/**
 * Reference to a step definition.
 * Format: "@framework-step:category/step-name" or "@user-step:category/step-name"
 * Example: "@framework-step:planning/understand-context"
 */
export type StepRef = string;

/**
 * Sync point for child process coordination.
 * References a StepId - the parent will wait for the child after this step completes.
 */
export type SyncPoint = StepId;

/**
 * Unique identifier for a Q&A question.
 * Format: "Q1", "Q2", or any unique string within the session.
 */
export type QuestionId = string;
