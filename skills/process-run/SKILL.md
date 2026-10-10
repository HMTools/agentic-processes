---
name: process-run
description: Run the steps of a process that is bound to this session. Use it when the process pane (/process) hands you a process, or when a step of a process is next. Covers the step loop, approval checkpoints and sub-process steps.
---

# Process Run

The user started or resumed a process with the process pane (`/process`). The pane created or found the process, bound it to this session, and told you the folder, the parameters and the next step. Run the steps from there. Never work outside the process, and never start a process yourself: if the user wants another one, tell them to open `/process`.

All process files change only through the process tools (find them by tool search). Never edit `process.json`, `log.json` or memory files by hand.

## Mods off

Find the tool `create_process` by tool search before anything else. If no process tool exists, the mod is not loaded (an admin policy, a crash, an untrusted folder, or a rollout switch). Tell the user: "The process tools are not here, so mods are off in this session. I cannot change a process. Try /reload-plugins or ask your admin." Then stop. Do not edit process files by hand.

## Start

1. Call the tool `update_current_state` with the next step's `stepId`, `stepName` and a one-line `summary` of what you are about to do.
2. Go to the step loop. The pane's message lists every step with its id and status. Read `process.json` or a memory topic only when a step needs it.

## Step Loop

For each step in order, check its type:

**Regular step** (non-empty `stepDefinition`):
1. Call the tool `update_step_status` with `processDir`, `stepId` and `status: in_progress`. Do this BEFORE delegating. It tells the Stop hook a subagent works the step, so the hook does not block every turn.
2. Invoke the `step-executor-delegation` skill with the process directory and the step ID. Do NOT call the Agent tool for a step.
3. If the step has `approvalRequired: true`, follow Approval Checkpoints below.
4. Advance to the next step.

**Sub-process step** (`subProcessTrigger` AND empty `stepDefinition`): follow Sub-Process Steps below. Do NOT call `step-executor-delegation` for it. The step-executor cannot handle it.

`approvalRequired: true` means approval of the deliverables AFTER the step ran. Never ask permission before a step runs.

The last two steps of every process are framework steps (Continuous Improvement and Complete Process). Their definitions sit in `process.json` like any other step.

## Approval Checkpoints

A "yes" to a mid-step question (an assumption, a clarification, a suggested approach) is NOT approval of the deliverable. Typing "approved" in chat is not approval either. Ask a mid-step question with the built-in question tool, then record the answer with `log_interaction`.

1. Make sure the deliverable files are complete.
2. Present the deliverables to the user.
3. Call the tool `request_approval`. It shows a dialog and waits for the click. The answer is the result.
4. Log the user's answer with the tool `log_interaction`.
5. If the user approved, call `update_step_status` with status `completed`. If the user asked for changes, log the request, invoke `step-executor-delegation "<process-dir>" "<step-id>" "<user corrections>"`, present the new deliverables and call `request_approval` again. Repeat until the user approves.

Only the user's click sets `approved: true`. While the dialog waits, you can only research (read, search, MCP tools, subagents). If the user closes the dialog, it opens again with their next prompt.

## Sub-Process Steps

The step starts a child process. Drive the child yourself.

**A. Resolve.** Read `subProcessTrigger.template` (a UUID matching a template's `id`). Scan `~/.claude/agentic-processes/templates/processes/` for the template JSON with that `id`. In each value of `subProcessTrigger.parameters`, replace `{{paramName}}` with the value from the parent's `process.parameters`.

**B. Create the child.** Child folder: `~/.claude/agentic-processes/active/{child-name}-{YYYYMMDD}-{HHmmss}/`. Call the tool `create_process` with `templatePath`, `name` (the step name), `params`, `processDir`, `projectPath` (same as the parent), `parentProcessPath`, `parentId`, `parentName` (from the parent's `process.json`) and `returnToStep` (the UUID of the step after this one). The tool also binds the child to this session.

**C. Register the child.** Call the tool `register_child_process` with `processDir` (the parent folder), `childId`, `childName`, `childStatus: running`, `spawnedAtStep` and `syncPoint` (both the parent step's UUID for `syncPoint: "immediate"`) and `childProcessPath`.

**D. Drive the child's steps** with the step loop above, in the child folder. A child step can itself be a sub-process step.

**E. Complete.** Call `update_process_status` on the child with `status: completed` and a short `summary`. The child folder moves to `completed/` (use `relocated_to` from the answer), and the parent's `subProcessState` updates. Then mark the parent step completed and go on.

**Resuming a parent.** Read `subProcessState.childProcesses`. If a child is still `running`, report it and drive it before the parent's next step.
