# Implementation Plan: Process Completion and Directory Migration

**Process**: process-completion-migration-20260129  
**Step**: 4 - Design Implementation Plan  
**Date**: 2026-01-29

## Requested State Specification

When a process completes successfully (passes `end-process-validation`):
1. `process.json` status is updated from "running" to "completed"
2. `log.json` metadata.completed is set to the current timestamp
3. The process directory is moved from `.user-processes/active/` to `.user-processes/completed/`

## Implementation Approach

Add new substeps to the `end-process-validation` step that execute **after** the compliance check passes:
1. Update process status in process.json
2. Record completion timestamp in log.json
3. Move directory from active to completed

The changes preserve the existing compliance validation logic while adding the completion actions at the end.

## Verification Approach

After implementation:
- Complete a test process and verify it moves to `.user-processes/completed/`
- Verify process.json shows status "completed"
- Verify log.json has completion timestamp

---

## Change Proposals

### MOD-001: Update end-process-validation.json - Add Process Completion Substeps

**File**: `.processes/steps/common/end-process-validation/end-process-validation.json`  
**Type**: Modification

**Current State**:
- Step has 5 substeps ending with "Generate Compliance Report"
- No substeps for process completion actions
- `guidance.files.update` only lists `log.json (compliance report section)`

**Requested State**:
- Add 3 new substeps after compliance validation:
  - Substep 6: Update Process Status
  - Substep 7: Record Completion Timestamp
  - Substep 8: Move to Completed Directory
- Update `guidance.files.update` to include `process.json`
- Add `memoryUpdates` for completion actions

**Detailed Instructions**:

1. Add to `guidance.files.update`:
   ```json
   "update": ["log.json (compliance report section, completion timestamp)", "process.json (status to completed)"]
   ```

2. Add to `guidance.specificActions`:
   - "Update process.json status from 'running' to 'completed'"
   - "Set log.json metadata.completed to current ISO 8601 timestamp"
   - "Move process directory from .user-processes/active/ to .user-processes/completed/"

3. Add new substeps after substep 5:
   ```json
   {
     "number": 6,
     "name": "Update Process Status",
     "description": "Update process.json status to completed",
     "actions": [
       "Read process.json",
       "Update 'status' field from 'running' to 'completed'",
       "Write updated process.json"
     ]
   },
   {
     "number": 7,
     "name": "Record Completion Timestamp",
     "description": "Set completion timestamp in log.json",
     "actions": [
       "Read log.json",
       "Set metadata.completed to current ISO 8601 timestamp",
       "Write updated log.json"
     ]
   },
   {
     "number": 8,
     "name": "Move to Completed Directory",
     "description": "Move process directory from active to completed",
     "actions": [
       "Determine current process directory path",
       "Create .user-processes/completed/ if it doesn't exist",
       "Move entire process directory from .user-processes/active/{process-id}/ to .user-processes/completed/{process-id}/",
       "Output: '✓ Process moved to completed directory'"
     ]
   }
   ```

4. Update `output.memoryUpdates` to include completion-related fields

**Rationale**: The `end-process-validation` step is the final step of every process and is the correct place to handle process completion. Adding substeps preserves the existing compliance validation while adding the missing completion functionality.

---

### MOD-002: Update end-process-validation.md - Document Process Completion

**File**: `.processes/steps/common/end-process-validation/end-process-validation.md`  
**Type**: Modification

**Current State**:
- Documentation only covers compliance validation
- Flow diagram ends at "Document in Log"
- No mention of process completion or directory migration

**Requested State**:
- Add "Process Completion" section
- Update flow diagram to include completion steps
- Document the directory migration behavior

**Detailed Instructions**:

1. Add new section after "Compliance Checklist":
   ```markdown
   ## Process Completion Actions

   After compliance validation passes, the following completion actions are performed:

   | Action | Description |
   |--------|-------------|
   | Status Update | process.json status set to "completed" |
   | Timestamp | log.json metadata.completed set |
   | Directory Migration | Process moved to `.user-processes/completed/` |
   ```

2. Update the Flow diagram:
   ```mermaid
   flowchart TD
       A[Read Log] --> B[Check Principles]
       B --> C{Violations?}
       C -->|Yes| D[Report to User]
       C -->|No| E[✓ Compliant]
       D --> F[Document in Log]
       E --> F
       F --> G[Update Status to Completed]
       G --> H[Record Completion Timestamp]
       H --> I[Move to Completed Directory]
       I --> J[End]
   ```

**Rationale**: User documentation should reflect the complete behavior of the step, including the process completion actions.

---

## Summary

| Change ID | File | Type | Priority |
|-----------|------|------|----------|
| MOD-001 | end-process-validation.json | Modification | High |
| MOD-002 | end-process-validation.md | Modification | Medium |

**Total Changes**: 2 modifications, 0 new files

---

## Approval Options

Please respond with one of:
- **"approved"** - Approve all changes
- **"approved MOD-001"** - Approve specific change(s) only
- **"modify [feedback]"** - Request modifications to the plan
- **"reject"** - Reject the implementation plan
