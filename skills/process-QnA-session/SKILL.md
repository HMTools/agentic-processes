---
name: process-QnA-session
description: Conduct structured Q&A sessions with users to gather missing information during process execution. Supports iterative refinement, priority tracking, and both CLI and UI interactions.
user-invocable: false
---

# Process Q&A Session

Enable agents to gather missing information through structured Q&A sessions during process execution.

## Purpose

When executing a process step, agents may encounter information gaps, ambiguous requirements, or decisions that require user input. Instead of making assumptions or halting execution entirely, agents can create structured Q&A sessions to collect needed information systematically.

This skill provides:
- Structured question management with topics, context, and options
- Iterative answer refinement
- Priority-based question tracking
- Session lifecycle management
- Automatic memory and log integration
- Support for both CLI and UI interactions

## When to Use

Use this skill when:
- Missing critical information needed to complete a step
- Facing architectural or design decisions
- Encountering ambiguous requirements
- Needing clarification on user preferences
- Requiring specification of configuration values
- User input would improve quality vs. making assumptions

Do NOT use this skill when:
- Information can be reasonably inferred from context
- Question is trivial or low-impact
- Standard conventions or best practices apply
- Information is already in memory from previous steps
- Issue can be resolved through research or documentation

## Operations

All operations are invoked via:
```
Bash(python3 ${CLAUDE_PLUGIN_ROOT}/scripts/process_manager.py <subcommand> --process-dir <dir> ...)
```

Check stdout for `{"status": "ok", ...}` or `{"status": "error", "message": "..."}`.

---

### create-session

Create a new Q&A session with one or more questions.

**When**: When you identify information gaps during step execution.

**Parameters**:
- `--process-dir <dir>`: Path to process directory
- `--questions '<JSON array>'`: Array of question objects

**Question Object Schema**:
```json
{
  "id": "string (unique within session)",
  "topic": "string (category/subject)",
  "question": "string (the actual question)",
  "priority": "required|optional",
  "context": "string (why this question matters)",
  "options": ["array", "of", "suggested", "answers"] (optional)
}
```

**Example**:
```bash
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/process_manager.py create-session \
  --process-dir ~/.claude/agentic-processes/active/my-process-20260512 \
  --questions '[
    {
      "id": "q1",
      "topic": "Database Selection",
      "question": "Which database should be used for data persistence?",
      "priority": "required",
      "context": "Determines ORM choice, schema design, and deployment requirements",
      "options": ["PostgreSQL", "MySQL", "SQLite", "MongoDB"]
    },
    {
      "id": "q2",
      "topic": "API Style",
      "question": "Should the API follow REST or GraphQL patterns?",
      "priority": "required",
      "context": "Affects endpoint design, client libraries, and documentation approach"
    }
  ]'
```

**Behavior**:
- All questions start with status 'unanswered'
- Empty answerHistory for all questions
- Session status derived as 'pending'
- `qa-session.json` created in process directory
- Agent continuation blocked until session completed
- Only one session can exist at a time per process

**Errors**:
- Session already exists: Complete current session first
- Invalid question schema: Fix JSON structure
- Empty questions array: Must have at least one question

---

### answer-question

Add or update an answer for a specific question.

**When**: After user provides an answer (via CLI or UI).

**Parameters**:
- `--process-dir <dir>`: Path to process directory
- `--question-id <id>`: ID of question being answered
- `--answer "<text>"`: User's answer text

**Example**:
```bash
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/process_manager.py answer-question \
  --process-dir ~/.claude/agentic-processes/active/my-process-20260512 \
  --question-id q1 \
  --answer "PostgreSQL with TimescaleDB extension for time-series data"
```

**Behavior**:
- First answer: status changes from 'unanswered' to 'answered'
- Subsequent answers: status changes to 'refined', new iteration added to history
- Answer appended to answerHistory with timestamp and iteration number
- Session status automatically re-derived
- Current answer is always the most recent in answerHistory

