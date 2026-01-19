# Process Detailed Log Template

This template defines the structure for detailed process log files that capture comprehensive information about process execution.

## Purpose

Process logs capture detailed information about:
- Every action taken by the agent
- Agent reasoning and decision-making process
- All user requests for changes or corrections
- Problems encountered and their solutions
- File modifications and iterations

This information is used by the Continuous Improvement step to identify patterns and implement improvements for future processes.

## Location

Process logs are stored at: `.processes/active/{process-name}/log.md`

## Template Structure

```markdown
# Process Detailed Log: {Process Name}

## Metadata
- **Process**: {process-name-YYYYMMDD}
- **Template**: {template-name}
- **Started**: {YYYY-MM-DD HH:mm:ss}
- **Completed**: {YYYY-MM-DD HH:mm:ss}

---

## Step 1: {Step Name}

### Timestamp
- **Started**: {YYYY-MM-DD HH:mm:ss}
- **Completed**: {YYYY-MM-DD HH:mm:ss}

### Actions Taken
1. {Detailed description of action 1}
2. {Detailed description of action 2}
3. {Detailed description of action 3}

### Agent Reasoning
- {Explanation of why certain decisions were made}
- {Context that was considered}
- {Trade-offs evaluated}

### User Interactions
1. **User Request**: {What the user asked to change}
   - **Reason**: {Why the change was needed}
   - **Agent Response**: {What was changed in response}
   - **Timestamp**: {YYYY-MM-DD HH:mm:ss}

2. **User Request**: {Another user correction}
   - **Reason**: {Why this was needed}
   - **Agent Response**: {What was modified}
   - **Timestamp**: {YYYY-MM-DD HH:mm:ss}

### Problems Encountered
- **Problem**: {Description of the issue}
  - **Root Cause**: {Analysis of what caused it}
  - **Solution**: {How it was resolved}
  - **Prevention**: {How to avoid this in future processes}

### Files Modified
- path/to/file1.cs
  - **Changes**: {Description of modifications made}
  - **Iterations**: {Number of times this file was modified in this step}
- path/to/file2.md
  - **Changes**: {Description of modifications made}
  - **Iterations**: {Number of times this file was modified in this step}

### Decisions Made
- {Technical decision with full rationale}
- {Architectural choice with reasoning}
- {Implementation approach selected and why}

### Performance Notes
- {Any performance observations}
- {Bottlenecks identified}
- {Optimization opportunities}

---

## Step 2: {Step Name}

### Timestamp
- **Started**: {YYYY-MM-DD HH:mm:ss}
- **Completed**: {YYYY-MM-DD HH:mm:ss}

### Actions Taken
1. {Detailed description of action 1}
2. {Detailed description of action 2}

### Agent Reasoning
- {Why certain decisions were made}
- {Context considered}

### User Interactions
{Document any user corrections or feedback}

### Problems Encountered
{Document any issues and their resolutions}

### Files Modified
{List all files changed in this step}

### Decisions Made
{Document all decisions with rationale}

### Performance Notes
{Any relevant performance observations}

---

## Step 3: {Step Name}
{Continue pattern for all steps...}

---

## Process-Wide Observations

### Patterns Detected
- {Recurring issues or patterns observed across multiple steps}
- {Common user corrections that appeared multiple times}
- {Systematic inefficiencies identified}

### User Feedback Summary
- {Aggregate of all user corrections and suggestions}
- {Most frequent types of corrections}
- {Areas where user intervention was most needed}

### Efficiency Metrics
- Steps completed: {N}
- Total user corrections: {N}
- Files modified: {N}
- Steps requiring multiple iterations: {N}

### Recommendations for Future
- {Suggestions for process improvements}
- {Areas to automate based on patterns}
- {Documentation gaps to fill}
```

## What to Log

### Actions Taken
Be specific and detailed:
- ✅ "Created API controller with POST endpoint at /api/auth/login"
- ❌ "Created controller"

### Agent Reasoning
Explain your thought process:
- Why you chose a particular approach
- What alternatives you considered
- What context influenced the decision

### User Interactions
**This is critical for learning!** Document every user request:
- What the user asked you to change
- Why it was needed (if user explained)
- What you changed in response
- Timestamp of the interaction

### Problems Encountered
Don't just note what went wrong - analyze it:
- What was the problem?
- What caused it?
- How was it resolved?
- How can it be prevented in future processes?

### Files Modified
Track iterations:
- List every file touched in the step
- Note how many times each file was modified
- Describe what was changed

