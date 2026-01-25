# Step: Spawn Sub-Process

## Description

Create a sub-process from within a parent process. Sets up parent-child references and defines when the parent should wait for completion (sync point).

## Purpose & Usage

Use this step when:
- A process step needs to delegate work to another process template
- You want to run work in parallel with the current process
- The current step identifies work that requires a specialized process

**Output**: Sub-process created with parent reference, parent memory updated with child reference.

## Quick Reference

| Parameter | Required | Description |
|-----------|----------|-------------|
| `template` | Yes | Template to use for the sub-process |
| `parameters` | Yes | Parameters to pass to the sub-process |
| `syncPoint` | No | When parent waits: "immediate", "step-N", or "end" (default: "immediate") |

| Sync Point | Behavior |
|------------|----------|
| immediate | Wait for sub-process to complete before continuing |
| step-N | Continue, wait at step N for completion |
| end | Continue, wait at process end for completion |

