Read and follow the instructions from: `.processes/prompts/process-continue.md`

Process path: $ARGUMENTS

## Subagent Delegation (Claude Code)

When the instructions reference delegating to subagents (`step-executor` or `process-spawner`), use the **Task tool**:

- **step-executor**: Use `Task` tool and provide the full content of `.cursor/agents/step-executor.md` as the prompt, along with operating principles, step JSON, process context, and scope boundary.
- **process-spawner**: Use `Task` tool and provide the full content of `.cursor/agents/process-spawner.md` as the prompt, along with template path, parameters, and parent context.
