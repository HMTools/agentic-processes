# H04 · block-tools-on-pending

> Status and result live in `../progress.html` (entry `H04`). Read `../README.md` first, then `../shared/mods-docs-reading-list.md`.

## 1. Context (no previous knowledge needed)
`agentic-processes` (v2.0.28) is a Claude Code plugin that runs structured, resumable workflows ("processes") with steps, approval gates and Q&A. Process state lives in JSON files under `~/.claude/agentic-processes/active/<process>/` (`process.json`, `log.json`, `pending-interaction.json`, `.session`). The plugin enforces its rules with shell hook scripts wired in `hooks/hooks.json`. Each script receives the hook JSON on stdin and answers with `{"decision":"block","reason":...}` on stdout or exit code 2 on stderr. This item is one of those enforcement pieces. The goal of the whole pack is to find out whether a Claude Code **mod** (JS/TS code running inside Claude Code, see the mods overview) can replace or improve it. The owner's bar: "a mod can do it".

## 2. What exists today
- Script: `scripts/block-tools-on-pending.sh` (66 lines). Wired in `hooks/hooks.json` under `PreToolUse`, in the **first group, which has no `matcher`** (so it runs for every tool call, including calls made by subagents, since the session id is the parent's; verify in the hooks reference). Other PreToolUse hooks (todo-tool block, log-first, the user-only approval guard) have their own matchers and run in addition.
- Parsing: `parse_hook_input.py session_id tool_name file_path command` (`:8`, see C01). `file_path` and `command` come from `tool_input`. Empty session id: allow.
- Lookup (`:15-23`): scan `active/*/.session` for the session id; `PENDING_FILE=<process dir>/pending-interaction.json`. No process or no pending file: allow (`:25-27`). `PROCESS_DIR` is also used later (`:57`, `:63`).
- When `pending-interaction.json` exists (an approval checkpoint is waiting for the user), everything is blocked **except**:
  1. Read-only tool names: `Read|Glob|Grep|ReadLints|SemanticSearch|View|LS` (`:32-36`).
  2. `Write|StrReplace|Edit` whose `file_path` matches `*process.json`, `*log.json`, `*memory.json`, `*/memory/*.json`, `*pending-interaction.json` or `*.approve-token` (`:39-45`). These are bash `case` globs on the path string; any file anywhere whose name ends in `process.json` or `log.json` passes.
  3. `Shell|Bash|PowerShell` whose command contains the substring `process_manager.py` anywhere (`:48-54`).
- Everything else: prints `{"decision":"block","reason":...}` (`:60-65`) with a long how-to-resolve message (read the pending file, delete it with `process_manager.py write-pending --delete`, call `update-step-status`). `STEP_ID` in the message comes from an inline Python (`:57`). Exit 0 (the decision JSON, not exit code 2, carries the block; sibling scripts such as the approval guard use exit 2 + stderr). The message is a bash heredoc, no JSON escaping.
- The whitelist names (`Shell`, `StrReplace`, `ReadLints`, `SemanticSearch`) look like Cursor-era tool names; real Claude Code tool names are `Bash`, `Edit`, `Write`, `Read`, `Glob`, `Grep`. `WebFetch`, `WebSearch`, `TodoWrite`, `Agent`/`Task`, MCP tools and `NotebookEdit` are **blocked** while a checkpoint is pending (whether intended is unknown). Blocking `Agent`/`Task` means no subagent can be spawned while pending.
- State: reads `active/*/.session`, `pending-interaction.json` (existence), `process.json` (`currentState.activeStep.id`). Writes nothing.
- Who creates / deletes the pending file: `process_manager.py` `cmd_write_pending` (`:1193-1250`; create after Q&A and approval/view checks; `--delete` at `:1197-1203`). The agent writes it at an approval step and deletes it after the user answers. The UI app also answers through it (see the UI items for the file contract).
- Weaknesses seen:
  - Bypass by substring: any Bash command containing `process_manager.py` is allowed, for example `echo process_manager.py; rm -rf x`, or a trailing `# process_manager.py`. The check is a glob on the whole command string, not a parse.
  - Same for file paths: `*process.json` allows a Write to `/tmp/evil-process.json`.
  - Only the first matching process is considered.
  - Name list is hard-coded and stale; a new read-only tool is blocked until someone edits the script.
  - Fails open on any parse error (empty `SESSION_ID` leads to `exit 0`).
  - The "allow Write to process files" lets the agent edit `process.json` directly, which `agents/step-executor.md:115` and the process-state-update skill forbid by convention only.

## 3. First guess (step 3, not final)
- Verdict: **replace**.
- Why: this is what `tool.call` with `{deny}` is for. A mod receives the structured tool name and input (no `python3 parse_hook_input.py | eval`), can match tools by name and by input, can read the pending file with `$.fs` or keep "checkpoint active" in `$.state`, and can return a typed deny with a message. It can also be stricter than substring globs (for example allow a Bash command only if it parses to `python3 .../process_manager.py <subcommand>` with `--process-dir` inside the bound process).
- Mod abilities that might apply: `tool.call` `{deny, reason}`, `tool.check`, `$.session.id()`, `$.fs`, `$.state` / `$.store`, `agentId` on the `tool.call` input (main agent versus subagent), `.catch` fail-closed guard, `$.tool`.

## 4. Research questions
1. What is the exact name and shape of the pre-tool event in the type file: `tool.call` input (tool name, input, `agentId`?) and result (`deny` with a reason? allow? rewrite input?). How does it compare with `classic.PreToolUse` (`PreToolUseResult`)? Which is the right replacement, and are both available in the installed Claude Code build?
2. Are tool names in a mod the same as the real Claude Code names (`Bash`, `Read`, `Write`, `Edit`, ...) and how do MCP tool names appear (so a whitelist or prefix rule works)?
3. Does `tool.call` fire for **subagent** tool calls, and does it carry `agentId` / session id so the rule can apply or be skipped per agent? Compare with `agent_id` in the settings-hook input.
4. When a `tool.call` handler returns `deny`, does the model see the reason text, can it be multi-line, any size limit?
5. What is the failure behaviour of a mod handler that throws or times out (fail open versus fail closed with `.catch`)? What is the time limit? The shell hook fails open on any error.
6. Are `tool.call` handlers of different mods and settings hooks run in a defined order, and does one `deny` stop the others? (Needed while `block-todo-tools.sh`, `enforce-log-first.sh` and the approval guard are still shell hooks.)
7. Can the mod read the "checkpoint pending" condition cheaply on every tool call (an `$.fs` existence check per call versus a cached `$.state` bit invalidated by a file watcher or by the `write-pending` command)? Is there an `$.fs.watch` or equivalent and a per-call cost budget?
8. Can the Bash allow rule be stricter than the substring (does the mod get the raw command string, any parse helper)? What should "allowed while pending" really be (product decision for a later plan)?

## 5. How to research
1. Re-read these mods docs pages (see `../shared/mods-docs-reading-list.md`):
   - https://code.claude.com/docs/en/plugins/mods/events , sections "Guard or change a tool call" (`tool.call`, `tool.check`, deny), "Handle a hook that fails" (`.catch` fail-closed), the order of mods and settings hooks, and `classic.PreToolUse`.
   - https://code.claude.com/docs/en/plugins/mods/reference , events table (tool.call and classic.PreToolUse rows) and Limits (time per hook).
   - https://code.claude.com/docs/en/plugins/mods/api , `$.fs`, `$.session`, `$.tool`, `$.store`.
   - https://code.claude.com/docs/en/plugins/mods/admin , what happens when mods are disabled (the guard disappears).
2. Search the type file for: `ToolCallInput`, `ToolCallResult`, `'tool.call'`, `'tool.check'`, `agentId`, `PreToolUseResult`, `permissionDecision`, `ClassicResult`, `deny`.
3. Read these repo files: `scripts/block-tools-on-pending.sh`, `hooks/hooks.json` (PreToolUse groups and matchers), `scripts/process_manager.py` `cmd_write_pending` (`:1193`), `agents/step-executor.md`, `skills/process-approve/SKILL.md`, and `docs/claude/claude-code-hooks-reference.md` (PreToolUse section: exit code 2, `decision: block`, `permissionDecision`).
4. Compare: settings hook (stdout `{"decision":"block"}` + exit 0 here; unconditional matcher; fails open) versus mod `tool.call` `{deny}` (typed result, `.catch` fail-closed, per-call cost, ordering with sibling PreToolUse hooks, matcher differences: this hook has no matcher, so the mod handler must match all tools incl. MCP).
5. Write the answer under "7. Research result". Related: see H03 (same-style flag), C01 (session lookup), X01 (mods disabled).

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
Edit `../progress.html`: find the object with `"id": "H04"` between `/* ITEMS:START */` and `/* ITEMS:END */` and set:
- `status`: `"done"` (or `"blocked"` with the reason in `summary`)
- `verdict`: the final verdict
- `summary`: 1–3 sentences
- `open`: list of open questions (empty list if none)
- `updated`: today's date `YYYY-MM-DD`
Do not change other entries. Then open the file in a browser and check your row.
