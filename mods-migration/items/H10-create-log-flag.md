# H10 · create-log-flag

> Status and result live in `../progress.html` (entry `H10`). Read `../README.md` first, then `../shared/mods-docs-reading-list.md`.

## 1. Context (no previous knowledge needed)
`agentic-processes` is a Claude Code plugin that runs resumable workflows ("processes") from templates, with state as JSON under `~/.claude/agentic-processes/active/<process>/`. One rule is "log first": every user message during a process must be written to `log.json` (an audit trail) before Claude changes anything. This item, `scripts/create-log-flag.sh`, is the `UserPromptSubmit` hook that raises the flag "a log entry is owed": it creates the empty file `~/.claude/agentic-processes/flags/pending-log-<session_id>`. Other parts read that flag and enforce the rule (H06 blocks edits, `enforce-log-on-stop.sh` blocks stopping, `process_manager.py` blocks state commands); `log-interaction` clears it. Related: H06, H11 (the other `UserPromptSubmit` hook), H08, C01.

## 2. What exists today
- Wiring: `hooks/hooks.json:93-108`. Event `UserPromptSubmit` (no matcher support; always fires), first of two hooks (the second is `check-qa-session.sh`, H11).
- Script `scripts/create-log-flag.sh` (35 lines):
  - Parses `session_id` (`:9`). Empty: print `{"continue": true}`, exit 0.
  - Session lookup (`:17-24`): scans `active/*/.session`, **raw** equality (no trim, so unlike `track-file-change.sh` a `.session` with extra whitespace would not match; `$(cat)` strips trailing newlines only).
  - If a process is bound: `mkdir -p flags` and `touch flags/pending-log-<session_id>` (`:26-32`). Prints `{"continue": true}`, exit 0 (`:34-35`).
  - It does **not** look at the prompt text, the process status (running, paused, waiting for approval, Q&A), or whether the prompt is a slash command. So `/process-approve`, `/apply-improvements`, a one-word "ok", or an answer to a Q&A question all create the flag. It touches an existing flag again (idempotent).
- Flag consumers: `scripts/enforce-log-first.sh:15-20` (H06); `scripts/enforce-log-on-stop.sh:21-22` (blocks stop unless `stop_hook_active`); `scripts/process_manager.py:219-246` `_check_pending_log` (gates `update-step-status`, `approve-step`, `update-current-state`, `update-active-substep`, `add-memory-entry`, `update-process-status`, `write-pending` at `:1735-1743`; the `write-pending --delete` is exempt at `:1751-1753`). Flag clearer: `cmd_log_interaction` unlinks it (`process_manager.py:894-901`). Note `approve-step` is log-gated: a UI-originated approval that calls `process_manager.py` directly is also blocked if the session's flag exists (the UI path was said to be hook-free, `skills/process-approve/SKILL.md:54`, but this CLI gate is not a hook; to verify).
- Edge cases and weaknesses:
  - The very first prompt in a new session happens before `.session` is bound (H08 binds on the first process write), so no flag on that prompt; the binding then arrives after the user message and that first interaction is never "owed".
  - The flag is never deleted on session end or process completion; stale `pending-log-*` files accumulate (nothing found that cleans them; not verified).
  - A prompt that the plugin itself injects (for example from the UI app resuming a session) also creates the flag, since the hook cannot tell the source.
  - The Python startup (`parse_hook_input.py`) happens on every prompt even without a process.
  - Unrelated sessions without a process pay the cost but are not affected.
- State: reads `active/*/.session`; writes `flags/pending-log-<session>`.

## 3. First guess (step 3, not final)
- Verdict: replace (together with H06, as one design)
- Why: a `prompt.submit` hook sees every submitted prompt and can set "log owed" in memory (`$.state` or a module variable) without any file. It can also look at `e.text` to skip slash commands, or add `context` that tells Claude about the obligation. It can decide using the process's real status and the session binding held in memory. But the file flag has other readers (CLI `_check_pending_log`, `enforce-log-on-stop.sh`), so the plan has to decide whether the flag file stays as the shared channel (the mod still touches it) or the readers change too.
- Mod abilities that might apply: `on('prompt.submit', ...)` with `next(e)`, `next({ ...e, context: [...] })`, `{ drop }`; `classic.UserPromptSubmit` (same JSON as the settings hook); `$.session.id()`; `$.fs.write` for the flag file (to keep file compatibility); `$.state`/`$.store`/module variable; `session.start`/`session.end`/`session.compact` for cleanup; `$.prompt.submit` (note: may itself fire `prompt.submit`; check).

