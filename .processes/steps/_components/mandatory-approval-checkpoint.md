**⚠️ APPROVAL CHECKPOINT - STOP AND WAIT**

**DO NOT proceed to the next step until user explicitly approves.**

Before continuing:
- [ ] Present the deliverables for this step to the user
- [ ] Explicitly ask: "Do you approve? (approve/modify/reject)"
- [ ] **WAIT** for user response - do NOT proceed automatically
- [ ] Log user response in `log.json`
- [ ] Only proceed to next step if user approves

**If user has not explicitly approved → STOP and wait for their response**

**AGENT: Output this confirmation when reaching an approval checkpoint:**

⏸️ APPROVAL CHECKPOINT REACHED

Deliverables presented above. Awaiting your approval.

Options:
- "approve" - proceed to next step
- "modify" - request changes  
- "reject" - stop process

I will NOT proceed until you respond.

