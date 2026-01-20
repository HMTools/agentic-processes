<!--
Step: Continuous Improvement & Learning
Purpose: Analyze process execution log and implement improvements for future iterations
-->

# Step: Continuous Improvement & Learning

## Description

Analyze the detailed process log to identify improvement opportunities based on actual execution. Focus on patterns where the user had to request changes, inefficiencies detected, and opportunities to automate or enhance the process.

## Purpose & Usage

Use this step when you need to:
- Analyze process execution for improvement opportunities
- Implement improvements to templates, steps, or documentation
- Learn from user corrections and feedback
- Evolve the process system based on actual usage

**Output**: Analysis report, implemented improvements (with user approval), updated templates/steps.

## Quick Reference

| Priority | Criteria |
|----------|----------|
| High | Frequent issues + High impact + Easy to implement |
| Medium | Moderate frequency or impact |
| Low | Infrequent or low impact |

**Categories**: Automation, Process Optimization, Documentation Enhancement, Validation Strengthening

---

## Agent Layer

### Required Components

- [mandatory-logging.md](../_components/mandatory-logging.md) - Logging guidelines

### Output (Detailed)

- Analysis report of improvement opportunities
- Implemented improvements (one at a time with user approval)
- Updated process templates, steps, or documentation
- Summary of all improvements made

### Guidance

<!-- @include: _components/mandatory-logging.md -->

#### 1. Read Process Log

- Load the process log file from `.user-processes/active/{process-name}/log.md`
- Parse all user interactions and change requests
- Identify patterns and recurring issues
- Note high iteration counts on files or steps

#### 2. Analyze for Improvements

**Group Similar User Corrections:**
- Look for the same type of correction across multiple steps
- Identify corrections that could be automated
- Find missing validations that caused issues

**Identify Steps with Multiple Iterations:**
- Steps that required many revisions indicate unclear instructions
- High file iteration counts suggest missing context or guidance
- Multiple problem-solution cycles point to systematic issues

**Find Documentation Gaps:**
- User questions that documentation should have answered
- Confusion about patterns or conventions
- Missing examples or unclear guidance

**Detect Repeated Manual Interventions:**
- Tasks the user repeatedly had to request
- Manual corrections that could be automated
- Missing checkpoints or validations

#### 3. Prioritize Improvements

Rank improvements by:
1. **Frequency**: How often did this issue occur?
2. **Impact**: How much time/effort would fixing this save?
3. **Ease**: How easy is this to implement?

Focus on **high frequency + high impact + easy to implement** first.
Limit to top 3-5 improvements to avoid fatigue.

#### 4. For Each Improvement (Iteratively)

**a. Propose Improvement** - Present to user: What, Why, Impact, Scope

**b. Investigate Solution** - Research approach, check patterns, identify files to modify

**c. Implement Change** - Make modifications following conventions, keep changes atomic

**d. Request User Approval** - Show changes, ask for confirmation

**e. Document Improvement** - Update memory with what was improved

#### 5. MANDATORY: Propose ALL Improvements Before Completing

⚠️ You MUST propose ALL identified improvements to the user before completing this step.

**Checklist:**
- [ ] Have all identified improvements been proposed to the user?
- [ ] Has the user approved/rejected each improvement?
- [ ] Have all approved improvements been implemented?
- [ ] Have all rejected improvements been documented with reasons?

#### 6. Summarize All Improvements

When all improvements are complete:
- List all improvements made
- List improvements skipped and why
- Provide any recommendations for future work

### Improvement Categories

**Automation Opportunities** - User repeatedly asked for same type of change
**Process Optimization** - Steps required too many iterations
**Documentation Enhancement** - User had questions documentation should answer
**Validation Strengthening** - Errors caught late that could be caught early
**Context Enhancement** - Missing information requiring multiple round trips
**Pattern Violations** - Deviations from standards that should be enforced

### Files/Folders

**Read:**
- `.user-processes/active/{process-name}/log.md`

**Update (as needed):**
- Process templates in `.processes/templates/`
- Process steps in `.processes/steps/`
- Documentation in `docs/`

### Best Practices

- **Propose all improvements**: Before completing, ensure ALL identified improvements have been proposed
- **One at a time**: Only implement one improvement at a time
- **Always get approval**: User must approve before proceeding
- **Atomic changes**: Keep each improvement focused and self-contained
- **No traceback**: Don't reference the previous state in the improved version
- **Clean implementation**: Make it look like it was always there

### Memory File Usage

**What to Store:**

```markdown
### Continuous Improvement & Learning

#### Improvements Identified
1. Add validation checkpoint to API implementation step
2. Add connection string example to repository step
...

#### Improvements Implemented
1. **Add Validation Checkpoint to API Step**
   - **Change**: Added explicit validation checkpoint
   - **Files Modified**: .processes/steps/api/implement-controller-layer.md
   - **User Approval**: Yes
   - **Impact**: Prevents missing validation attributes

#### Improvements Deferred
1. **Add Example to Service Step**
   - **Reason**: User indicated example already exists elsewhere

#### Summary
- Total improvements identified: 5
- Total improvements implemented: 3
- Total improvements deferred: 2
```

### Success Criteria

This step is complete when:
- [ ] Process log has been fully analyzed
- [ ] All identified improvements have been either implemented or deferred
- [ ] User has approved all implemented changes
- [ ] Memory file documents all improvements and outcomes
- [ ] No more high-priority improvements remain
