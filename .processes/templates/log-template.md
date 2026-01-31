# Process Detailed Log Template

This template defines the structure for detailed process log files that capture comprehensive information about process execution.

## Purpose & Usage

Use this template when:
- Creating a new process log file for a process instance
- Understanding what information should be captured during process execution
- Learning how to effectively document process execution for future improvement

**Log files capture**: Actions taken, agent reasoning, user interactions, problems encountered, file modifications, and decisions made.

## Quick Reference

| Section | Purpose |
|---------|---------|
| Metadata | Process identification and timing |
| Step Sections | Detailed log for each process step |
| User Interactions | **Critical** - All user requests/corrections |
| Process-Wide Observations | Patterns and metrics across all steps |

**Location**: `.user-processes/active/{process-name}/log.json`

---

## Agent Layer

### JSON Instance Schema

When creating a new process instance, initialize `log.json` with this structure:

```json
{
  "type": "log-file",
  "metadata": {
    "process": "{process-name-YYYYMMDD}",
    "template": "{template-category/template-name}",
    "started": "{ISO 8601 timestamp}",
    "completed": null,
    "parentProcessPath": null,
    "subProcessPaths": []
  },
  "steps": {},
  "processWideObservations": {
    "patternsDetected": [],
    "userFeedbackSummary": [],
    "efficiencyMetrics": {},
    "recommendationsForFuture": []
  }
}
```

### Step Section Schema

When logging a step, add/update its entry in `steps` (keyed by StepId UUID):

```json
{
  "steps": {
    "{StepId UUID}": {
      "timestamp": "{ISO 8601 timestamp}",
      "actionsTaken": [
        "Detailed description of action 1",
        "Detailed description of action 2"
      ],
      "agentReasoning": [
        "Explanation of why certain decisions were made",
        "Context that was considered",
        "Trade-offs evaluated"
      ],
      "userInteractions": [
        {
          "request": "What the user asked to change",
          "reason": "Why the change was needed",
          "agentResponse": "What was changed in response",
          "timestamp": "{ISO 8601 timestamp}",
          "forImprovementStep": false,
          "potentialImprovement": null
        }
      ],
      "problemsEncountered": [
        "Description of problem encountered and resolution"
      ],
      "filesModified": [
        "path/to/file.cs"
      ],
      "decisionsMade": [
        "Technical decision with full rationale",
        "Architectural choice with reasoning"
      ],
      "performanceNotes": []
    }
  }
}
```

### What to Log

#### actionsTaken
Be specific and detailed:
- ✅ `"Created API controller with POST endpoint at /api/auth/login"`
- ❌ `"Created controller"`

#### agentReasoning
Explain your thought process:
- Why you chose a particular approach
- What alternatives you considered
- What context influenced the decision

#### userInteractions
**This is critical for learning!** Document every user request:
- What the user asked you to change
- Why it was needed (if user explained)
- What you changed in response
- Timestamp of the interaction

#### problemsEncountered
Don't just note what went wrong - analyze it:
- What was the problem?
- What caused it?
- How was it resolved?
- How can it be prevented in future processes?

#### filesModified
Track iterations:
- List every file touched in the step
- Note how many times each file was modified
- Describe what was changed

#### decisionsMade
Document the "why" not just the "what":
- Technical choices
- Architectural decisions
- Pattern selections
- Library/framework choices

### What NOT to Log

- Routine, expected actions that went smoothly
- Detailed code snippets (unless relevant to a problem)
- Trivial decisions with obvious outcomes
- Repetitive information already in memory file

### Logging Frequency

- **Start of Step**: Log timestamp and planned actions
- **During Step**: **MANDATORY** - Log each user interaction immediately (BEFORE making any file changes)
- **End of Step**: Log completion time, summary, and observations
- **End of Process**: Update processWideObservations section

### ⚠️ CRITICAL: Mandatory Logging Workflow

