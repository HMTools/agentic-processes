# Step: Notify Parent Complete

## Description

Notify the parent process that this sub-process has completed. Updates the parent's memory file with completion status so the parent knows when to proceed past sync points.

## Purpose & Usage

Use this step when:
- A sub-process is completing (before or as part of the final step)
- Need to signal to parent that work is done
- Want to pass completion summary/outputs to parent

**Output**: Parent memory updated with sub-process completion status.

## Quick Reference

| Parameter | Required | Description |
|-----------|----------|-------------|
| `status` | No | Completion status: "completed" or "failed" (default: "completed") |
| `summary` | No | Brief summary of what was accomplished |

**Note**: This step is skipped if the process has no parent (is a root process).

