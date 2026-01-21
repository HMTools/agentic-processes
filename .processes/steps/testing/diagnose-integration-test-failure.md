# Step: Diagnose Integration Test Failure

## Description

Systematically analyze captured test failure information to determine root cause. Distinguish between test logic issues, application code bugs, or infrastructure problems.

## Purpose & Usage

Use this step when you need to:
- Analyze captured test failure information
- Determine root cause category (test, code, or infrastructure)
- Make informed decision about what needs fixing

**Output**: Root cause identified and categorized with documented rationale.

## Quick Reference

| Category | Description | Fix Target |
|----------|-------------|------------|
| Test Issue | Wrong assertions, bad test data | Test code |
| Code Issue | Bug in application code | Application code |
| Infrastructure | Setup, Docker, mocks broken | Infrastructure/setup |

## Flow

```mermaid
flowchart TD
    A[Start: Diagnose Failure] --> B[Review Captured Failure Info]
    B --> C[Validate Test Expectations]
    C --> D[Check Test Data/Setup]
    D --> E[Review Recent Code Changes]
    E --> F[Check Infrastructure]
    F --> G{Root Cause?}
    G -->|Test Issue| H[Document: Test Fix Needed]
    G -->|Code Issue| I[Document: Code Fix Needed]
    G -->|Infrastructure| J[Document: Infrastructure Fix Needed]
    H --> K[Store Decision in Memory]
    I --> K
    J --> K
    K --> L[Complete: Root Cause Identified]
```
