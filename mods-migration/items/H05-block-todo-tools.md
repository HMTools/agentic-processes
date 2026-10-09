# H05 · block-todo-tools

> Status and result live in `../progress.html` (entry `H05`). Read `../README.md` first, then `../shared/mods-docs-reading-list.md`.

## 1. Context (no previous knowledge needed)
`agentic-processes` is a Claude Code plugin that runs structured, resumable workflows ("processes") from templates. A process has steps, approval gates and Q&A. Process state lives as JSON files under `~/.claude/agentic-processes/active/<process>/`. The plugin enforces its rules with shell-script hooks wired in `hooks/hooks.json`. This item is one of them: `scripts/block-todo-tools.sh`, a `PreToolUse` hook that stops Claude from using Task/todo tools while a process is running, because "process steps are the task list". A mod (a Claude Code plugin whose JS/TS code runs inside Claude Code) might do the same job. Related items: C01 (the shared session lookup), H06, H07, H08, H09, H10, H11 (the other scripts in this group).

## 2. What exists today
- Wiring: `hooks/hooks.json:34-43`. Event `PreToolUse`, matcher `Task|TaskCreate|TaskUpdate`, command `bash ${CLAUDE_PLUGIN_ROOT}/scripts/block-todo-tools.sh`.
- Script: `scripts/block-todo-tools.sh` (51 lines).
  - Reads hook JSON on stdin, extracts `session_id` and `tool_name` with `scripts/parse_hook_input.py` (`block-todo-tools.sh:9`). Empty session id: exit 0 (allow) (`:12-14`).
  - `case "$TOOL_NAME"` lists `Task|TaskCreate|TaskUpdate|TaskGet|TaskList|TaskStop|TaskOutput`; anything else exits 0 (`:17-23`). Note the matcher in `hooks.json` only sends `Task`, `TaskCreate`, `TaskUpdate`, so `TaskGet`, `TaskList`, `TaskStop`, `TaskOutput` in the script's list can never arrive today (dead branches). Whether the hook matcher is a regex anchored on the whole name is not verified here.
  - Session lookup (`:25-33`): loops over `~/.claude/agentic-processes/active/*/.session` and compares file content to `session_id` with exact string equality (no whitespace trimming, unlike `track-file-change.sh:21` which trims). First match wins. This lookup is the one copied into 8 scripts (see C01).
  - No matching process, or no `process.json`: exit 0 (`:36-38`).
  - Blocking test (`:41`): `grep -qE '"status"[[:space:]]*:[[:space:]]*"running"' process.json`. This is a raw text grep over the **whole file**, not a JSON parse of the process-level status. Any key `"status": "running"` anywhere (a step, a nested object) would match. I did not verify which step status words are used (types/process-instance.ts shows `"status": "running"` in a doc example at line 28); treat as unknown.
  - If it matches, prints on **stdout** JSON `{"decision":"block","reason":"External todo tools are blocked during process execution — process steps are your task list"}` and exits 0 (`:42-48`). Otherwise exit 0.
