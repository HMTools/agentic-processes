/**
 * Schema for template definition files (~/.claude/agentic-processes/templates/processes/[id]/*.json)
 *
 * Defines the enriched JSON structure for agent guidance in the JSON-First
 * Agent Architecture. This type represents the SOURCE OF TRUTH for template
 * execution guidance - agents read this JSON for instructions.
 *
 * Note: This is different from ProcessInstance which tracks runtime state
 * of a running process created from a template.
 */

import { StepRef } from "./shared-types";

export interface TemplateDefinition {
  /** Discriminator field - always "template" */
  type: 'template';

  /** Template identifier (e.g., "develop-user-story", "set-concept") */
  name: string;

  /** Category folder name (e.g., "development", "infrastructure", "testing") */
  category: string;

  /** Template metadata */
  metadata: {
    /** Human-readable title */
    title: string;
    /** When and why to use this template */
    purposeAndUsage: string;
    /** Last updated date (YYYY-MM-DD) */
    lastUpdated: string;
  };

  /** Template parameters */
  parameters: {
    /** Required parameter names */
    required: string[];
    /** Optional parameter names */
    optional: string[];
    /** Parameter definitions with descriptions, types, and examples */
    definitions: Record<string, {
      /** What this parameter is for */
      description: string;
      /** Parameter type (string, number, etc.) */
      type: string;
      /** Example value (always as string for display) */
      example: string;
    }>;
    /** Additional notes about parameters */
    notes?: string;
    /** Default values for parameters */
    defaults?: Record<string, unknown>;
  };

  /** Complete step definitions with full agent guidance */
  steps: Array<{
    /** Step number (0-based, where 0 is typically init-process-principles) */
    number: number;
    /** Step name */
    name: string;
    /** Reference to step definition - required */
    stepRef: StepRef;
    /** Full description of what this step does in this template's context */
    description?: string;
    /** Context variables passed to the step */
    context?: Record<string, string>;
    /** Expected output from this step */
    output: string;
    /** Whether user must approve before proceeding */
    approvalRequired?: boolean;
    /** Actions to take after approval */
    postApprovalActions?: string[];
    /** Q&A checkpoint details */
    qnaCheckpoint?: string;
    /** Additional notes */
    notes?: string;
    /** Conditional execution description */
    conditional?: string;
    /** Sub-process triggering configuration */
    subProcessTrigger?: {
      condition: string;
      template: string;
      forEach?: string;
      syncPoint: string;
    };
    /** Sub-process configuration */
    subProcessConfig?: {
      template: string;
      sync: string;
      iterateOver?: string;
      parameterMapping?: Record<string, string>;
    };
    /** Fallback behavior */
    fallback?: string;
  }>;

  /** Dynamic step generation rules (if applicable) */
  dynamicSteps?: {
    /** Description of how dynamic steps are generated */
    description: string;
    /** What the steps are derived from */
    derivedFrom: string;
    /** Step references for dynamic steps, keyed by step type */
    stepRefs?: Record<string, StepRef>;
  };

  /** Memory file structure for this template */
  memoryFileStructure?: {
    /** Section names in memory */
    sections: string[];
    /** Key fields to track */
    keyFields: string[];
  };

  /** References to related resources */
  references: {
    /** Step references used by this template */
    steps: StepRef[];
    /** Related template names */
    relatedTemplates: string[];
    /** Dependencies */
    dependencies: string[];
  };

  /** Template-specific guidance for agent execution (per-step context) */
  guidance?: Record<string, {
    description?: string;
    actions?: string[];
    [key: string]: unknown;
  }>;

  /** Per-step memory file usage (alternative to memoryFileStructure) */
  memoryFileUsage?: Record<string, {
    informationProduced?: string[];
    decisionsMade?: string[];
  }>;
}
