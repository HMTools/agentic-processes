**⚠️ MANDATORY: Log User Interactions IMMEDIATELY**

## Critical Timing Rule

**Log FIRST, respond SECOND.** When a user sends ANY message (question, feedback, instruction, answer), your FIRST action must be to log it to `log.json`. Do NOT formulate or send your response until the interaction is logged.

## Pre-Flight Checklist

**AGENT: Before responding to user input OR making file changes, STOP and verify:**

- [ ] **Step 1: Did the user send a message?** 
  - If YES → Log to `log.json` IMMEDIATELY
  - **Output**: "✓ Logged user interaction to log.json"
  
- [ ] **Step 2: Have I logged this interaction?**
  - If NO → STOP. Log NOW before proceeding
  - If YES → Now you may respond and/or make file changes

- [ ] **Step 3: After file changes complete**
  - Update `log.json` filesModified array
  - **Output**: "✓ Updated log.json with modified files"

## Logging Format

```json
{
  "request": "Exact user request or summary",
  "reason": "Why user made this request (explicit or inferred)",
  "response": "What agent will do/did in response",
  "timestamp": "YYYY-MM-DDTHH:mm:ssZ"
}
```

## Critical Rules

1. **NEVER respond to a user message without logging it FIRST.**
2. **NEVER create or modify files in response to a user request without logging FIRST.**

Violations of these rules result in incomplete audit trails and must be documented as critical incidents.

## Anti-Pattern: What NOT to Do

❌ **WRONG** - Responding first, logging later (or not at all):
```
User: "Why didn't you request the API contract?"
Agent: "I apologize, I should have..."  ← Response sent WITHOUT logging
Agent: [later] Updates log.json         ← Too late! Context may be lost
```

✅ **CORRECT** - Log first, then respond:
```
User: "Why didn't you request the API contract?"
Agent: [FIRST] Updates log.json with user feedback
Agent: [THEN] "I apologize, I should have..."
```

**Reference**: See `docs/process-management.md` for complete logging guidelines.
