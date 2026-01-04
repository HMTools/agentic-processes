<!--
Step: [Step Name]
Purpose: [What this step accomplishes]
-->

# Step: [Step Name]

## Description

[Provide a detailed description of what needs to be done in this step. Be specific about the objective and scope.]

## Output

[Clearly define what this step produces. Examples:]
- Files created (with paths)
- Documentation written
- Decisions made
- Configurations updated
- Code implemented

## Guidance

[Provide detailed guidance on how to complete this step, including:]

**⚠️ MANDATORY: Log User Interactions Immediately**

Before making ANY file changes in response to user input:
- [ ] Log user interaction in `log.md` under current step's "User Interactions" section
- [ ] Include timestamp, user request, reason, and agent response
- [ ] **STOP** if user interaction not logged - log it first before proceeding

**Reference**: See `docs/process-management.md` for complete logging guidelines.

**Specific Actions:**
- Action 1: [Detailed instruction]
- Action 2: [Detailed instruction]
- Action 3: [Detailed instruction]

**Files/Folders:**
- Work in: `[Path to directory or file]`
- Create: `[Path to new files]`
- Update: `[Path to existing files]`

**Code Patterns:**
- Follow [specific pattern or convention]
- Use [specific framework or library]
- Reference [existing examples in codebase]

**Tools:**
- Use [tool name] for [purpose]
- Run [command] to [accomplish task]

**Best Practices:**
- [Best practice 1]
- [Best practice 2]
- [Best practice 3]

## Memory File Usage

[Provide guidance on when and how this step should use the process memory file]

**When to Use Memory:**
- Use when this step produces information needed by later steps
- Use when this step needs information from previous steps
- Use when this step makes decisions that should be documented

**Memory Usage for This Step:**
- **Read from**: Step {N} section in memory.md - [What information to retrieve from which step]
- **Write to**: Current step section in memory.md - [What information to store]
  - Information Produced: [What was created/discovered]
  - Decisions Made: [Technical/architectural decisions]
  - Files Modified/Created: [List of files changed]
  - Notes: [Additional context or references to previous steps]

## Flow

```mermaid
graph TD
    A[Substep 1: Action] --> B[Substep 2: Action]
    B --> C[Substep 3: Action]
    C --> D{Decision Point?}
    D -->|Yes| E[Substep 4: Action]
    D -->|No| F[Substep 5: Action]
    E --> G[Substep 6: Action]
    F --> G
    G --> H{Need to Repeat?}
    H -->|Yes| B
    H -->|No| I[Complete]
```

### Substeps

- [ ] **Substep 1**: [Action description - be specific about what to do]
- [ ] **Substep 2**: [Action description - include any tools or commands]
- [ ] **Substep 3**: [Action description - mention expected results]
- [ ] **Substep 4**: [Action description] (conditional - only if decision point is Yes)
- [ ] **Substep 5**: [Action description] (conditional - only if decision point is No)
- [ ] **Substep 6**: [Action description - final verification or completion]

**Notes:**
- Substeps should be concrete, actionable tasks
- Mark conditional substeps clearly
- Include verification or validation substeps
- Order substeps sequentially (except for conditional branches)

## Examples

[Optional but highly recommended - provide 1-3 concrete examples of this step in action]

### Example 1: [Scenario Name]
[Describe a specific scenario where this step is applied]

**Context:**
- [Relevant context for this example]

**Actions:**
1. [Specific action taken]
2. [Specific action taken]
3. [Specific action taken]

**Result:**
[What was produced or accomplished]

### Example 2: [Scenario Name]
[Another scenario if applicable]

## Common Pitfalls

[Optional but recommended - warn about potential issues]

### Pitfall 1: [Issue Description]
**Problem:** [Describe what goes wrong]
**Solution:** [How to avoid or fix it]

### Pitfall 2: [Issue Description]
**Problem:** [Describe what goes wrong]
**Solution:** [How to avoid or fix it]

### Pitfall 3: [Issue Description]
**Problem:** [Describe what goes wrong]
**Solution:** [How to avoid or fix it]

---

## Template Instructions

When creating a new step from this template:

1. **Replace all placeholders** in brackets with actual content
2. **Customize the flow diagram** to match your step's substeps
3. **Add/remove substeps** as needed for your step
4. **Include examples** from real project scenarios
5. **Document common pitfalls** you've encountered
6. **Remove these instructions** before saving

**Remember:**
- Steps are self-contained and cannot reference other steps
- Provide rich, detailed guidance since steps are reused
- Use project-specific paths, tools, and conventions
- Make substeps actionable and specific
