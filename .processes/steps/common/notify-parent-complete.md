<!--
Step: Notify Parent Complete
Purpose: Notify the parent process that this sub-process has completed by updating parent's memory with completion status.
-->

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

---

## Agent Layer

### Required Components

- [mandatory-logging.md](../_components/mandatory-logging.md) - Logging guidelines

### Output (Detailed)

- Parent memory.md updated with sub-process completion:
  - Status changed from "running" to "completed" or "failed"
  - Completion summary recorded
- Parent can now detect completion at sync points

### Guidance

**Specific Actions:**

1. **Check if Sub-Process**
   - Read own memory.md "Sub-Process State" section
   - Check "Parent Process" field
   - If "None" or not a sub-process: Skip this step (nothing to notify)

2. **Read Parent Memory**
   - Locate parent process directory from parent reference
   - Read parent's memory.md

3. **Update Parent's Child Sub-Processes Table**
   - Find this sub-process entry in parent's table
   - Update status from "running" to "completed" (or "failed")
   - Add completion summary if provided

4. **Write Parent Memory**
   - Save updated parent memory.md
   - Parent will see completion when it continues (process-continue)

**Files/Folders:**
- Read: Own memory.md (get parent reference)
- Read: Parent memory.md
- Update: Parent memory.md (update child status)

**Tools:**
- `read_file` - Read memory files
- `search_replace` - Update parent memory

**Best Practices:**
- Always check if this is a sub-process first
- Include meaningful summary for parent to use
- Update status accurately (completed vs failed)
- This is a "push" notification - parent doesn't need to poll

### Memory File Usage

**Memory Usage for This Step:**
- **Read from**: 
  - Own memory.md: Get parent process reference
  - Parent memory.md: Find child entry to update
- **Write to**: 
  - Parent memory.md: Update Child Sub-Processes table with completion status

### Substeps

- [ ] **Substep 1**: Check if this is a sub-process (has parent reference)
  - If no parent: Skip remaining substeps
- [ ] **Substep 2**: Read parent process memory
- [ ] **Substep 3**: Find this sub-process in parent's Child Sub-Processes table
- [ ] **Substep 4**: Update status to "completed" or "failed"
- [ ] **Substep 5**: Add completion summary
- [ ] **Substep 6**: Write updated parent memory

