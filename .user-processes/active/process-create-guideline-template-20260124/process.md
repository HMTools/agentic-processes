# Process: Create create-guideline Template

**Template**: create-process-template  
**Status**: Running

## Description

Create a new process template for the Agentic Process System. This template guides you through designing, creating, validating, and documenting a new template that can be used to instantiate processes.

## Purpose & Usage

Use this template when you need to:
- Create a new reusable process template for the framework
- Define a systematic workflow for a specific type of task
- Establish a standardized approach that others can follow

**Not suitable for**: Creating process steps (use `create-process-step-template`), modifying existing templates, or one-time processes.

## Parameters

| Parameter | Value |
|-----------|-------|
| `templateName` | create-guideline |
| `templatePurpose` | Create missing guideline documents for process framework steps |
| `useCases` | When a process step or template references a guideline that doesn't exist, or when establishing new best practices/conventions for the framework |

## Process Flow

```mermaid
flowchart TD
    A[Start: Template Requirements] --> B[Step 1: Plan and Design Template]
    B --> C{Design Approved?}
    C -->|No| D[Revise Design]
    D --> B
    C -->|Yes| E[Step 2: Create Template File]
    E --> F{Validation Passed?}
    F -->|No| G[Fix Issues]
    G --> E
    F -->|Yes| H[Step 3: Validate Process-Steps Exist]
    H --> I{All Steps Exist?}
    I -->|No| J[Spawn Sub-Process: create-process-step-template]
    J --> H
    I -->|Yes| K[Step 4: Continuous Improvement]
    K --> L[End: Template Complete]
```

## Steps

- [ ] **Step 1: Plan and design template** ⏳
  - **Step**: `@framework-step:template/plan-and-design-template`
  - **Description**: Gather requirements, design template structure, create flow diagram
  - **Output**: Requirements document, design artifacts, mermaid diagram
  - **Approval Required**: Yes

- [ ] **Step 2: Create template file**
  - **Step**: `@framework-step:template/create-template-file`
  - **Description**: Create the actual template files (.md and .json)
  - **Output**: Complete template file with validation reports

- [ ] **Step 3: Validate process-steps exist**
  - **Step**: `@framework-step:template/validate-process-steps-exist`
  - **Description**: Verify all referenced steps exist, spawn sub-processes for missing ones
  - **Output**: Validation report
  - **Sub-Process Trigger**: If missing steps found, spawn `create-process-step-template` for each

- [ ] **Step 4: Continuous Improvement**
  - **Step**: `@framework-step:learning/continuous-improvement`
  - **Description**: Review process, identify improvements, update templates
  - **Output**: Improvements implemented