## 4. Research questions
1. Does `prompt.submit` fire for exactly the same prompts as `UserPromptSubmit`? Check slash commands (built-in and `$.command.register`ed), pasted prompts, prompts queued during a turn, and prompts sent by `$.prompt.submit` (with and without `asUser`) from a mod.
2. What does `e` contain (`e.text`, any session id or source marker)? Can a mod tell a typed prompt from a prompt injected by the UI app launching `claude`, or by another mod?
3. Where should "log owed" live: `$.state`, `$.store`, a module variable, or the same flag file? Which survive `/clear`, `/resume`, `/branch`, compaction, and a Claude Code restart? Which must be visible to the CLI and to `enforce-log-on-stop.sh`?
4. Can `prompt.submit` `context` (text only Claude reads) make Claude log without any blocking hook, and is that dependable? Could the mod instead log the user's message itself (`$.process.run` of `log-interaction` with the prompt text as `--request`), removing the obligation altogether? Think about what the audit trail needs (the agent's reason and response are inputs of `log-interaction`).
5. Should the flag skip some prompts (slash commands, `/process-approve`, answers during Q&A, trivial replies)? What does `e.text` allow?
6. How should it behave when no process is bound yet (first prompt)? Could a mod bind at `session.start` or from `prompt.submit` so the first prompt is covered?
7. What are failure semantics: a `prompt.submit` hook that throws is skipped (fail-open) unless `.catch` returns `{ drop }`. Should this one fail open (as today)? Time limit 10 s; no limit problem expected.
8. If both the settings hook and the mod exist (admin fallback X01), is double flag creation harmless (touch is idempotent)?

## 5. How to research
1. Re-read these mods docs pages (see `../shared/mods-docs-reading-list.md`):
   - https://code.claude.com/docs/en/plugins/mods/events#rewrite-or-add-to-a-prompt (`prompt.submit`: rewrite, `context`, `drop`)
   - https://code.claude.com/docs/en/plugins/mods/events#handle-the-settings-hook-events (`classic.UserPromptSubmit`)
   - https://code.claude.com/docs/en/plugins/mods/events#handle-a-hook-that-fails
   - https://code.claude.com/docs/en/plugins/mods/interface#keep-state, `#keep-a-value-in-$-state`, `#save-from-more-than-one-session`
   - https://code.claude.com/docs/en/plugins/mods/api#start-a-turn-from-a-background-job (`$.prompt.submit`, `asUser`) and `#send-and-receive-messages-between-sessions`
   - https://code.claude.com/docs/en/plugins/mods/reference#events (Prompts table, Session table) and `#limits`
2. Search the type file for: `PromptSubmitInput`, `PromptSubmitResult`, `drop`, `context`, `asUser`, `UserPromptSubmit`, `session.id`, `session.end`.
3. Read these repo files: `scripts/create-log-flag.sh`, `scripts/enforce-log-first.sh`, `scripts/enforce-log-on-stop.sh`, `scripts/process_manager.py:219-246,858-905,1735-1760`, `skills/process-state-update/SKILL.md` and `skills/process-QnA-session/SKILL.md` (how Claude is told to log), `docs/claude/claude-code-hooks-reference.md` (UserPromptSubmit section).
4. Compare with: `UserPromptSubmit` stdout/JSON (`{"continue": true}`) versus `next(e)`; exit-code semantics (exit 2 blocks and erases the prompt) versus `{ drop }`; no matcher in both; ordering with H11 inside the same event; file flag versus in-memory; time limits.
5. Write the answer under "7. Research result". Decide together with H06.

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
Edit `../progress.html`: find the object with `"id": "H10"` between `/* ITEMS:START */` and `/* ITEMS:END */` and set:
- `status`: `"done"` (or `"blocked"` with the reason in `summary`)
- `verdict`: the final verdict
- `summary`: 1–3 sentences
- `open`: list of open questions (empty list if none)
- `updated`: today's date `YYYY-MM-DD`
Do not change other entries. Then open the file in a browser and check your row.
