---
name: process-new
description: Start a new process from a template. Triggers the process-spawner agent.
---

Read and follow the instructions from: `.processes/prompts/process-new.md`

## Subagent Delegation (Claude Code)

> **Note**: This section applies to Claude Code only. Cursor handles subagent delegation automatically.

When the instructions reference delegating to subagents (`process-spawner` or `step-executor`), use the **Task tool** to spawn a subagent:

- **process-spawner**: Use `Task` tool and provide the full content of `agents/process-spawner.md` as the prompt, along with the template path, parameters, and parent context.
- **step-executor**: Use `Task` tool and provide the full content of `agents/step-executor.md` as the prompt, along with the step definition, process context, and step number.
