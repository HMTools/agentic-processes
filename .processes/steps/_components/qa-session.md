**📋 Q&A SESSION - Gather Missing Information**

Use this component when the agent identifies information gaps that require user input before proceeding.

## When to Use

- Information needed to complete a step is missing or unclear
- Assumptions need user confirmation
- Multiple options exist and user preference is required
- External knowledge (not in codebase) is needed

## Q&A Session Workflow

### 1. Identify Questions

Before presenting questions:
- [ ] Review what information is missing
- [ ] Formulate clear, specific questions

### 2. Present Questions

Format questions clearly:

```markdown
## Questions Before Proceeding

I need the following information to continue:

### Required
1. **[Topic]**: [Specific question]
   - Context: [Why this is needed]
   - Options (if applicable): A) ... B) ... C) ...

2. **[Topic]**: [Specific question]
   - Context: [Why this is needed]

### Optional (Nice-to-have)
3. **[Topic]**: [Question that would help but isn't blocking]
```

### 3. Wait for Answers

- [ ] Present all questions together (avoid multiple back-and-forth rounds)
- [ ] **WAIT** for user response - do NOT proceed without answers to required questions
- [ ] Accept partial answers if optional questions are skipped

### 4. Log Q&A Session

Record Q&A session results:
- Questions asked (id, topic, question, priority, context)
- Answers received (question id, answer, timestamp)
- Unanswered questions
- Outcome (all_answered, partial, deferred)

### 5. Handle Outcomes

| Outcome | Action |
|---------|--------|
| All required answered | Proceed with the step |
| Some required unanswered | Ask user: proceed with assumptions OR wait for answers? |
| Deferred to later | Document assumptions, flag for future clarification |

## Best Practices

- **Batch questions**: Ask all questions at once, not one at a time
- **Provide context**: Explain why each piece of information is needed
- **Offer options**: When possible, provide choices instead of open-ended questions
- **Prioritize**: Clearly mark which questions are required vs optional
- **Document assumptions**: If proceeding without answers, document what was assumed

## Memory File Integration

Record Q&A results for future steps:
- Whether a Q&A session was conducted
- Number of questions asked and answered
- Key answers (topic and answer summary)
- Assumptions made if any questions were unanswered

