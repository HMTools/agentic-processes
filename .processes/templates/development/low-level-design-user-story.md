# Process: Create Low-Level Design for {{userStoryId}}

**Template**: low-level-design-user-story  
**Status**: Not Started

## Description

Create a standalone low-level design (LLD) document for a user story that serves as the foundational technical specification for subsequent SDLC phases including code development, test planning, and documentation.

## Purpose & Usage

Use this template when you need to:
- Create detailed technical design before implementation begins
- Provide design specifications for multiple teams (dev, QA, docs)
- Get design approval before coding starts
- Create a technical handoff artifact for the SDLC

**Not suitable for**: Simple bug fixes, implementation already in progress, high-level estimates only, proof-of-concept work.

## Quick Reference

| Parameter | Required | Description |
|-----------|----------|-------------|
| `userStoryId` | Yes | ID/reference of the user story (e.g., "US-1234", "PROJ-567") |

## Process Flow

```mermaid
flowchart TD
    A[Start: userStoryId] --> B[Step 1: Get User Story Parameters]
    B --> C[Step 2: Understand Context]
    C --> D{Context Approved?}
    D -->|No| E[Revise Context]
    E --> C
    D -->|Yes| F[Step 3: Gather Relevant Information]
    F --> G[Step 4: Analyze Current System]
    G --> G1{Need More Info?}
    G1 -->|Yes| F
    G1 -->|No| H[Step 5: Create LLD]
    H --> H1{Need More Info?}
    H1 -->|Yes| F
    H1 -->|No| I{LLD Approved?}
    I -->|No| J[Revise LLD]
    J --> H
    I -->|Yes| K[Step 6: Continuous Improvement]
    K --> L[End: LLD Complete]
```

## Steps Summary

| Step | Name | Guideline | Approval Required |
|------|------|-----------|-------------------|
| 1 | Get User Story Parameters | Yes | No |
| 2 | Understand User Story Context | No | Yes |
| 3 | Gather Relevant Information | Yes | No |
| 4 | Analyze Current System | No | No |
| 5 | Create Low-Level Design Document | Yes | Yes |
| 6 | Continuous Improvement | No | Yes |

