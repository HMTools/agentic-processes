Read and follow the instructions from: `.processes/prompts/process-new.md`

## Subagent Delegation (Claude Code)

When the instructions reference delegating to subagents (`process-spawner` or `step-executor`), use the **Task tool** to spawn a subagent:

- **process-spawner**: Use `Task` tool and provide the full content of `.cursor/agents/process-spawner.md` as the prompt, along with the template path, parameters, and parent context.
- **step-executor**: Use `Task` tool and provide the full content of `.cursor/agents/step-executor.md` as the prompt, along with the step definition, process context, and step number.