**When user makes a request/correction:**
1. **STOP** what you're doing
2. **IMMEDIATELY log** to `log.json` under current step's `userInteractions` array
3. **THEN** make file changes
4. **Update** `filesModified` array

**If user interaction not logged → STOP and log it first**

### Relationship to Memory File

| Memory File | Log File |
|-------------|----------|
| What was produced | How it was produced |
| Decisions made | Why decisions were made |
| Files created | How many iterations each file required |
| High-level outcomes | Detailed actions and reasoning |
| - | User corrections and feedback |
| - | Problems and solutions |

**Memory = Results | Log = Process**

### Example Log File

```json
{
  "type": "log-file",
  "metadata": {
    "process": "process-user-auth-20251206",
    "template": "development/develop-user-story",
    "started": "2025-12-06T10:00:00Z",
    "completed": null,
    "parentProcessPath": null,
    "subProcessPaths": []
  },
  "steps": {
    "c3d4e5f6-a7b8-9012-cdef-123456789012": {
      "timestamp": "2025-12-06T10:15:00Z",
      "actionsTaken": [
        "Created IAuthService interface in Service/Managers/Interfaces/",
        "Implemented AuthService with JWT token generation",
        "Added password hashing using BCrypt",
        "Registered service in dependency injection container"
      ],
      "agentReasoning": [
        "Chose JWT for stateless authentication to support distributed deployments",
        "Used BCrypt instead of PBKDF2 because it's the project standard",
        "Set token expiration to 24 hours based on security requirements"
      ],
      "userInteractions": [
        {
          "request": "The token should expire in 2 hours, not 24",
          "reason": "Security policy requires shorter session times for admin users",
          "agentResponse": "Updated TokenExpirationMinutes from 1440 to 120 in appsettings.json",
          "timestamp": "2025-12-06T10:45:00Z",
          "forImprovementStep": false
        },
        {
          "request": "Add refresh token support",
          "reason": "Users shouldn't have to re-login every 2 hours",
          "agentResponse": "Implemented RefreshToken method, added RefreshToken entity to database",
          "timestamp": "2025-12-06T11:00:00Z",
          "forImprovementStep": true,
          "potentialImprovement": "Consider adding refresh token support as standard in authentication templates"
        }
      ],
      "problemsEncountered": [
        "JWT validation failing in integration tests - caused by different signing keys between test and prod config"
      ],
      "filesModified": [
        "Service/Managers/AuthService.cs",
        "Service/Managers/Interfaces/IAuthService.cs",
        "appsettings.json"
      ],
      "decisionsMade": [
        "Used refresh tokens stored in database rather than in-memory cache to support server restarts",
        "Refresh tokens expire after 30 days and are single-use",
        "Implemented sliding expiration for refresh tokens"
      ],
      "performanceNotes": [
        "JWT generation takes ~5ms on average",
        "BCrypt hashing adds ~50ms to login time (acceptable for security benefit)"
      ]
    }
  },
  "processWideObservations": {
    "patternsDetected": [],
    "userFeedbackSummary": [],
    "efficiencyMetrics": {},
    "recommendationsForFuture": []
  }
}
```

### Tips for Effective Logging

1. **Be specific** - Vague logs don't help identify patterns
2. **Capture user corrections immediately** - Don't wait until end of step
3. **Explain the "why"** - Future improvements depend on understanding reasoning
4. **Note iteration counts** - High iteration counts signal improvement opportunities
5. **Document workarounds** - These are often candidates for systematic fixes
6. **Be honest about mistakes** - They're valuable learning opportunities

### Using Logs for Improvement

The Continuous Improvement step will analyze logs to find:
- **Patterns in user corrections** → Automation opportunities
- **Repeated problems** → Systematic fixes needed
- **High iteration counts** → Process optimization needed
- **Documentation gaps** → Areas needing better guidance
- **Unclear step instructions** → Template improvements needed

Every user correction is a signal that the process can be improved!
