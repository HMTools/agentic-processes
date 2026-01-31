# Implementation Plan: Strongly Typed JSON Schema

**Process**: process-strongly-typed-json-schema-20260129  
**Step**: 4 - Design Implementation Plan  
**Date**: 2026-01-29

## Requested State

All JSON files in `.processes/steps/` and `.processes/templates/` conform to defined TypeScript types with:
- Complete type coverage for all fields used in JSON files
- New types for Memory and Log files
- Consistent structure across all files

## Implementation Approach

**Strategy**: Expand existing TypeScript types to match JSON file reality, rather than modifying 48+ JSON files.

**Rationale**: Add functional fields that are actively used (like `parameters`, `guidance`) while removing dead metadata fields that no code uses (`isBookendStep`, `position`, `structure`).

## Change Proposals

### Batch 1: Modify Existing Type Definitions

---

#### MOD-001: Update step-definition.ts

**File**: `.processes/types/step-definition.ts`  
**Type**: modification

**Current State**: Type defines 11 top-level fields, but JSON files use 7 additional functional fields (excluding unused metadata fields).

**Requested State**: Add optional fields to support all features used in step JSON files.

**Instructions**:
Add the following optional fields to `StepDefinition` interface:

```typescript
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

/** Step-specific parameters (for configurable steps like identify-files) */
parameters?: {
  [key: string]: {
    type: string;
    description: string;
    enum?: string[];
    default?: string | boolean;
  };
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

/** Whether this step requires approval (when used standalone) */
approvalRequired?: boolean;
```

**Rationale**: These fields are actively used in step JSON files and provide important functionality.

**Note**: `isBookendStep` and `position` fields are intentionally NOT included - they provide no functional value and will be removed from JSON files (see MOD-004).

---

#### MOD-002: Update template-definition.ts

**File**: `.processes/types/template-definition.ts`  
**Type**: modification

**Current State**: Type is missing common fields and has overly strict required fields.

**Requested State**: Add missing optional fields and adjust required/optional field requirements.

**Instructions**:

1. Add optional `guidance` field:
```typescript
/** Template-specific guidance for agent execution */
guidance?: Record<string, {
  description?: string;
  actions?: string[];
  [key: string]: unknown;
}>;
```

2. Add `memoryFileUsage` alternative (per-step):
```typescript
/** Per-step memory file usage (alternative to global memoryFileStructure) */
memoryFileUsage?: Record<string, {
  informationProduced?: string[];
  decisionsMade?: string[];
}>;
```

3. Modify `phases` array to make `description` optional:
```typescript
phases?: Array<{
  name: string;
  description?: string;  // Changed from required to optional
  steps: number[] | string;
  note?: string;
}>;
```

4. Modify `steps` array to make `description` optional and add new fields:
```typescript
steps: Array<{
  number: number;
  name: string;
  stepRef: string | null;
  description?: string;  // Changed from required to optional
  context?: Record<string, string>;
  output: string;
  approvalRequired?: boolean;
  postApprovalActions?: string[];
  qnaCheckpoint?: string;
  notes?: string;
  conditional?: string;  // NEW: Conditional execution
  subProcessTrigger?: {  // NEW: Sub-process triggering
    condition: string;
    template: string;
    forEach?: string;
    syncPoint: string;
  };
  subProcessConfig?: {   // NEW: Sub-process configuration
    template: string;
    sync: string;
    iterateOver?: string;
    parameterMapping?: Record<string, string>;
  };
  fallback?: string;     // NEW: Fallback behavior
}>;
```

5. Add `parameters.notes` and `parameters.defaults`:
```typescript
parameters: {
  required: string[];
  optional: string[];
  definitions: Record<string, {
    description: string;
    type: string;
    example: string | object;
  }>;
  notes?: string;    // NEW
  defaults?: Record<string, unknown>;  // NEW
};
```

**Rationale**: These changes make the type match the actual functional usage in template JSON files.

---

### Batch 2: Create New Type Definitions

---

#### NEW-001: Create memory-file.ts

