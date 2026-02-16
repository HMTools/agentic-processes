# Process: Create multi-repo-codebase-investigation Template

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

**templateName**: multi-repo-codebase-investigation

**templatePurpose**: Systematic investigation of multiple repositories to answer research questions. Allows users to investigate patterns, implementations, and gather information across multiple codebases in a structured way.

**useCases**: When investigating how features are implemented across microservices, comparing patterns in different codebases, gathering metrics from multiple projects, understanding architectural decisions across repos, analyzing security practices across repositories.

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

- [ ] Step 0: Init Process Principles
  - **Step**: `@framework-step:common/init-process-principles`
  - **Description**: Load and confirm operating principles
  - **Output**: Principles loaded and confirmed

- [ ] Step 1: Plan and design template
  - **Step**: `@framework-step:template/plan-and-design-template`
  - **Description**: Design the template structure, steps, and parameters
  - **Output**: Requirements document, design artifacts, mermaid diagram
  - **Approval Required**: Yes

- [ ] Step 2: Create template file
  - **Step**: `@framework-step:template/create-template-file`
  - **Description**: Create the complete template JSON and MD files
  - **Output**: Complete template file with validation reports

- [ ] Step 3: Validate process-steps exist
  - **Step**: `@framework-step:template/validate-process-steps-exist`
  - **Description**: Check if all referenced steps exist, spawn sub-processes for missing steps
  - **Output**: Validation report

- [ ] Step 4: Continuous Improvement
  - **Step**: `@framework-step:learning/continuous-improvement`
  - **Description**: Review and improve the template based on feedback
  - **Output**: Improvements implemented
  - **Approval Required**: Yes

- [ ] Step 5: End Process Validation
  - **Step**: `@framework-step:common/end-process-validation`
  - **Description**: Final compliance check
  - **Output**: Compliance report