### Decisions Made
Document the "why" not just the "what":
- Technical choices
- Architectural decisions
- Pattern selections
- Library/framework choices

## What NOT to Log

- Routine, expected actions that went smoothly
- Detailed code snippets (unless relevant to a problem)
- Trivial decisions with obvious outcomes
- Repetitive information already in memory file

## Logging Frequency

- **Start of Step**: Log timestamp and planned actions
- **During Step**: **MANDATORY** - Log each user interaction immediately (BEFORE making any file changes)
- **End of Step**: Log completion time, summary, and observations
- **End of Process**: Add process-wide observations section

## ⚠️ CRITICAL: Mandatory Logging Workflow

**When user makes a request/correction:**
1. **STOP** what you're doing
2. **IMMEDIATELY log** to `log.md` under current step's "User Interactions" section
3. **THEN** make file changes
4. **Update** log.md "Files Modified" section

**If user interaction not logged → STOP and log it first**

**Reference**: See `docs/process-management.md` for complete guidelines and enforcement checklist.

## Relationship to Memory File

| Memory File | Log File |
|-------------|----------|
| What was produced | How it was produced |
| Decisions made | Why decisions were made |
| Files created | How many iterations each file required |
| High-level outcomes | Detailed actions and reasoning |
| - | User corrections and feedback |
| - | Problems and solutions |

**Memory = Results | Log = Process**

## Example Log Entry

```markdown
## Step 3: Implement Service Layer

### Timestamp
- **Started**: 2025-12-06 10:15:00
- **Completed**: 2025-12-06 11:30:00

### Actions Taken
1. Created IAuthService interface in Service/Managers/Interfaces/
2. Implemented AuthService with JWT token generation
3. Added password hashing using BCrypt
4. Registered service in dependency injection container

### Agent Reasoning
- Chose JWT for stateless authentication to support distributed deployments
- Used BCrypt instead of PBKDF2 because it's the project standard (found in existing UserService)
- Set token expiration to 24 hours based on security requirements in documentation

### User Interactions
1. **User Request**: "The token should expire in 2 hours, not 24"
   - **Reason**: Security policy requires shorter session times for admin users
   - **Agent Response**: Updated TokenExpirationMinutes from 1440 to 120 in appsettings.json
   - **Timestamp**: 2025-12-06 10:45:00

2. **User Request**: "Add refresh token support"
   - **Reason**: Users shouldn't have to re-login every 2 hours
   - **Agent Response**: Implemented RefreshToken method, added RefreshToken entity to database
   - **Timestamp**: 2025-12-06 11:00:00

### Problems Encountered
- **Problem**: JWT validation was failing in integration tests
  - **Root Cause**: Test environment was using different signing key than production config
  - **Solution**: Updated test setup to use consistent key from appsettings.Test.json
  - **Prevention**: Add validation in test base class to verify config consistency

### Files Modified
- Service/Managers/AuthService.cs
  - **Changes**: Implemented authentication logic with JWT generation and refresh token support
  - **Iterations**: 3 (initial implementation, token expiration fix, refresh token addition)
- Service/Managers/Interfaces/IAuthService.cs
  - **Changes**: Defined service contract
  - **Iterations**: 2 (initial definition, added RefreshToken method)
- appsettings.json
  - **Changes**: Updated TokenExpirationMinutes from 1440 to 120
  - **Iterations**: 1

### Decisions Made
- Used refresh tokens stored in database rather than in-memory cache to support server restarts
- Refresh tokens expire after 30 days and are single-use (invalidated after refresh)
- Implemented sliding expiration for refresh tokens to support long-term sessions

### Performance Notes
- JWT generation takes ~5ms on average
- BCrypt hashing adds ~50ms to login time (acceptable for security benefit)
```

## Tips for Effective Logging

1. **Be specific** - Vague logs don't help identify patterns
2. **Capture user corrections immediately** - Don't wait until end of step
3. **Explain the "why"** - Future improvements depend on understanding reasoning
4. **Note iteration counts** - High iteration counts signal improvement opportunities
5. **Document workarounds** - These are often candidates for systematic fixes
6. **Be honest about mistakes** - They're valuable learning opportunities

## Using Logs for Improvement

The Continuous Improvement step will analyze logs to find:
- **Patterns in user corrections** → Automation opportunities
- **Repeated problems** → Systematic fixes needed
- **High iteration counts** → Process optimization needed
- **Documentation gaps** → Areas needing better guidance
- **Unclear step instructions** → Template improvements needed

Every user correction is a signal that the process can be improved!
