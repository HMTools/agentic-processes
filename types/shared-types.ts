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
 * Absolute path to a process directory.
 * Example: "~/.claude/agentic-processes/active/process-abc123-a1b2c3"
 */
export type ProcessPath = string;

/**
 * UUID of a step definition file. Used as the authoritative identifier
 * for cross-referencing step definitions across templates and processes.
 * Format: Standard UUID v4
 */
export type StepDefinitionId = string;

/**
 * UUID of a process template file. Used as the authoritative identifier
 * for cross-referencing templates (e.g., in subProcessTrigger.template
 * and references.relatedTemplates).
 * Format: Standard UUID v4
 */
export type TemplateId = string;

/**
 * Reference to a step definition.
 * Format: UUID of the step definition, or null for orchestrator steps.
 * All steps (including framework steps) use plain UUIDs.
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
