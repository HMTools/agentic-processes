# Process Management Guidelines

This document provides essential guidelines for working with the Agentic Process System. All AI agents working within processes must follow these guidelines.

## Table of Contents

1. [Mandatory Logging Workflow](#mandatory-logging-workflow)
2. [Process State Management](#process-state-management)
3. [Approval Checkpoints](#approval-checkpoints)
4. [File Modification Guidelines](#file-modification-guidelines)
5. [User Interaction Handling](#user-interaction-handling)
6. [Sub-Processes](#sub-processes)
7. [Design Principles](#design-principles)

---

## Mandatory Logging Workflow

### ⚠️ CRITICAL RULE: Log User Interactions Immediately

**When working within an active process, you MUST follow this workflow:**

```
User Makes Request/Correction → 
IMMEDIATELY Log to log.json (before any file changes) → 
Make File Changes → 
Update log.json with what was changed
```

### Enforcement Checklist

Before making ANY file changes in response to user input, verify:

- [ ] **Did the user make a request/correction?** → Log it immediately
- [ ] **Am I about to modify a file?** → Check if I logged the user interaction first
- [ ] **Did I just modify a file?** → Update log.json with the change details

**If user interaction not logged → STOP and log it first**

### Log Format for User Interactions

Every user interaction must be logged in the current step's "User Interactions" section:

```markdown
### User Interactions
1. **User Request**: {exact user request or summary}
   - **Reason**: {why user explained, or inferred reason}
   - **Agent Response**: {what I changed in response}
   - **Timestamp**: {current timestamp in YYYY-MM-DD HH:mm:ss format}
```

### When to Log

**ALWAYS log immediately when:**
- User requests a change or correction
- User provides feedback or clarification
- User asks a question that affects the work
- User approves or rejects something
- User provides additional context or requirements

**DO NOT wait until:**
- End of step
- End of process
- After making changes
- After completing work

**Logging must happen BEFORE taking action.**

### Example Log Entry

```markdown
### User Interactions
1. **User Request**: "the `review-and-verify` template should be generic for investigations, the examples are just use cases"
   - **Reason**: Template description was too specific, making it seem like it only handles those two use cases when it should be generic
   - **Agent Response**: Updated Description and Parameters sections in process.md to clarify template is generic for investigations/reviews/verifications, with examples listed as example use cases
   - **Timestamp**: 2026-01-03 17:35:30
```

---

## Process State Management

### Current State Updates

The `process.md` file's "Current State" section must be updated:
- **When a step begins**: Update "Active Step" and "Current Action"
- **When work progresses**: Update "Current Action" and "Details"
- **When a step completes**: Mark step as complete `[x]` and update state

### Memory File Updates

The `memory.json` file must be updated:
- **At the start of each step**: Initialize step section
- **As work progresses**: Document information produced, decisions made, files modified
- **When step completes**: Finalize step section with all outputs

### Log File Updates

The `log.json` file must be updated:
- **At step start**: Log timestamp and planned actions
- **During step**: Log each user interaction immediately (see [Mandatory Logging Workflow](#mandatory-logging-workflow))
- **As work progresses**: Log actions taken, agent reasoning, problems encountered
- **At step end**: Log completion time, summary, and observations

---

## Approval Checkpoints

### Checking for Required Approvals

Before completing ANY step, check if approval is required:

1. **Check process.json** - Look for `"approvalRequired": true` on the current step
2. **Check process.md** - Look for "Approval Required: Yes" in step description
3. **If approval required**:
   - Present deliverables to user
   - Explicitly ask: "Do you approve? (approve/modify/reject)"
   - **WAIT** - Do NOT proceed until user responds
   - Log user response in log.json
   - Only proceed if user approves

### Workflow Checklist (Before Completing Step)

- [ ] Check if step has `approvalRequired: true`
- [ ] If yes: Stop and request approval
- [ ] Wait for explicit user approval
- [ ] Log approval in log.json
- [ ] Then proceed to next step

---

## File Modification Guidelines

### Before Modifying Any File

1. **Check if you're in an active process**
   - If yes: Follow process workflow
   - If no: Inform user they need to create a process first

2. **Log user interaction** (if applicable)
   - See [Mandatory Logging Workflow](#mandatory-logging-workflow)

3. **Update process state** (if in active process)
   - Update `process.md` Current State section
   - Update `memory.json` with planned changes
   - Log action in `log.json`

### After Modifying Any File

1. **Update log.json**
   - Add file to "Files Modified" section
   - Document what changed
   - Increment iteration count if file was modified multiple times

2. **Update memory.json**
   - Add file to "Files Modified/Created" section
   - Document what was produced

3. **Update process.md** (if step completed)
   - Mark step as complete
   - Update Current State

---

## User Interaction Handling

### Types of User Interactions

1. **Corrections**: User points out something wrong
   - **Action**: Log immediately → Fix → Log what was fixed

2. **Clarifications**: User provides additional context
   - **Action**: Log immediately → Update understanding → Continue work

3. **Approvals**: User approves a design or change
   - **Action**: Log immediately → Proceed with approved work

4. **Rejections**: User rejects a design or change
   - **Action**: Log immediately → Revise based on feedback → Log revision

5. **Questions**: User asks a question
   - **Action**: Log immediately → Answer → Continue work

### Handling User Corrections

When a user corrects something:

1. **STOP** what you're doing
2. **Log the correction** in `log.json` under current step's "User Interactions"
3. **Understand the correction** - what needs to change and why
4. **Make the change**
5. **Update log.json** with what was changed
6. **Update memory.json** with the file modification
7. **Continue** with the corrected approach

### Never Skip Logging

**Common mistakes to avoid:**
- ❌ Making changes first, then logging later
- ❌ Logging at end of step instead of immediately
- ❌ Forgetting to log user interactions
- ❌ Logging only major changes, not all user requests

**Remember**: Every user interaction is valuable for the Continuous Improvement step to learn and improve processes.

---

## Sub-Processes

Sub-processes allow a parent process to spawn child processes for delegation or parallel work.

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Sub-process** | A regular process with a parent reference |
| **Sync Point** | Where parent checks if sub-processes are complete |
| **Push Model** | Child notifies parent when done (updates parent's memory) |

### When to Use Sub-Processes

| Scenario | Example |
|----------|---------|
| **Delegation** | Missing template steps → spawn `create-process-step-template` for each |
| **Parallel work** | After LLD → spawn test plan and code dev processes |

### Sync Point Placement

Place sync points where parent needs sub-process results:
- **Immediate**: Right after spawn (delegation pattern - parent waits)
- **Deferred**: Later in parent flow (parallel pattern - parent continues)
- **At end**: Before parent completes

### How It Works

```
1. DECLARE: Template step includes subProcessTrigger or subProcessConfig metadata
   ├── Declares which sub-process template to spawn
   ├── Declares parameters to pass
   └── Declares sync point (immediate, deferred, end)

2. SPAWN: The step-executor reads the metadata and invokes process-spawner
   ├── Creates sub-process with parent reference
   └── Records child in parent's subProcessState

3. COMPLETE: When sub-process finishes, process_manager.py auto-notifies parent
   ├── update-process-status --status completed --summary "..."
   ├── Automatically updates child status in parent's process.json
   └── Adds completion summary to parent's memory.json

4. SYNC: At sync points, process-continue checks parent's subProcessState
   ├── If children complete: proceed
   └── If children pending: wait or offer to continue sub-process
```

### Declaring Sub-Processes in Templates

Template steps declare sub-process spawning via metadata:

**`subProcessTrigger`** (single sub-process):
- `template`: Template for sub-process
- `parameters`: Parameters to pass
- `syncPoint`: When to wait ("immediate", "step-N", "end")

**`subProcessConfig`** (batch/iterative sub-processes):
- `template`: Template for each sub-process
- `sync`: When to wait
- `iterateOver`: Data source for iteration
- `parameterMapping`: How to map iteration data to parameters

### Parent Notification (Automatic)

Parent notification is handled automatically by `process_manager.py`. When a sub-process completes:
- `update-process-status --status completed --summary "..."` is called
- The script detects the parent reference in `subProcessState.parentProcess`
- It updates the child's status in the parent's `process.json`
- It adds the completion summary to the parent's `memory.json`
- No explicit notification step is needed in templates

The `--summary` argument is **required** for sub-processes. If omitted, the script returns a descriptive error explaining what to provide.

### Example: Delegation Pattern

```markdown
- [ ] Step 3: Validate process-steps exist
  - **Sub-Process Trigger**: If missing steps found
    - For each missing step, spawn `create-process-step-template`
    - **Sync Point**: Immediate (wait for all to complete)
    - Continue with newly created steps
```

### Memory Structure for Sub-Processes

Parent memory includes Sub-Process State section:

```markdown
## Sub-Process State

### Parent Process
- **Parent**: None - this is a root process

### Child Sub-Processes
| Name | Template | Status | Spawned At | Sync Point |
|------|----------|--------|------------|------------|
| process-create-step-xyz-20260120 | create-process-step-template | completed | Step 3 | immediate |

### Sync Points
- **Next Sync Point**: None
- **Pending Sub-Processes**: []
```

---

---

## Design Principles

When designing new concepts, patterns, or processes, follow these principles:

### Start Simple

**Avoid over-engineering.** Start with the simplest solution that could work, then add complexity only when justified.

| Approach | Example |
|----------|---------|
| ✅ **Simple** | Sub-processes are regular processes with parent-child references |
| ❌ **Over-engineered** | Sub-processes have special directories, monitoring, and execution modes |

**Signs of over-engineering:**
- Creating new categories when existing ones suffice
- Adding special handling for cases that don't need it
- Separating concepts that are actually the same (e.g., "sync" and "async" when sync is just async with immediate wait)

### Leverage Existing Patterns

Before creating something new, check if existing infrastructure can be extended:
- Can JSON files store this metadata?
- Can existing templates be modified?
- Does a similar pattern already exist?

### The Entity That Knows Should Report

For notifications and status updates, prefer push over pull:
- The entity that knows something happened should report it
- Don't poll when you can notify
- Example: Child process notifies parent when done (instead of parent polling child)

---

## Why This Matters

### For Continuous Improvement

The Continuous Improvement step analyzes `log.json` to:
- Identify patterns in user corrections
- Find opportunities to automate repetitive fixes
- Improve templates and steps based on actual usage
- Reduce future user interventions

**If user interactions aren't logged, the system can't learn and improve.**

### For Process Tracking

Accurate logging enables:
- Understanding what happened during process execution
- Debugging issues that occurred
- Replicating successful patterns
- Identifying bottlenecks and inefficiencies

---

## Quick Reference

### Workflow Checklist

When user makes a request:

```
[ ] 1. Log user interaction in log.json (User Interactions section)
[ ] 2. Update process.md Current State (if needed)
[ ] 3. Make necessary file changes
[ ] 4. Update log.json (Files Modified section)
[ ] 5. Update memory.json (Files Modified/Created section)
[ ] 6. Continue with work
```

### Log File Structure

```json
{
  "steps": {
    "step1": {
      "name": "Step Name",
      "timestamp": {
        "started": "2026-01-22T10:00:00Z",
        "completed": "2026-01-22T10:30:00Z"
      },
      "actionsTaken": [
        "Action description",
        "Another action"
      ],
      "agentReasoning": [
        "Why decisions were made",
        "Context considered"
      ],
      "userInteractions": [
        {
          "userRequest": "What the user asked",
          "reason": "Why the change was needed",
          "agentResponse": "What was changed in response",
          "timestamp": "2026-01-22T10:15:00Z"
        }
      ],
      "filesModified": [
        {
          "path": "path/to/file.md",
          "changes": "Description",
          "iterations": 1
        }
      ]
    }
  }
}
```

---

## Enforcement

These guidelines are **MANDATORY** for all AI agents working within processes. Failure to follow the logging workflow prevents the system from learning and improving.

**If you find yourself about to modify a file without logging a user interaction first, STOP and log it immediately.**

---

**Last Updated**: 2026-01-20
**Version**: 1.1