**File**: `.processes/types/memory-file.ts`  
**Type**: new_file

**Content Specification**:
```typescript
/**
 * Schema for memory.json files in process instances (.user-processes/**/memory.json)
 * 
 * Tracks step information, decisions, and cross-references during process execution.
 */

import type { ChildProcessRef } from './child-process-ref';

export interface MemoryStepEntry {
  /** Step name */
  name: string;
  /** Step execution status */
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  /** When this step was last updated */
  timestamp?: string;
  /** Information produced during this step */
  informationProduced: Record<string, unknown>;
  /** Decisions made during this step */
  decisionsMade: string[];
  /** Files modified or created during this step */
  filesModifiedCreated: string[];
  /** Additional notes */
  notes?: string;
  /** Last updated timestamp */
  updated?: string;
}

export interface MemoryFile {
  /** Discriminator field */
  type?: 'memory-file';
  
  /** Process metadata */
  metadata: {
    /** Process instance ID */
    process: string;
    /** Template used */
    template: string;
    /** Creation timestamp (ISO 8601) */
    created: string;
    /** Last updated timestamp (ISO 8601) */
    lastUpdated: string;
    /** Current step number */
    currentStep: number;
  };
  
  /** Sub-process relationship state */
  subProcessState: {
    /** Parent process path (null if top-level) */
    parentProcess: string | null;
    /** Child sub-processes */
    childSubProcesses: ChildProcessRef[];
    /** Sync point definitions */
    syncPoints: string[];
  };
  
  /** Step-by-step information (keyed by step number as string) */
  steps: Record<string, MemoryStepEntry>;
  
  /** Cross-references for quick lookup */
  crossReferences: {
    /** Key decisions made during process */
    keyDecisions: string[];
    /** Files modified during process */
    filesModified?: string[];
    /** Files created during process */
    filesCreated?: string[];
    /** Schema files (for schema-related processes) */
    schemaFiles?: string[];
    /** Target files (for file-processing processes) */
    targetFiles?: string[];
    /** Other domain-specific references */
    [key: string]: unknown;
  };
  
  /** Search helpers for navigation */
  searchHelpers: {
    /** Files by category */
    byCategory: Record<string, string[]>;
    /** Files by type */
    byFileType?: Record<string, string[]>;
  };
}
```

**Rationale**: Memory files are critical for process state tracking but had no type definition.

---

#### NEW-002: Create log-file.ts

**File**: `.processes/types/log-file.ts`  
**Type**: new_file

**Content Specification**:
```typescript
/**
 * Schema for log.json files in process instances (.user-processes/**/log.json)
 * 
 * Captures detailed execution history, user interactions, and process-wide observations.
 */

export interface UserInteraction {
  /** What the user requested */
  request: string;
  /** Why the user made this request */
  reason: string;
  /** How the agent responded */
  agentResponse: string;
  /** When this interaction occurred (ISO 8601) */
  timestamp: string;
  /** Flag for continuous improvement step */
  forImprovementStep?: boolean;
  /** Potential improvement to consider */
  potentialImprovement?: string;
}

export interface LogStepEntry {
  /** User interactions during this step */
  userInteractions?: UserInteraction[];
  /** Timestamp when step started */
  timestamp?: string;
  /** Actions taken during this step */
  actionsTaken?: string[];
  /** Agent reasoning during this step */
  agentReasoning?: string[];
  /** Problems encountered during this step */
  problemsEncountered?: string[];
  /** Files modified during this step */
  filesModified?: string[];
  /** Decisions made during this step */
  decisionsMade?: string[];
  /** Performance notes */
  performanceNotes?: string[];
}

export interface LogFile {
  /** Discriminator field */
  type?: 'log-file';
  
  /** Process metadata */
  metadata: {
    /** Process instance ID */
    process: string;
    /** Template used */
    template: string;
    /** When process started (ISO 8601) */
    started: string;
    /** When process completed (ISO 8601, null if still running) */
    completed: string | null;
    /** Parent process path (null if top-level) */
    parentProcess: string | null;
    /** Sub-processes spawned */
    subProcesses: string[];
  };
  
  /** Execution metrics (optional) */
  executionMetrics?: {
    /** Total steps in process */
    totalSteps: number;
    /** Steps completed so far */
    stepsCompleted: number;
    /** Current step number */
    currentStep: number;
  };
  
  /** Step-by-step log entries (keyed by step number as string) */
  steps: Record<string, LogStepEntry>;
  
  /** User interactions (alternative top-level location) */
  userInteractions?: UserInteraction[];
  
  /** Process-wide observations for learning */
  processWideObservations: {
    /** Patterns detected during execution */
    patternsDetected: string[];
    /** Summary of user feedback */
    userFeedbackSummary: string[];
    /** Efficiency metrics */
    efficiencyMetrics: Record<string, unknown>;
    /** Recommendations for future processes */
    recommendationsForFuture: string[];
  };
}
```

