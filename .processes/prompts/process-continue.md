# Process Continue

Continue an existing process from where it was left off.

## Description

This prompt guides the continuation of an existing process by discovering active processes, restoring state from memory, and providing guidance for the next step.

## When to Use

- Resuming work on an existing process
- Continuing after a session break
- Picking up where work was left off

## Quick Reference

| Requirement | Description |
|-------------|-------------|
| Must have process | Never work outside a process |
| Must restore state | Read process.md and memory.md |
| Must log interactions | Log user interactions before file changes |

---

## Agent Layer

### Instructions

Reference the process management knowledge file for complete instructions:
`ai/knowledge/best-practices/ai-tooling/process-management.md`

### Mandatory Requirements

#### Always Use Process Templates

**CRITICAL RULE**: You MUST always work within an existing process. **NEVER** do work directly outside of a process.

- ✅ **ALWAYS**: Continue work within the process structure
- ✅ **ALWAYS**: Follow the process steps and guidance
- ❌ **NEVER**: Skip the process and do work directly
- ❌ **NEVER**: Create files outside of the process workflow
- ❌ **NEVER**: Bypass the process management system

**If no active process exists:**
- Inform the user that no active process exists
- Suggest using `/process-new` to create a process from a template first
- Never implement directly - always create a process first

#### Log User Interactions Immediately

**Mandatory Workflow:**
```
User Makes Request/Correction → 
IMMEDIATELY Log to log.md (before any file changes) → 
Make File Changes → 
Update log.md with what was changed
```

**Enforcement Checklist (MUST verify before ANY file modification):**
- [ ] **Did the user make a request/correction?** → Log it immediately
- [ ] **Am I about to modify a file?** → Check if I logged the user interaction first
- [ ] **Did I just modify a file?** → Update log.md "Files Modified" section

**Log Format:**
```markdown
### User Interactions
1. **User Request**: {exact request or summary}
   - **Reason**: {why user explained, or inferred}
   - **Agent Response**: {what changed in response}
   - **Timestamp**: {YYYY-MM-DD HH:mm:ss}
```

### Command Behavior

When `/process-continue` is invoked:

1. **Discover Active Processes** (MANDATORY)
   - Search `.user-processes/active/` for all active processes
   - **If no processes exist**:
     - Inform user no active process exists
     - Suggest using `/process-new` to create one
     - **NEVER** proceed to do work directly
   - If multiple processes exist, list them with:
     - Process name and date
     - Current step
     - Overall progress
     - Last updated timestamp
   - If only one process exists, proceed directly

2. **Read Process State**
   - Read `.user-processes/active/{process-folder}/process.md`
   - Check **Current State** section
   - Review completed steps and identify next incomplete step

3. **Read Memory File**
   - Read `.user-processes/active/{process-folder}/memory.md`
   - Summarize key information from previous steps

4. **Summarize Current State**
   - Present clear summary of:
     - Process being resumed
     - What was being worked on
     - Overall progress
     - Key information from memory
   - Highlight next step

5. **Update Current State**
   - Update **Current State** to reflect resumption
   - Set active step to next incomplete step

6. **Proceed with Guidance**
   - Provide guidance on what needs to be done
   - Reference relevant information from memory
   - All work must be done within process structure
   - Update process files as you work
   - Offer to start working immediately

### State Restoration

The AI reads both `process.md` and `memory.md` to fully restore context:
- Current step and progress
- Completed work
- Decisions made
- Files created
- Important notes

### Continuity

Ensure continuity by:
- Not repeating completed work
- Referencing previous decisions
- Using stored information from memory
- Maintaining context across sessions
- All work must follow process steps from template
- Update process state files as you progress
- Never skip process steps or workflow

### Error Handling

If issues are found:
- Missing or corrupted process files are reported
- Invalid process states are identified
- Help fix problems before continuing
