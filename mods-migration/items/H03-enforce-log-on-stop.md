# H03 · enforce-log-on-stop

> Status and result live in `../progress.html` (entry `H03`). Read `../README.md` first, then `../shared/mods-docs-reading-list.md`.

## 1. Context (no previous knowledge needed)
`agentic-processes` (v2.0.28) is a Claude Code plugin that runs structured, resumable workflows ("processes") with steps, approval gates and Q&A. Process state lives in JSON files under `~/.claude/agentic-processes/active/<process>/` (`process.json`, `log.json`, `pending-interaction.json`, `.session`). The plugin enforces its rules with shell hook scripts wired in `hooks/hooks.json`. Each script receives the hook JSON on stdin and answers with `{"decision":"block","reason":...}` on stdout or exit code 2 on stderr. This item is one of those enforcement pieces. The goal of the whole pack is to find out whether a Claude Code **mod** (JS/TS code running inside Claude Code, see the mods overview) can replace or improve it. The owner's bar: "a mod can do it".

## 2. What exists today
- Script: `scripts/enforce-log-on-stop.sh` (47 lines). Wired in `hooks/hooks.json` on `Stop` only (second hook of the group). Not on `SubagentStop` (header `:3-4`).
- It is the **second half of a pair**. The first half is `scripts/create-log-flag.sh` (35 lines), wired on `UserPromptSubmit` (first hook). That script finds a process whose `.session` equals the session id (`create-log-flag.sh:19-24`) and, if found, runs `mkdir -p flags` and `touch ~/.claude/agentic-processes/flags/pending-log-<session_id>` (`:26-32`). Output `{"continue": true}`. So **every user prompt** in a session bound to a process creates the flag.
- The flag is cleared only by `process_manager.py log-interaction` (`cmd_log_interaction:858-904`; the clearing part `:894-901` reads `.session` and unlinks the flag). Nothing else deletes it (no SessionEnd cleanup; stale flags for dead sessions stay on disk).
- Stop behaviour (`enforce-log-on-stop.sh`): parse `session_id` and `stop_hook_active` (`:9`, see C01; `parse_hook_input.py:38-40` returns `"true"` only for a JSON `true`). Empty session id: allow. `stop_hook_active == true`: allow (`:16-19`, the loop guard, so the agent is blocked at most once per turn). No flag file: allow. Flag exists: scan `.session` files to find the process dir and read `currentState.activeStep.id` (`:31-39`) only to put them into the message, then print `{"decision":"block","reason":...}` with a ready `process_manager.py log-interaction ... --request ... --reason ... --response ...` command (`:41-46`). The block message is a bash heredoc; the process dir and step id are spliced in without JSON escaping.
- Related enforcement of the same flag (same rule, three places):
  - `scripts/enforce-log-first.sh` (PreToolUse on `Write|StrReplace|Edit|Task`, see its own item) blocks write tools while the flag exists unless the Bash command contains `process_manager.py` (`enforce-log-first.sh:14-30`).
  - `process_manager.py` `_check_pending_log` (`:219-245`) refuses state-mutating CLI commands while the flag exists (`_LOG_GATED_COMMANDS`, call at `:1750-1752`; `write-pending --delete` is exempt).
  - So the flag is a cross-script protocol: UserPromptSubmit writes, three readers, one clearer (CLI).
- State: reads `flags/pending-log-<session>`, `active/*/.session`, `process.json`. Writes nothing.
- Weaknesses seen:
  - Flag is per session and set on **every** prompt, including prompts that need no log (a "thanks", a slash command, an approval click). The agent is forced to write a log entry for each.
  - Cross-script file protocol: flag path is hard-coded in 4 places (`create-log-flag.sh:30`, `enforce-log-on-stop.sh:22`, `enforce-log-first.sh:14`, `process_manager.py:227` and `:899`).
  - If the CLI crashes after writing `log.json` but before unlinking the flag, or the `.session` file is empty/changed, the flag cannot be cleared by the intended path (the agent is stuck unless it deletes the flag by hand, which hooks do not allow outside `process_manager.py`).
  - Stale flags are never garbage-collected.
  - Block reason text built by heredoc (quotes in a path would break JSON).
  - No time or turn-count awareness: the "turn" is implied by prompt-then-stop.

