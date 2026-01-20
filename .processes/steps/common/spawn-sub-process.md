<!--
Step: Spawn Sub-Process
Purpose: Create a sub-process from within a parent process with proper parent-child linking and sync point configuration.
-->

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

---

## Agent Layer

### Required Components

- [mandatory-logging.md](../_components/mandatory-logging.md) - Logging guidelines

### Output (Detailed)

- Sub-process created in `.user-processes/active/process-{name}-{YYYYMMDD}/`
- Sub-process has parent reference in its memory.md
- Parent memory.md updated with child sub-process entry
- Sync point recorded in parent memory

### Guidance

**Specific Actions:**

1. **Determine Sub-Process Configuration**
   - Identify template to use
   - Gather parameters for the sub-process
   - Determine sync point (when parent should wait)

2. **Create Sub-Process**
   - Use `/process-new` with the specified template
   - Pass parent process path as context
   - Sub-process memory will have parent reference

3. **Update Parent Memory**
   - Add entry to parent's "Child Sub-Processes" table in memory.md:
     ```markdown
     | {sub-process-name} | {template} | running | Step {N} | {syncPoint} |
     ```

4. **Handle Sync Point**
   - If `syncPoint` is "immediate": Wait for sub-process to complete before continuing
   - If `syncPoint` is deferred ("step-N" or "end"): Continue parent process

**Files/Folders:**
- Read: Parent process.md, parent memory.md
- Update: Parent memory.md (add child reference)
- Create: Sub-process directory and files

**Tools:**
- `read_file` - Read parent process state
- `write` - Create sub-process files
- `search_replace` - Update parent memory

**Best Practices:**
- Use "immediate" sync for delegation (need result before continuing)
- Use deferred sync for parallel work
- Always record sync point so process-continue knows when to wait
- Sub-process naming: include parent step number for traceability

### Memory File Usage

**Memory Usage for This Step:**
- **Read from**: Parent memory.md (to add child reference)
- **Write to**: 
  - Parent memory.md: Add child to "Child Sub-Processes" table
  - Sub-process memory.md: Set parent reference

### Substeps

- [ ] **Substep 1**: Determine sub-process template and parameters
- [ ] **Substep 2**: Determine sync point (immediate, step-N, or end)
- [ ] **Substep 3**: Create sub-process using process-new with parent context
- [ ] **Substep 4**: Update parent memory with child reference
- [ ] **Substep 5**: Handle sync point
  - If immediate: Wait for sub-process completion
  - If deferred: Continue parent process