**Errors**:
- No active session: Create session first
- Invalid question ID: Check session for valid IDs
- Empty answer: Provide non-empty answer text

---

### complete-question

Mark a question as completed (answer is satisfactory).

**When**: After reviewing user's answer and determining it's sufficient for continuing execution.

**Parameters**:
- `--process-dir <dir>`: Path to process directory
- `--question-id <id>`: ID of question to mark complete

**Example**:
```bash
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/process_manager.py complete-question \
  --process-dir ~/.claude/agentic-processes/active/my-process-20260512 \
  --question-id q1
```

**Behavior**:
- Question status changes to 'completed'
- Cannot complete unanswered question (must have at least one answer)
- Session status re-derived based on all question statuses
- If all required questions completed, session becomes ready for archiving

**Errors**:
- No active session: Create session first
- Question not answered: Call answer-question first
- Invalid question ID: Check session for valid IDs

---

### complete-session

Archive completed session and remove file.

**When**: After all required questions have status 'completed'.

**Parameters**:
- `--process-dir <dir>`: Path to process directory

**Example**:
```bash
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/process_manager.py complete-session \
  --process-dir ~/.claude/agentic-processes/active/my-process-20260512
```

**Behavior**:
- Verifies all required questions have status 'completed'
- Creates QASessionLog entry in `log.json` with full answer history
- Creates QASessionMemory entry in `memory.json` with key answers
- Deletes `qa-session.json` file
- Unblocks agent continuation
- Unblocks pending interactions

**Errors**:
- No active session: Nothing to complete
- Incomplete required questions: Complete all required questions first
- Optional questions can remain incomplete

---

### get-session

Read current Q&A session state.

**When**: To review session status, check answers, or determine next action.

**Parameters**:
- `--process-dir <dir>`: Path to process directory

**Example**:
```bash
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/process_manager.py get-session \
  --process-dir ~/.claude/agentic-processes/active/my-process-20260512
```

**Returns**:
- JSON object with current session state if active
- `null` if no active session
- Includes all questions, answers, statuses, and timestamps

---

## Workflow

### Standard Q&A Workflow

1. **Identify Information Gaps**: During step execution, identify missing information that blocks progress or quality
2. **Create Session**: Use `create-session` with all questions grouped by topic
3. **Wait for Answers**: System automatically blocks agent and prompts user (via CLI or UI)
4. **Review Answers**: Use `get-session` to read user responses
5. **Request Refinement** (if needed): 
   - Ask user for clarification in conversation
   - User refines answer via `answer-question` (creates new iteration)
   - Or mark question incomplete and wait for new answer
6. **Complete Questions**: Mark each question as complete when answer is satisfactory
7. **Complete Session**: Archive session when all required questions completed
8. **Continue Execution**: Use answers from memory to proceed with step implementation

### Multiple Sessions Per Step

You can create multiple Q&A sessions within a single step:
1. Create and complete first session
2. Continue with partial implementation using first set of answers
3. Identify additional gaps or follow-up questions
4. Create new session with follow-up questions
5. Complete second session
6. Continue with full context

Each session is independent with its own lifecycle. Previous session answers are available in memory.

---

## Status Tracking

### Question Status

| Status | Description | Transitions From | Transitions To |
|--------|-------------|------------------|----------------|
| `unanswered` | No answer provided yet | (initial) | answered |
| `answered` | Initial answer provided | unanswered | refined, completed |
| `refined` | Answer updated at least once | answered | refined, completed |
| `completed` | Answer finalized and satisfactory | answered, refined | (terminal) |

### Session Status (Derived)

Session status is automatically derived from question statuses:

| Status | Condition | Agent Blocked | Pending Interactions Blocked |
|--------|-----------|---------------|------------------------------|
| `pending` | At least one required question unanswered | Yes | Yes |
| `partial` | All required questions answered but not all completed | Yes | Yes |
| `completed` | All required questions completed | No (after archiving) | No (after archiving) |

---

## Answer History

Each question maintains full answer history to support iterative refinement:

**Structure**:
```json
{
  "answerHistory": [
    {
      "iteration": 1,
      "answer": "PostgreSQL",
      "timestamp": "2026-05-12T10:30:00Z"
    },
    {
      "iteration": 2,
      "answer": "PostgreSQL with TimescaleDB extension",
      "timestamp": "2026-05-12T10:35:00Z"
    }
  ]
}
```

**Properties**:
- All iterations preserved (never deleted)
- Timestamps for each answer
- Sequential iteration numbers
- Current answer is most recent (highest iteration)
- Full history logged when session archived

---

## Blocking Behavior

### Agent Continuation Blocked

When `qa-session.json` exists with status 'pending' or 'partial':
- Agent cannot proceed to next step
- Agent must wait for session completion
- Hook `check-qa-session.sh` enforces blocking

### Pending Interactions Blocked

When Q&A session exists:
- Cannot create `pending-interaction.json` for approval checkpoints
- Q&A takes priority over other interaction types
- Hook `block-pending-on-qa.sh` enforces this rule
- Rationale: Avoid competing interaction types

### Unblocking

Automatic when:
- Session completed via `complete-session`
- `qa-session.json` archived and deleted
- No manual intervention required

---

## CLI vs UI

### CLI Mode

**Workflow**:
1. Agent creates session and displays questions in conversation
2. User answers questions in natural language responses
3. Agent calls `answer-question` to record each response
4. Agent marks questions complete as user provides satisfactory answers
5. Agent completes session when all required questions answered

**Advantages**:
- Natural language interaction
- Conversational refinement
- No UI required

**Example**:
```
Agent: I need to know which database to use. Options: PostgreSQL, MySQL, SQLite

User: Let's use PostgreSQL

Agent: [calls answer-question with "PostgreSQL"]
Agent: [calls complete-question for q1]
Agent: [calls complete-session]
Agent: Great, continuing with PostgreSQL implementation...
```

### UI Mode

**Workflow**:
1. Agent creates session via operation
2. UI detects `qa-session.json` via file watcher
3. UI renders questions in dedicated panel with form inputs
4. User types answers directly in UI form
5. UI calls operations via IPC handlers when user submits
6. Agent receives notification when session completed
7. Agent continues execution

**Advantages**:
- Visual status indicators
- Form-based input with validation
- Side-by-side view of all questions
- Progress tracking

Both modes use identical operations and produce identical results. The user experience differs but the underlying data and logic are the same.

---

## Best Practices

### Question Design

1. **Group Related Questions**: Create all questions for a topic in one session rather than multiple sequential sessions
2. **Clear Context**: Provide detailed context explaining why each question matters and how answer will be used
3. **Suggest Options**: Include options array when there are known valid answers or common patterns
4. **Specific Topics**: Use descriptive topic names that group related questions (e.g., "Authentication", "Database", "API Design")
5. **One Question Per Item**: Don't combine multiple questions into one; break into separate question objects

### Priority Management

1. **Required vs Optional**: Mark questions required only when truly blocking execution
2. **Optional for Nice-to-Have**: Use optional priority for preferences that have reasonable defaults
3. **Complete Required First**: Focus on completing all required questions before optional ones

### Answer Management

1. **Review Before Completing**: Check answer quality and completeness before marking complete
2. **Encourage Refinement**: If initial answer is vague, ask user to refine rather than completing
3. **Multiple Iterations Welcome**: Support multiple answer iterations for complex decisions
4. **Context in Follow-ups**: When asking for refinement, explain what additional detail is needed

### Memory Integration

1. **Document Key Decisions**: Completed Q&A sessions automatically create memory entries
2. **Reference in Later Steps**: Check memory for previous Q&A answers before creating new sessions
3. **Cross-Reference**: Link Q&A decisions to implementation artifacts in memory

### Session Lifecycle

1. **Complete Fully**: Always complete sessions properly; don't leave orphaned qa-session.json files
2. **One at a Time**: Complete current session before creating new one
3. **Archive Regularly**: Don't let sessions sit incomplete; address blocking questions promptly