## 3. First guess (step 3, not final)
- Verdict: **replace**.
- Why: the flag file exists only to carry "a prompt arrived and no log yet" from a `UserPromptSubmit` hook to the next `Stop` hook and to two other readers. In a mod this is one in-memory value: set it in `prompt.submit` (or `classic.UserPromptSubmit`) with `$.state`/`$.store`, check it in `classic.Stop` and `tool.call`, clear it when the log-interaction command is seen (`tool.result`/`tool.call` of a Bash command, or a mod command). No file, no cleanup issue, per-session by construction. The prompt text is available to the mod, so it could also skip trivial prompts.
- Mod abilities that might apply: `prompt.submit` (or `classic.UserPromptSubmit`), `classic.Stop` `{block}` + `stop_hook_active`, `tool.call` `{deny}` (for the PreToolUse sibling), `$.session.id()`, `$.state` / `$.store`, `$.fs`, `$.process.run` (only if the mod still shells out to `log-interaction`), `$.command.register`.

## 4. Research questions
1. Does a mod get the **prompt text** and session id on `prompt.submit` (and is it before the model sees it)? Does it fire for slash commands and for UI-driven resumes, as `UserPromptSubmit` does today?
2. Where should the "log owed" bit live: `$.state` (per session, in memory, what happens on `/clear`, `/resume`, restart?), `$.store` (persisted, scope?), or a module variable? Which survives a `/resume` of the same session id?
3. Can a mod see that a `process_manager.py log-interaction` command ran successfully (the `tool.result` / `tool.call` event for Bash, with the command text and exit status), so it can clear the bit itself instead of relying on the CLI unlinking a file? Or must the CLI still clear a file the mod reads (then the file protocol stays)?
4. Does `classic.Stop` input carry `stop_hook_active`, and is it set on the second stop after a block, exactly as the shell script assumes? Is it true for a subagent's stop too?
5. Is `block` from a Stop mod hook sent back to the model as a user-visible reason? Can the mod return structured guidance (`additionalContext`) rather than a heredoc string?
6. Can a mod decide that a prompt does not need a log (for example by checking the prompt against a rule) and avoid forcing a log entry on every prompt? Is that desired (product decision for a later plan)?
7. Time limit and failure mode for a `classic.Stop` hook; can a thrown error leave the user stuck (fail closed) or release them?
8. If the CLI `_check_pending_log` (`process_manager.py:219`) must keep working for plain-terminal use outside a mod, what is the contract between mod and CLI (shared flag file kept, or CLI check dropped)? This decides whether the flag file can really disappear.

## 5. How to research
1. Re-read these mods docs pages (see `../shared/mods-docs-reading-list.md`):
   - https://code.claude.com/docs/en/plugins/mods/events , sections on `prompt.submit`, `classic.<Event>` (Stop, UserPromptSubmit), "Guard or change a tool call", "Handle a hook that fails".
   - https://code.claude.com/docs/en/plugins/mods/interface , section on `$.state` vs `$.store` vs module variables, and state after `/clear` and `/resume`.
   - https://code.claude.com/docs/en/plugins/mods/api , `$.session`, `$.store`, `$.fs`, `$.process.run`.
   - https://code.claude.com/docs/en/plugins/mods/reference , events table (prompt.submit, tool.result, Stop rows) and Limits.
2. Search the type file for: `PromptSubmitInput`, `prompt.submit`, `UserPromptSubmit`, `StopInput`, `stop_hook_active`, `ClassicResult`, `ToolResultInput`, `tool.result`, `StateApi`, `StoreApi`, `session.id`.
3. Read these repo files: `scripts/enforce-log-on-stop.sh`, `scripts/create-log-flag.sh`, `scripts/enforce-log-first.sh`, `scripts/process_manager.py` (`_check_pending_log` `:219`, `cmd_log_interaction` `:858`, gating sets near `:1735-1754`), `scripts/parse_hook_input.py`, `hooks/hooks.json`, `skills/process-state-update/SKILL.md` (how the agent is told to log).
4. Compare: file-flag protocol (UserPromptSubmit creates, Stop/PreToolUse/CLI read, CLI clears) versus a mod-held bit (set on `prompt.submit`, read in `classic.Stop` and `tool.call`). Check exit-code/JSON behaviour versus `{block}`/`{deny}` and the loop guard (`stop_hook_active`).
5. Write the answer under "7. Research result". Related: see H01, H02, H04, C01, and the item for `enforce-log-first.sh`.

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
Edit `../progress.html`: find the object with `"id": "H03"` between `/* ITEMS:START */` and `/* ITEMS:END */` and set:
- `status`: `"done"` (or `"blocked"` with the reason in `summary`)
- `verdict`: the final verdict
- `summary`: 1–3 sentences
- `open`: list of open questions (empty list if none)
- `updated`: today's date `YYYY-MM-DD`
Do not change other entries. Then open the file in a browser and check your row.
