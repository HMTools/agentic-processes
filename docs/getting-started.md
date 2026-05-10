# Getting Started with Agentic Process System

This guide will help you get started with the Agentic Process System, from installation to creating your first process.

## Prerequisites

- Claude Code
- Basic understanding of markdown files
- Familiarity with workflow management concepts

## Installation

### Option 1: Plugin Marketplace (Recommended)

```bash
claude plugin install agentic-processes
```

### Option 2: Local Plugin Directory

For development or customization, use the plugin directory flag:

```bash
claude --plugin-dir /path/to/agentic-processes
```

### After Installation

After installing the plugin, sync templates from configured git sources:
```
/process-template-sync
```

This fetches process and step templates to `~/.claude/agentic-processes/templates/` and creates all required runtime directories (`active/`, `completed/`, `failed/`, `flags/`, `guidelines/`, etc.).

## Your First Process

### Step 1: Invoke Process Creation

In Claude Code, type:
```
/process-new
```

### Step 2: Select a Template

The system will display available templates. For example:
- `develop-user-story` - End-to-end user story implementation
- `integration-test-fix` - Fix failing integration tests
- `set-concept` - Establish a new concept/pattern

Select the template that matches your task.

### Step 3: Provide Parameters

The system will ask for required parameters. For example, for `develop-user-story`:
- `userStoryTitle`: "User Authentication"
- `userStoryDescription`: "Implement login functionality"
- `acceptanceCriteria`: "User can log in with email and password"

Provide the requested information.

### Step 4: Process Created

The system will:
1. Resolve all step references
2. Substitute all parameters
3. Create process instance in `~/.claude/agentic-processes/active/process-{name}-{YYYYMMDD}/`
4. Display the process with steps ready to execute

### Step 5: Begin Work

The process is ready. The system will highlight the first step and offer to begin working immediately.

## Understanding Process Structure

### Process File (`process.json`)

The primary state file contains:
- Process metadata (name, template, status)
- Current state (active step, current action)
- All steps with status tracking
- Parameters

### Process Documentation (`process.md`)

User-readable workflow documentation with:
- Process description
- Flow diagram
- Step details
- Notes and audit log

### Memory File (`memory.json`)

Stores information shared across steps:
- Information produced in each step
- Decisions made
- Files created/modified
- Notes and context

### Log File (`log.json`)

Automatically maintained execution log:
- Detailed action history
- User interactions
- Challenges encountered
- Time tracking

## Working with Processes

### Completing Steps

As you work through steps:
1. Follow the step guidance
2. Complete the substeps
3. Mark the step complete when done
4. The system automatically updates state and audit log

### Resuming a Process

To continue a process:
```
/process-continue
```

The system will:
1. List all active processes
2. Show current progress
3. Resume from the last incomplete step

### Process States

Processes can be in three states:
- **Running**: Currently active, in `~/.claude/agentic-processes/active/`
- **Completed**: Finished successfully, moved to `~/.claude/agentic-processes/completed/`
- **Failed**: Encountered errors, moved to `~/.claude/agentic-processes/failed/`

## Key Concepts

### Templates

Templates define reusable workflows:
- Use parameter placeholders: `{{paramName}}`
- Reference steps: `@step:category/step-name`
- Include flow diagrams
- Define sequential steps

Templates are synced to `~/.claude/agentic-processes/templates/processes/{category}/` from configured git sources.

### Steps

Steps are modular building blocks:
- Self-contained definitions
- Rich guidance and examples
- Flow diagrams for complex steps
- Substeps for detailed breakdown

Steps are synced to `~/.claude/agentic-processes/templates/steps/{category}/` from configured git sources.

### Step References

Templates reference steps using unified syntax:
```markdown
- **Step**: `@step:api/implement-controller-layer`
- **Step**: `@step:my-category/my-custom-step`
```

## Common Workflows

### Feature Development

1. Create process from `develop-user-story` template
2. Provide user story details
3. System creates high-level plan
4. Review and approve plan
5. System creates detailed step plans
6. Execute implementation steps
7. Write tests
8. Update documentation
9. Complete process

### Bug Fix

1. Create process from `integration-test-fix` template
2. System diagnoses test failure
3. Implement fix
4. Verify test passes
5. Complete process

## Tips for Success

1. **Be Specific**: Provide detailed parameters for better process creation
2. **Review Steps**: Review expanded steps before starting work
3. **Use Memory**: Store important information in memory file
4. **Check State**: Review current state section to understand progress
5. **Follow Guidance**: Step guidance provides detailed instructions

## Setting Up Template Sources

Template sources are git repositories that provide process and step templates. The default configuration includes the official templates repo, but you can add custom sources.

### Viewing Configured Sources

Use `/process-template-sync` and choose "list sources" to see all configured template sources.

### Adding a Custom Source

Use `/process-template-sync` and choose "add source" to register a new git repository as a template source. Provide:
- **name**: A short identifier for the source
- **url**: The git clone URL
- **branch**: The branch to track (default: `main`)
- **priority**: Lower number = higher priority when resolving conflicts

### Syncing Templates

Run `/process-template-sync` periodically to fetch the latest templates from all enabled sources.

## Next Steps

- Read [Architecture Guide](architecture.md) for system details
- Check [Examples](examples.md) for more use cases
- Explore templates by running `/process-template-sync` then browsing `~/.claude/agentic-processes/templates/`

## Getting Help

If you encounter issues:
1. Check the process's log.json for execution history
2. Review memory.json for context
3. Check the process.json for current state
4. Consult the documentation files

---

**Ready to create your first process?** Type `/process-new` to get started!
