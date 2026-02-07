# Process: Set Dynamic Interaction Options Concept

**Template**: set-concept  
**Status**: Running

## Description

Refine the interactionOptions concept so that options are NOT predefined in template definitions. Instead, agents dynamically generate relevant interactionOptions at runtime whenever they need user input, setting them on the step entry in process.json for the UI to render.

## Purpose & Usage

This process changes the interactionOptions pattern from a static/predefined approach (options hardcoded in template definitions) to a fully dynamic approach where agents generate context-appropriate options at the moment they need user input.

## Parameters

| Parameter | Value |
|-----------|-------|
| `conceptName` | Dynamic Interaction Options |
| `conceptDescription` | interactionOptions must NOT be predefined in template definitions. Agents dynamically generate options at runtime. |
| `targetFiles` | template-definition.ts, process-instance.ts, mandatory-approval-checkpoint.md, process-new.md, process-continue.md, create-step-file.json, update-process-template.json |
| `existingState` | interactionOptions defined both in template-definition.ts (predefined) and process-instance.ts (runtime) |
| `requestedState` | interactionOptions only as runtime concept on ProcessStep; agents generate dynamically |

## Steps

- [x] Step 0: Init Process Principles
  - **Step**: `@framework-step:common/init-process-principles`
  - **Output**: Principles loaded and confirmed

- [ ] Step 1: Understand concept
  - **Step**: `@framework-step:planning/understand-context`
  - **Output**: Context documentation
  - **Approval Required**: Yes

- [ ] Step 2: Identify target files
  - **Step**: `@framework-step:investigation/identify-files`
  - **Output**: List of target files

- [ ] Step 3: Analyze existing state
  - **Step**: `@framework-step:investigation/review-verify-document`
  - **Output**: Findings report

- [ ] Step 4: Design implementation plan
  - **Step**: `@framework-step:planning/design-implementation-plan`
  - **Output**: Implementation plan with change proposals
  - **Approval Required**: Yes

- [ ] Step 5: Apply changes
  - **Step**: `@framework-step:common/apply-changes`
  - **Output**: Modified files

- [ ] Step 6: Verify implementation
  - **Step**: `@framework-step:investigation/review-verify-document`
  - **Output**: Verification report

- [ ] Step 7: Continuous Improvement
  - **Step**: `@framework-step:learning/continuous-improvement`
  - **Output**: Improvements implemented

- [ ] Step 8: End Process Validation
  - **Step**: `@framework-step:common/end-process-validation`
  - **Output**: Compliance report