---

## Error Handling

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| Session already exists | Tried to create session while one is active | Complete current session first with `complete-session` |
| Cannot complete unanswered question | Tried to mark question complete without answer | Call `answer-question` first to provide answer |
| Cannot complete session with incomplete required questions | Tried to archive session with pending required questions | Mark all required questions complete first |
| Malformed qa-session.json | Manual edit or corruption | Delete file and recreate session properly via operations |
| No active session | Tried to call operation without session | Create session first with `create-session` |
| Invalid question ID | Referenced non-existent question | Use `get-session` to see valid question IDs |

### Recovery Strategies

**Orphaned Session File**:
If `qa-session.json` exists but is invalid:
1. Back up file for debugging
2. Delete qa-session.json manually
3. Create new session with correct structure

**Incomplete Session Blocking Progress**:
If stuck with old incomplete session:
1. Use `get-session` to review state
2. Answer remaining required questions
3. Mark questions complete
4. Complete session to unblock

---

## Examples

### Example 1: Architecture Decision Q&A

**Scenario**: Agent building new API service needs to choose database.

```bash
# Agent identifies gap and creates session
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/process_manager.py create-session \
  --process-dir ~/.claude/agentic-processes/active/api-service-20260512 \
  --questions '[
    {
      "id": "db_choice",
      "topic": "Database Selection",
      "question": "Which database should be used for this API service?",
      "priority": "required",
      "context": "Determines ORM, migration strategy, deployment complexity, and scalability approach",
      "options": ["PostgreSQL", "MySQL", "SQLite", "MongoDB"]
    }
  ]'

# User answers via UI or CLI
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/process_manager.py answer-question \
  --process-dir ~/.claude/agentic-processes/active/api-service-20260512 \
  --question-id db_choice \
  --answer "PostgreSQL"

# Agent reviews answer, marks complete
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/process_manager.py complete-question \
  --process-dir ~/.claude/agentic-processes/active/api-service-20260512 \
  --question-id db_choice

# Agent completes session
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/process_manager.py complete-session \
  --process-dir ~/.claude/agentic-processes/active/api-service-20260512

# Agent continues implementation using PostgreSQL
```

---

### Example 2: Iterative Answer Refinement

**Scenario**: Agent needs API design clarification with refinement.

```bash
# Create session
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/process_manager.py create-session \
  --process-dir ~/.claude/agentic-processes/active/api-design-20260512 \
  --questions '[
    {
      "id": "api_style",
      "topic": "API Design",
      "question": "What REST API design constraints should be followed?",
      "priority": "required",
      "context": "Determines endpoint structure, response format, and documentation approach"
    }
  ]'

# User provides initial answer
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/process_manager.py answer-question \
  --process-dir ~/.claude/agentic-processes/active/api-design-20260512 \
  --question-id api_style \
  --answer "RESTful"

# Agent asks for more detail in conversation
# User refines answer
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/process_manager.py answer-question \
  --process-dir ~/.claude/agentic-processes/active/api-design-20260512 \
  --question-id api_style \
  --answer "RESTful with HATEOAS constraints, JSON:API spec for responses"

# Agent satisfied with detailed answer
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/process_manager.py complete-question \
  --process-dir ~/.claude/agentic-processes/active/api-design-20260512 \
  --question-id api_style

python3 ${CLAUDE_PLUGIN_ROOT}/scripts/process_manager.py complete-session \
  --process-dir ~/.claude/agentic-processes/active/api-design-20260512
```

**Result**: answerHistory contains both iterations with timestamps.

---

### Example 3: Multiple Sessions in One Step

**Scenario**: Agent discovers new questions after initial Q&A.

