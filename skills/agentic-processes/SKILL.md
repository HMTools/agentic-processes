---
name: agentic-processes
description: Process automation framework for agentic coding environments. Use when starting, continuing, or managing structured workflows with state tracking, memory, and approval checkpoints.
---

# Agentic Processes Skill

## When to Use

Trigger this skill when the user wants to:
- Start a new process from a template
- Continue an existing process
- Check process status
- Work with structured workflows
- Execute multi-step tasks with state tracking

## Key Concepts

- **Process**: A structured workflow with defined steps, state tracking, and memory
- **Template**: A reusable process definition in `.processes/templates/`
- **Step**: An individual unit of work within a process
- **Memory**: Persistent context across steps in `memory.json`
- **Approval Checkpoint**: Steps requiring user approval before continuing

## Available Commands

- `/process-new` - Start a new process from a template
- `/process-continue` - Continue an existing process

## Process Templates

Templates are located in `.processes/templates/`. Each template defines:
- Process steps and their sequence
- Required and optional parameters
- Approval checkpoints
- Memory and logging structure

## Instructions

1. **To start a new process**: Use the `/process-new` command or ask to "start a process"
2. **To continue a process**: Use the `/process-continue` command with the process path
3. **Active processes**: Check `.user-processes/active/` for running processes
4. **Process state**: Each process has `process.json`, `memory.json`, and `log.json`

## File Locations

- Templates: `.processes/templates/`
- Active processes: `.user-processes/active/`
- Framework types: `.processes/types/`
- Commands (entry prompts): `commands/`