- Paused processes stay in `active/` (`process_manager.py:993-998`, `STATUS_DIRS`: running and paused both map to `active`), so the status grep is what lets a paused process use todo tools. Completed and failed processes move out of `active/`, so the session lookup no longer finds them.
- State read: `active/*/.session`, `active/<p>/process.json`. State written: none.
- Related text: `framework-steps/end-process-validation/end-process-validation.json:34,97-100,188` checks "todo_write was not used" as a validation principle (an audit after the fact; it references `todo_write`, a tool name that is not in this hook's list).

Known weaknesses and open points:
1. Output format. The script blocks with top-level `decision: "block"` on stdout at exit 0. The repo's copy of the hooks reference (`docs/claude/claude-code-hooks-reference.md:300-310`) says `PreToolUse` uses `hookSpecificOutput.permissionDecision`, and lists top-level `decision` only for other events. Whether the current Claude Code still honours the old top-level form for PreToolUse is not verified here. If not, this hook is a silent no-op today. Needs a check (see question 1 and spike S01-S03 if one covers it).
2. The `Task` tool name. In Claude Code the subagent tool was called `Task` and is now called `Agent`; skills here say "Use the Agent tool" (`skills/process-continue/SKILL.md:193`, `skills/process-new/SKILL.md:232`) for non-step-executor subagents such as the process-spawner. If `Task` in the matcher also matches the Agent tool (or an alias), this hook would block spawning subagents while a process is running, which contradicts those skills. Not verified.
3. The matcher also appears for `Task` in `enforce-log-first.sh` (see H06).
4. Fail-open: any parse failure ends in exit 0.
5. Session lookup depends on `.session` having been bound (see H08). Without binding all enforcement hooks are silently off (`skills/process-continue/SKILL.md:44`).

## 3. First guess (step 3, not final)
- Verdict: replace
- Why: it is a pure "deny this tool when condition X" guard. A `tool.call` hook can return `{ deny: reason }` with a typed tool-name filter, and a mod can read the process state with `$.fs` or `$.store` and the session id from `$.session.id()`, so no shell, no Python, no grep.
- Mod abilities that might apply: `on('tool.call', { tool: ['Task','TaskCreate','TaskUpdate', 'TaskGet','TaskList','TaskStop','TaskOutput'] }, ...)` returning `{ deny }`; `$.session.id()`; `$.fs.read`/`$.fs.list` for `active/*/.session` and `process.json` (real JSON parse); `$.state`/module variable to cache which process the session is bound to; `agent.spawn` `{ deny }` (for blocking subagent spawn separately if `Task` means Agent); `tool.check` `{ decision: 'deny' }` as an alternative point; `.catch(...)` for fail-closed.

## 4. Research questions
1. What are the tool names that the mods docs and types use for the todo tools and for the subagent tool (`Task`, `Agent`, `TodoWrite`, `TaskCreate`...)? Does a `tool.call` matcher `{ tool: 'Task' }` match the subagent tool?
2. Does `tool.call` `{ deny: reason }` give Claude the reason text as the tool result, and is that equivalent to the script's `reason` message?
3. Does the `tool.call` event fire for a subagent's own calls (docs say yes) and does it carry `agentId`, so a mod could block todo tools only in the main conversation or only in subagents? Does the script today block subagent calls (same `session_id`)?
4. Can a mod get the session id inside `tool.call` (`$.session.id()` or a field on `e`) and is it the same id that the hook scripts write into `.session` (the settings-hook `session_id`)? Does it stay the same after `/clear`, `/resume`, compaction?
5. Does the current Claude Code honour top-level `{"decision":"block"}` from a `PreToolUse` shell hook? (If not, today's hook does nothing and "replace" fixes a bug.)
6. What happens when the hook is skipped (throws, times out, mods switched off by admin policy)? Is a `.catch` returning `{ deny }` the right fail-closed form, and should this guard fail closed at all (the script fails open)?
7. Ordering: settings `PreToolUse` hooks from the plugin's `hooks/hooks.json` run after the last mod calls `next`. If both stay installed, which wins and does a mod `deny` stop the script from running?
8. Should the matcher keep the dead names (`TaskGet`, `TaskList`, `TaskStop`, `TaskOutput`) or match only what is intended?

## 5. How to research
1. Re-read these mods docs pages (see `../shared/mods-docs-reading-list.md`):
   - https://code.claude.com/docs/en/plugins/mods/events#guard-or-change-a-tool-call (deny, `{ result }`, subagent calls)
   - https://code.claude.com/docs/en/plugins/mods/events#filter-which-events-a-hook-handles (matcher by tool name, array, regexp)
   - https://code.claude.com/docs/en/plugins/mods/events#where-settings-hooks-run-in-the-order and #handle-a-hook-that-fails (order, `.catch`)
   - https://code.claude.com/docs/en/plugins/mods/reference#events (Tools table, Subagents table `agent.spawn`) and `#limits`
   - https://code.claude.com/docs/en/plugins/mods/admin (what happens when mods are off while the settings hook keeps running; see X01)
2. Search the type file (`claude-code.d.ts`, see the reading list; never read it whole) for: `ToolCallInput`, `ToolCallResult`, `agentId`, `tool.call`, `agent.spawn`, `AgentSpawn`, and the list of built-in tool names (search `'Task'`, `'Agent'`, `TodoWrite`, `TaskCreate`).
3. Read these repo files: `scripts/block-todo-tools.sh`, `hooks/hooks.json:24-64`, `scripts/parse_hook_input.py`, `docs/claude/claude-code-hooks-reference.md` (PreToolUse section and exit code table), `skills/process-continue/SKILL.md:30-45,190-195`, `skills/process-new/SKILL.md:225-235`, `scripts/process_manager.py:990-1003`.
4. Compare the script with a mod hook: exit 0 plus JSON `decision` versus `{ deny }`; matcher string versus `{ tool }` filter; fail-open (script) versus `.catch` fail-closed; shell/python startup per call versus in-process; 60 s settings-hook default timeout (check the hooks reference) versus 10 s mod limit; the raw-text grep versus a parsed JSON read. Also compare what `session_id` means in a settings hook versus a mod.
5. Write the answer under "7. Research result".

## 6. Out of scope
No implementation. No plugin edits. (Only items S01–S03 may build a throwaway mod outside this repo.)

## 7. Research result
_(empty until the research is done)_

### Claude Code version
### Answers per question (1-8, each with evidence)
### Final verdict
### Evidence (doc page + section, type-file names, repo file:line)
### Open questions
### Risks
### What a later plan must decide

## 8. After the research: update the progress page
Edit `../progress.html`: find the object with `"id": "H05"` between `/* ITEMS:START */` and `/* ITEMS:END */` and set:
- `status`: `"done"` (or `"blocked"` with the reason in `summary`)
- `verdict`: the final verdict
- `summary`: 1–3 sentences
- `open`: list of open questions (empty list if none)
- `updated`: today's date `YYYY-MM-DD`
Do not change other entries. Then open the file in a browser and check your row.
