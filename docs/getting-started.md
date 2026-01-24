# Getting Started with Agentic Process System

This guide will help you get started with the Agentic Process System, from installation to creating your first process.

## Prerequisites

- Cursor IDE or GitHub Copilot Chat
- Basic understanding of markdown files
- Familiarity with workflow management concepts

## Installation

The Agentic Process System uses a **multi-folder workspace** setup:

1. **Add the framework to your workspace:**
   - In Cursor/VS Code: File → Add Folder to Workspace
   - Add your project folder
   - Add the `agentic-processes` folder

2. **No manual setup required** - the `.user-processes/` directory is created automatically when you start your first process. Folders are created on-demand:
   - `active/` - created when a process starts
   - `completed/` - created when a process completes
   - `templates/`, `steps/`, etc. - created when you add custom resources

3. The system is ready to use - no additional installation required

## Your First Process

### Step 1: Invoke Process Creation

In Cursor IDE chat, type:
```
/process-new
```

Or in GitHub Copilot Chat:
```
/process-new
```

### Step 2: Select a Template

The system will display available templates. For example:
- `develop-user-story` - End-to-end user story implementation
- `integration-test-fix` - Fix failing integration tests

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
3. Create process instance in `.user-processes/active/process-{name}-{YYYYMMDD}/`
4. Display the process with steps ready to execute

### Step 5: Begin Work

The process is ready. The system will highlight the first step and offer to begin working immediately.

## Understanding Process Structure

### Process File (`process.md`)

The main process file contains:
- Process metadata (name, template, status)
- Current state (active step, current action)
- Description and parameters
- Process flow diagram
- All steps with checkboxes
- Errors & notes section
- Audit log

### Memory File (`memory.json`)

Stores information shared across steps:
- Information produced in each step
- Decisions made
- Files created/modified
- Notes and context

### Log File (`log.json`)

Automatically maintained execution log:
- Detailed action history
- Challenges encountered
- Learnings and insights
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
- **Running**: Currently active, in `.user-processes/active/`
- **Completed**: Finished successfully, moved to `.user-processes/completed/`
- **Failed**: Encountered errors, moved to `.user-processes/failed/`

## Key Concepts

### Templates

Templates define reusable workflows:
- Use parameter placeholders: `{{paramName}}`
- Reference steps: `@framework-step:category/step-name` or `@user-step:category/step-name`
- Include flow diagrams
- Define sequential steps

Templates are available from:
- **Framework**: `.processes/templates/{category}/`
- **User**: `.user-processes/templates/{category}/`

### Steps

Steps are modular building blocks:
- Self-contained definitions
- Rich guidance and examples
- Flow diagrams for complex steps
- Substeps for detailed breakdown

Steps are available from:
- **Framework**: `.processes/steps/{category}/`
- **User**: `.user-processes/steps/{category}/`

### Step References

Templates reference steps using explicit prefixes:
```markdown
- **Step**: `@framework-step:api/implement-controller-layer`  # Framework step
- **Step**: `@user-step:my-category/my-custom-step`           # User step
```

The prefix makes it clear where each resource comes from.

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

## Next Steps

- Read [Architecture Guide](architecture.md) for system details
- Check [Examples](examples.md) for more use cases
- Review [Core System](../core/README.md) documentation
- Explore [Templates](../.processes/templates/README.md) and [Steps](../.processes/steps/README.md)

## Getting Help

If you encounter issues:
1. Check the process's Errors & Notes section
2. Review the audit log for action history
3. Check the log file for detailed execution history
4. Consult the documentation files

---

**Ready to create your first process?** Type `/process-new` in Cursor or GitHub Copilot Chat!

