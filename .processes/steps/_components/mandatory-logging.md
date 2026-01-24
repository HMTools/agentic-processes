**⚠️ MANDATORY: Log User Interactions BEFORE Any File Changes**

## Pre-Flight Checklist (MUST verify before ANY file operation)

Before making ANY file changes in response to user input, STOP and verify:

- [ ] **Step 1: Did the user make a request?** 
  - If YES → You MUST log it to `log.json` FIRST
  - If NO → Proceed (this is agent-initiated work)

- [ ] **Step 2: Have I logged this request?**
  - If NO → STOP. Log to `log.json` under current step's "userInteractions" section NOW
  - If YES → Proceed to file changes

- [ ] **Step 3: After file changes complete**
  - Update `log.json` with files modified in the "filesModified" array

## Logging Format

```json
{
  "request": "Exact user request or summary",
  "reason": "Why user made this request (explicit or inferred)",
  "response": "What agent will do/did in response",
  "timestamp": "YYYY-MM-DDTHH:mm:ssZ"
}
```

## Critical Rule

**NEVER create or modify files in response to a user request without logging FIRST.**

Violations of this rule result in incomplete audit trails and must be documented as critical incidents.

**Reference**: See `docs/process-management.md` for complete logging guidelines.
