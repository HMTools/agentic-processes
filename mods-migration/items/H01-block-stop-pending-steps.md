# H01 · block-stop-pending-steps (auto-advance)

> Status and result live in `../progress.html` (entry `H01`). Read `../README.md` first, then `../shared/mods-docs-reading-list.md`.

## 1. Context (no previous knowledge needed)
`agentic-processes` (v2.0.28) is a Claude Code plugin that runs structured, resumable workflows ("processes") with steps, approval gates and Q&A. Process state lives in JSON files under `~/.claude/agentic-processes/active/<process>/` (`process.json`, `log.json`, `pending-interaction.json`, `.session`). The plugin enforces its rules with shell hook scripts wired in `hooks/hooks.json`. Each script receives the hook JSON on stdin and answers with `{"decision":"block","reason":...}` on stdout or exit code 2 on stderr. This item is one of those enforcement pieces. The goal of the whole pack is to find out whether a Claude Code **mod** (JS/TS code running inside Claude Code, see the mods overview) can replace or improve it. The owner's bar: "a mod can do it".

## 2. What exists today
- Script: `scripts/block-stop-pending-steps.sh` (99 lines). Wired in `hooks/hooks.json` under `Stop`, third hook in the single matcher-less group (after `check-approval-stop.sh` and `enforce-log-on-stop.sh`). It is **not** on `SubagentStop` (header comment lines 1-4, so that step-executor subagents can return).
- Input parsing: line 10 calls `scripts/parse_hook_input.py session_id` (see C01). Empty session id: exit 0, allow (`:13-15`).
- Process lookup (`:17-26`): loops `~/.claude/agentic-processes/active/*/.session` and compares the file content to the hook's session id. No match or no `process.json`: allow.
- Allow conditions, in order: `pending-interaction.json` exists in the process dir (`:33-35`, the agent is at an approval checkpoint); process is not running, tested with `grep -qE '"status"\s*:\s*"running"'` on the whole `process.json` (`:38-40`).
- Block 1 (`:43-64`): if `grep` finds any `"status": "pending"` anywhere in `process.json`, a small inline Python finds the first step with status `pending` and the script prints `{"decision":"block","reason":...}` telling the main agent the next step number/name/id and to "delegate the next step to the step-executor subagent". Exit 0. The reason text is hand-spliced into a bash heredoc (step names with quotes or `\` would produce broken JSON).
- Block 2 (`:66-97`): no pending step, but a step with status `in_progress` and `startedAt` older than 600 s (hard-coded `:80`) is treated as an orphan from a crashed step-executor; blocks with a "re-delegate or mark failed" message. `startedAt` is set once by `process_manager.py` `cmd_update_step_status` (`:485-486`).
- Final fallback: exit 0 (allow).
- State read: `active/*/.session`, `process.json` (`status`, `steps[].status`, `steps[].startedAt`, `number`, `id`, `name`), `pending-interaction.json` (existence only). Writes nothing.
- Weaknesses seen:
  - Does **not** check `stop_hook_active` (compare H03, which does). If the agent cannot or will not continue, it is blocked forever; the only exits are completing steps or writing `pending-interaction.json`.
  - Whole-file `grep` for `"status": "running"` / `"pending"` matches any nested object (a step, a substep, a log text), not just the process or step status. The regex tolerates whitespace around the colon, but a status-like text inside any string value would false-match.
  - The 10-minute timer is a wall-clock guess. A legitimately long step-executor run (over 10 min) causes a false block; a crash within the first 10 min is not detected until the main agent tries to stop after that.
  - Process folder moves out of `active/` when status becomes `completed` or `failed` (`process_manager.py:994-1009`), after which the lookup fails and the hook allows stop. `paused` stays in `active/` but status is not `running`, so stop is allowed.
  - Fails open on any parse error (python errors are swallowed with `2>/dev/null`, `:52`, `:83`), which leaves an empty message in the block reason.
  - Session binding relies on `.session` being written by `bind-session-to-process.sh` (PostToolUse hook, see H-group) after the agent does `Write(.session, "")` (`skills/process-new/SKILL.md:81`, `skills/process-continue/SKILL.md:39`). A process that was never bound is never enforced.
- Related: H02 (`check-approval-stop`) and H03 (`enforce-log-on-stop`) run in the same Stop group; all three can block, and the model sees the combined reasons (verify how Claude Code merges them, see question 6).

## 3. First guess (step 3, not final)
- Verdict: **replace**.
- Why: a mod's `classic.Stop` hook can return `block` and its input carries `stop_hook_active` (README "Findings so far"). Inside a mod the session id, process lookup and state read are normal JS (no `eval`, no `grep` on JSON, no JSON-by-heredoc). `$.agent.list()` returns agent status (running, failed, killed) and can replace the 10-minute `startedAt` timer with a real signal.
- Mod abilities that might apply: `classic.Stop` `{block, reason}`, `stop_hook_active` on the input, `$.session.id()`, `$.fs` (read `process.json`), `$.agent.list()`, `$.store` / `$.state` (cache the process path for the session), `$.clock`.

## 4. Research questions
1. Does the `classic.Stop` input type carry `stop_hook_active`, `session_id` and (for a subagent) `agent_id`? What exactly does returning `block` with a `reason` do for the main agent's stop?
2. How does a mod tell a **main-agent** stop from a **subagent** stop? Is there a separate `classic.SubagentStop` event, and does `classic.Stop` fire for subagents? (Needed to keep the "Stop only, not SubagentStop" rule.)
3. What does `$.agent.list()` return (fields, status values, scope, does it include the finished or crashed step-executor)? Can it reliably say "the subagent for step X is dead" so the 600 s timer can be dropped?
4. Can a mod hold the `session id -> process dir` mapping itself (`$.store` or `$.state`) instead of scanning `.session` files? What survives `/clear`, `/resume`, restart? (Linked to C01.)
5. What is the time limit for a Stop hook and what happens on throw or timeout (fail open or fail closed, `.catch` guard)? Can reading `process.json` through `$.fs` stay well inside it?
6. When both settings hooks and mods are registered for the same Stop, what is the run order, and are multiple blocks merged or does the first win? (Matters for the mixed period where H02/H03 may still be shell scripts.)
7. Can the mod re-prompt (`block` reason) with the same text as today, and is there a way to return structured context (`additionalContext`, `stopReason`) instead of a shell-built JSON string?
8. If mods are off (`allowManagedModsOnly`, `--safe-mode`), the rule silently disappears. Can the settings-hook version stay as fallback in the same plugin without double blocking? (Link to X01.)

## 5. How to research
1. Re-read these mods docs pages (see `../shared/mods-docs-reading-list.md`):
   - Events: https://code.claude.com/docs/en/plugins/mods/events , sections "Guard or change a tool call" (for the pattern), the `classic.<Event>` section, "Handle a hook that fails" (fail-open vs `.catch` fail-closed), and the part about order of mods and settings hooks.
   - Reference: https://code.claude.com/docs/en/plugins/mods/reference , "events" table (Stop, SubagentStop rows), Limits (hook time limit).
   - API: https://code.claude.com/docs/en/plugins/mods/api , `$.agent`, `$.fs`, `$.session`, `$.store`.
   - Interface: https://code.claude.com/docs/en/plugins/mods/interface , "$.state vs $.store vs module variables" and state after `/clear`, `/resume`.
   - Admin: https://code.claude.com/docs/en/plugins/mods/admin (what happens when mods are off).
2. Search the type file (`claude-code.d.ts`, get it via the `plugin-authoring` skill; never read it whole) for: `ClassicResult`, `ClassicResultFields`, `ClassicResultOf`, `stop_hook_active`, `StopInput`, `SubagentStop`, `preventContinuation`, `stopReason`, `additionalContext`, `AgentInfo`, `agent.list`, `AgentStatus`.
3. Read these repo files: `scripts/block-stop-pending-steps.sh`, `hooks/hooks.json`, `scripts/parse_hook_input.py`, `scripts/process_manager.py` (`cmd_update_step_status` ~`:455`, status relocation `:994`), `skills/process-continue/SKILL.md` (how `.session` is bound), `docs/claude/claude-code-hooks-reference.md` (Stop / SubagentStop sections, lines ~530-570).
4. Compare: settings Stop hook (stdout JSON `decision: block`, exit 0, loop guard `stop_hook_active`, no time limit configured in `hooks/hooks.json`) versus mod `classic.Stop` (`block` result, hook time limit, `.catch` behaviour, ordering). Also compare "no loop guard here" with what a mod would need (a mod should probably bound re-blocks, for example with a counter in `$.state`).
5. Write the answer under "7. Research result".

## 6. Out of scope
No implementation. No plugin edits. No building a mod. (Only items S01–S03 may build a throwaway mod outside this repo.) Do not run or change the plugin's scripts.

## 7. Research result
_(empty until the research is done; fill each heading below.)_

### Claude Code version
_(output of `claude --version`)_

### Answers per question
_(one answer per question in section 4, each with evidence: doc page + section, type-file name, or repo file:line)_

### Final verdict
_(replace | improve | keep | later)_

### Evidence
### Open questions
### Risks
### What a later plan must decide

## 8. After the research: update the progress page
Edit `../progress.html`: find the object with `"id": "H01"` between `/* ITEMS:START */` and `/* ITEMS:END */` and set:
- `status`: `"done"` (or `"blocked"` with the reason in `summary`)
- `verdict`: the final verdict
- `summary`: 1–3 sentences
- `open`: list of open questions (empty list if none)
- `updated`: today's date `YYYY-MM-DD`
Do not change other entries. Then open the file in a browser and check your row.
