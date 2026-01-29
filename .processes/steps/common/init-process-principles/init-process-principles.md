# Step: Init Process Principles

## Description

Load and confirm understanding of the agent operating principles before beginning any process work. This is a mandatory first step for all processes.

## The 5 Core Principles

### 1. LOG FIRST, ACT SECOND
Log every user interaction to `log.json` BEFORE responding or making changes.
- **Verification**: Output "✓ Logged to log.json" before file changes

### 2. READ JSON FOR GUIDANCE
Step instructions live in `.json` files, not `.md` files.

### 3. STOP AT CHECKPOINTS
When `approvalRequired: true`, present deliverables, ask for approval, WAIT.
- **Verification**: Output "⏸️ Awaiting approval" and stop

### 4. NO EXTERNAL TODOS
Process steps ARE your task list. Do NOT use `todo_write` during processes.

### 5. VERIFY MANDATORY ACTIONS
For MANDATORY/CRITICAL instructions: do action, then output confirmation.
- **Verification**: Output "✓ [Action] completed"

## Quick Reference

| Aspect | Value |
|--------|-------|
| Position | First step (Step 0) |
| Mandatory | Yes - cannot be skipped |
| Output | "✓ Operating principles loaded and understood" |

## Flow

```mermaid
flowchart LR
    A[Start Process] --> B[Read Principles]
    B --> C[Confirm Understanding]
    C --> D[Update Memory]
    D --> E[Proceed to Step 1]
```
