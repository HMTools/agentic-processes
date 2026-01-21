# Step: Write Integration Tests

## Description

Create comprehensive integration tests that verify the complete flow of system components working together. Tests can be triggered by API endpoints, message queue subscribers, or scheduled jobs.

## Purpose & Usage

Use this step when you need to:
- Create integration tests for API endpoints (HTTP-triggered flows)
- Create integration tests for message queue subscribers (Kafka-triggered)
- Test complex workflows involving multiple services
- Verify database transactions and data persistence
- Test integration with external services (via mocks)

**Output**: Comprehensive integration test files with full scenario coverage.

## Quick Reference

| Trigger Type | Use Case |
|--------------|----------|
| HTTP request | API endpoint tests |
| Kafka message | Subscriber tests |
| Timer | Background job tests |

## Flow

```mermaid
flowchart TD
    A[Start: Integration Test Request] --> B[Study Existing Patterns]
    B --> C[Set Up Test Infrastructure]
    C --> D[Create Test Class Structure]
    D --> E[Write Setup Methods]
    E --> F[Write Test Scenarios]
    F --> G[Add External Service Mocks]
    G --> H[Verify Database State]
    H --> I[Run Tests]
    I --> J{All Pass?}
    J -->|No| K[Fix Failing Tests]
    K --> I
    J -->|Yes| L[Complete: Tests Ready]
```
