/**
 * Schema for step definition files (.processes/steps/[id]/*.json)
 * 
 * Defines the enriched JSON structure for agent guidance in the JSON-First
 * Agent Architecture. This type represents the SOURCE OF TRUTH for step
 * execution guidance - agents read this JSON for instructions.
 * 
 * Note: This is different from ProcessStep which tracks runtime state
 * of a step within a running process instance.
 */

import { StepRef } from "./shared-types";

export interface StepDefinition {
  /** Discriminator field - always "step" */
  type: 'step';

  /** Step identifier (e.g., "understand-context", "apply-changes") */
  name: string;

  /** Category folder name (e.g., "planning", "investigation", "common") */
  category: string;

  /** Step metadata */
  metadata: {
    /** Human-readable title */
    title: string;
    /** When and why to use this step */
    purposeAndUsage: string;
    /** Last updated date (YYYY-MM-DD) */
    lastUpdated: string;
  };

  /** What this step produces */
  output: {
    /** Description of the output */
    description: string;
    /** Files or artifacts created */
    artifacts: string[];
    /** Fields updated in memory.json */
    memoryUpdates: string[];
  };

  /** Agent execution guidance - the core of JSON-first architecture */
  guidance: {
    /** What must be true before starting this step */
    prerequisites: string[];
    /** Component files to include (e.g., "mandatory-logging.md") */
    mandatoryComponents: string[];
    /** Specific actions the agent should take */
    specificActions: string[];
    /** Files the step works with */
    files: {
      /** Files to read */
      read: string[];
      /** Files to create */
      create: string[];
      /** Files to update */
      update: string[];
    };
    /** Tools required for this step */
    tools: string[];
    /** Best practices to follow */
    bestPractices: string[];
  };

  /** Detailed substeps with full descriptions and actions */
  substeps: Array<{
    /** Substep number (1-based) */
    number: number;
    /** Substep name */
    name: string;
    /** Full description of what this substep accomplishes */
    description: string;
    /** Specific actions to take in this substep */
    actions: string[];
    /** Condition description - when provided, substep only runs if condition is met */
    conditional?: string;
  }>;

  /** Flow information for documentation */
  flow: {
    /** Textual description of the flow (mermaid diagram stays in MD) */
    description: string;
  };

  /** How this step uses the memory file */
  memoryFileUsage: {
    /** What to read from memory */
    readFrom: string;
    /** Where to write in memory */
    writeTo: string;
    /** Fields to include */
    fields: string[];
  };

  /** Dependencies and requirements */
  dependencies: {
    /** Component files required */
    requiredComponents: string[];
    /** Files that must exist */
    requiredFiles: string[];
    /** Tools needed */
    requiredTools: string[];
  };

  /** References to related resources */
  references: {
    /** Related step names */
    relatedSteps: string[];
    /** Templates that use this step */
    usedInTemplates: string[];
  };

  // ============================================
  // Optional step-specific fields
  // ============================================

  /** Operating principles (for init-process-principles step) */
  principles?: Array<{
    number: number;
    name: string;
    rule: string;
    verification: string | null;
  }>;

  /** Compliance checklist (for end-process-validation step) */
  complianceChecklist?: Array<{
    principle: number;
    name: string;
    check: string;
  }>;

  /** Step-specific parameters (for configurable steps like identify-files, spawn-sub-process) */
  parameters?: {
    required?: string[];
    optional?: string[];
    defaults?: Record<string, unknown>;
    definitions?: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      default?: string | boolean;
      example?: unknown;
    }>;
  };

  /** Search modes configuration (for identify-files step) */
  searchModes?: Array<{
    mode: string;
    default: boolean;
    description: string;
  }>;

  /** Capture types configuration (for capture-test-failure step) */
  captureTypes?: Array<{
    type: string;
    capture: string;
  }>;

  /** Change proposal format specification (for design-implementation-plan step) */
  changeProposalFormat?: {
    modification: {
      prefix: string;
      fields: string[];
    };
    newFile: {
      prefix: string;
      fields: string[];
    };
  };

  /** Whether this step requires approval when used standalone */
  approvalRequired?: boolean;
}
