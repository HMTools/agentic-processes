# Process Continue

Continue an existing process from where it was left off.

## Instructions

Reference the process management knowledge file for complete instructions:
`ai/knowledge/best-practices/ai-tooling/process-management.md`

## ⚠️ MANDATORY REQUIREMENT: Always Use Process Templates

**CRITICAL RULE**: You MUST always work within an existing process. **NEVER** do work directly outside of a process.

**What this means:**
- ✅ **ALWAYS**: Continue work within the process structure
- ✅ **ALWAYS**: Follow the process steps and guidance
- ❌ **NEVER**: Skip the process and do work directly
- ❌ **NEVER**: Create files outside of the process workflow
- ❌ **NEVER**: Bypass the process management system

**If no active process exists:**
- You MUST inform the user that no active process exists
- You MUST suggest using `/process-new` to create a process from a template first
- Never implement directly - always create a process first

**Enforcement:**
- Before any work, verify you're working within a process
- Always update process state as you work
- Never skip process steps or workflow
- All work must be tracked in the process files

## ⚠️ MANDATORY REQUIREMENT: Log User Interactions Immediately

**CRITICAL RULE**: When working within an active process, you MUST log every user interaction BEFORE making any file changes.

**Mandatory Workflow:**
```
User Makes Request/Correction → 
IMMEDIATELY Log to log.md (before any file changes) → 
Make File Changes → 
Update log.md with what was changed
```

**Enforcement Checklist (MUST verify before ANY file modification):**
- [ ] **Did the user make a request/correction?** → Log it immediately in current step's "User Interactions" section
- [ ] **Am I about to modify a file?** → Check if I logged the user interaction first
- [ ] **Did I just modify a file?** → Update log.md "Files Modified" section with change details

**If user interaction not logged → STOP and log it first**

**Log Format (required for every user interaction):**
```markdown
### User Interactions
1. **User Request**: {exact user request or summary}
   - **Reason**: {why user explained, or inferred reason}
   - **Agent Response**: {what I changed in response}
   - **Timestamp**: {current timestamp in YYYY-MM-DD HH:mm:ss format}
```

**Reference**: See `docs/process-management.md` for complete guidelines.

**Why this matters**: User interactions are critical for the Continuous Improvement step to learn and improve processes. If not logged, the system cannot learn from corrections.

## Command Behavior

When you invoke `/process-continue`, the AI will:

1. **MANDATORY: Discover Active Processes**
   - Search `.user-processes/active/` directory for all active processes
   - **CRITICAL**: If no processes exist:
     - Inform the user that no active process exists
     - **MANDATORY**: Suggest using `/process-new` to create a process from a template first
     - **NEVER** proceed to do work directly - you MUST have a process
   - If multiple processes exist, list them with:
     - Process name and date
     - Current step
     - Overall progress (X of Y steps completed)
     - Last updated timestamp
   - If only one process exists, proceed directly to resumption

2. **Read Process State**
   - Read the process file: `.user-processes/active/{process-folder}/process.md`
   - Check **Current State** section to see what was being worked on
   - Review completed steps and identify next incomplete step

3. **Read Memory File**
   - Read `.user-processes/active/{process-folder}/memory.md` to retrieve stored information
   - Summarize key information from previous steps:
     - Information produced
     - Decisions made
     - Files created/modified
     - Important context

4. **Summarize Current State**
   - Present clear summary of:
     - Process being resumed
     - What was being worked on
     - Overall progress (completed vs. remaining steps)
     - Key information from memory
   - Highlight the next step to work on

5. **Update Current State**
   - Update **Current State** to reflect resumption
   - Set active step to next incomplete step
   - Indicate that process has been resumed

6. **Proceed with Guidance**
   - Provide clear guidance on what needs to be done next
   - Reference any relevant information from memory
   - **MANDATORY**: All work must be done within the process structure
   - **MANDATORY**: Update process files (process.md, memory.md, log.md) as you work
   - Offer to start working on the current step immediately
   - **NEVER** skip process steps or do work outside the process

## Usage

Type `/process-continue` to resume an active process. If multiple processes exist, the AI will list them for you to choose from.

## Process Discovery

- If you don't specify which process, all active processes will be listed
- If you specify a process name, the AI will search for it
- The AI handles ambiguous process names by asking for clarification

## State Restoration

The AI reads both `process.md` and `memory.md` to fully restore context:
- Current step and progress
- Completed work
- Decisions made
- Files created
- Important notes

## Continuity

The AI ensures continuity by:
- Not repeating completed work
- Referencing previous decisions
- Using stored information from memory
- Maintaining context across sessions
- **MANDATORY**: All work must follow the process steps from the template
- **MANDATORY**: Update process state files as you progress
- **NEVER** skip process steps or workflow

## Error Handling

If issues are found:
- Missing or corrupted process files are reported
- Invalid process states are identified
- The AI helps fix problems before continuing