```bash
# First session - initial requirements
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/process_manager.py create-session \
  --process-dir ~/.claude/agentic-processes/active/feature-impl-20260512 \
  --questions '[
    {
      "id": "q1",
      "topic": "Core Feature",
      "question": "Should the feature be synchronous or asynchronous?",
      "priority": "required",
      "context": "Affects architecture and user experience"
    }
  ]'

# User answers, session completes
# ... answer-question, complete-question, complete-session ...

# Agent begins implementation with "asynchronous" answer
# Agent discovers new ambiguity about queue backend

# Second session - follow-up questions
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/process_manager.py create-session \
  --process-dir ~/.claude/agentic-processes/active/feature-impl-20260512 \
  --questions '[
    {
      "id": "queue",
      "topic": "Queue Backend",
      "question": "Which queue backend should be used for async processing?",
      "priority": "required",
      "context": "First session determined async approach, now need queue choice",
      "options": ["Redis", "RabbitMQ", "AWS SQS"]
    }
  ]'

# User answers second session
# ... complete second session ...

# Agent continues with full context from both sessions
```

**Key Point**: Each session is independent. Memory preserves answers from all completed sessions for later reference.

---

## Integration with Other Skills

### process-state-update

- Q&A operations are implemented in `process_manager.py`
- Uses same state management patterns as other operations
- Q&A memory/log entries created via standard mechanisms

### Pending Interactions

- Cannot coexist with Q&A sessions
- Q&A takes priority (enforced by `block-pending-on-qa.sh` hook)
- Approval checkpoints must wait until Q&A session completed
- Prevents competing interaction types

### Memory System

- Completed Q&A sessions automatically create memory entries
- Memory entries include key questions and final answers
- Later steps can reference Q&A decisions from memory
- Cross-step decision continuity

---

## Technical Details

### File Structure

**qa-session.json** (created in process directory):
```json
{
  "createdAt": "2026-05-12T10:00:00Z",
  "questions": [
    {
      "id": "q1",
      "topic": "Database",
      "question": "Which database?",
      "priority": "required",
      "context": "Determines...",
      "options": ["PostgreSQL", "MySQL"],
      "status": "answered",
      "answerHistory": [
        {
          "iteration": 1,
          "answer": "PostgreSQL",
          "timestamp": "2026-05-12T10:30:00Z"
        }
      ]
    }
  ],
  "status": "partial"
}
```

### Schema Validation

- All Q&A structures validated against `types/schema.json`
- Type definitions: QASessionFile, QASessionQuestion, QuestionStatus, SessionStatus, AnswerIteration
- Invalid structures rejected by operations

### Operations Implementation

- **File**: `scripts/process_manager.py`
- **Subcommands**: create-session, answer-question, complete-question, complete-session, get-session
- **Returns**: JSON with `{"status": "ok", ...}` or `{"status": "error", "message": "..."}`

### Hooks

**check-qa-session.sh**:
- Runs before agent continues to next step
- Checks for qa-session.json with status 'pending' or 'partial'
- Blocks continuation if session incomplete
- Location: `hooks/`

**block-pending-on-qa.sh**:
- Runs before creating pending-interaction.json
- Checks for active qa-session.json
- Blocks pending interaction creation if Q&A active
- Location: `hooks/`

### Type Definitions

From `types/schema.json`:

- **QuestionStatus**: "unanswered" | "answered" | "refined" | "completed"
- **SessionStatus**: "pending" | "partial" | "completed"
- **QASessionQuestion**: id, topic, question, priority, context, options?, status, answerHistory
- **AnswerIteration**: iteration, answer, timestamp
- **QASessionFile**: createdAt, questions[], status

---

## Migration from Markdown Q&A

If you see references to `qa-session.md` component in step definitions:
- That was the old markdown-based approach
- Use this skill instead via operations
- Same conceptual workflow, better structure and UI support
- Markdown approach deprecated

---

## Important Rules

- **Never use Write/Edit** directly on `qa-session.json` — use operations only
- **Always check stdout** for operation success/error status
- **One session at a time** — complete current before creating new
- **Required questions must be answered** before session can be completed
- **Optional questions can be skipped** — mark them completed without answers if not needed
- **Full answer history preserved** — never delete or modify previous iterations