**Rationale**: Log files are critical for process tracking and continuous improvement but had no type definition.

---

### Batch 3: Update Index/Exports (Optional)

---

#### MOD-003: Create types index file

**File**: `.processes/types/index.ts`  
**Type**: new_file

**Content Specification**:
```typescript
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
```

**Rationale**: Provides a single entry point for importing types.

---

### Batch 4: Cleanup Unused Fields

---

#### MOD-004: Remove unused fields from bookend step JSON files

**Files**: 
- `.processes/steps/common/init-process-principles/init-process-principles.json`
- `.processes/steps/common/end-process-validation/end-process-validation.json`

**Type**: modification

**Current State**: Both files contain `isBookendStep` and `position` fields that are not used by any code.

**Requested State**: Remove these unused metadata fields.

**Instructions**:
Remove from both files:
```json
"isBookendStep": true,
"position": "first",  // or "last"
```

**Rationale**: These fields provide no functional value - they're documentation-only and redundant with other indicators (`references.usedInTemplates: ["ALL process templates"]`). Removing them keeps the schema clean.

---

#### MOD-005: Remove unused `structure` field from template JSON files

**Files** (11 total):
- `.processes/templates/development/develop-user-story/develop-user-story.json`
- `.processes/templates/development/low-level-design-user-story/low-level-design-user-story.json`
- `.processes/templates/infrastructure/create-guideline/create-guideline.json`
- `.processes/templates/infrastructure/create-process-step-template/create-process-step-template.json`
- `.processes/templates/infrastructure/create-process-template/create-process-template.json`
- `.processes/templates/infrastructure/onboard/onboard.json`
- `.processes/templates/infrastructure/set-concept/set-concept.json`
- `.processes/templates/review/review-and-verify/review-and-verify.json`
- `.processes/templates/testing/integration-test-fix/integration-test-fix.json`
- `.processes/templates/memory-template.json`
- `.processes/templates/log-template.json`

**Type**: modification

**Current State**: All files contain `structure` field with `userLayer` and `agentLayer` sections that no code uses.

**Requested State**: Remove the entire `structure` field from all files.

**Rationale**: No code reads this field. It's documentation-only metadata describing what sections MD files should have, but nothing validates or generates based on it.

---

## Summary

| ID | Type | File | Description |
|----|------|------|-------------|
| MOD-001 | modify | step-definition.ts | Add 7 optional fields |
| MOD-002 | modify | template-definition.ts | Add fields, adjust required/optional |
| NEW-001 | new | memory-file.ts | Create MemoryFile type |
| NEW-002 | new | log-file.ts | Create LogFile type |
| MOD-003 | new | index.ts | Create exports index |
| MOD-004 | modify | 2 JSON files | Remove unused isBookendStep/position fields |
| MOD-005 | modify | 11 JSON files | Remove unused structure field |

## Approval Options

Please choose one:

1. **Approve all** - Apply all 7 change proposals
2. **Approve specific IDs** - e.g., "Approve MOD-001, MOD-002, NEW-001, NEW-002" (skip index)
3. **Request modifications** - Suggest changes to any proposal
4. **Reject** - Do not proceed with changes

---

⏸️ **Awaiting approval**
