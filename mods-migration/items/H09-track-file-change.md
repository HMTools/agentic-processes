# H09 · track-file-change

> Status and result live in `../progress.html` (entry `H09`). Read `../README.md` first, then `../shared/mods-docs-reading-list.md`.

## 1. Context (no previous knowledge needed)
`agentic-processes` is a Claude Code plugin that runs resumable workflows ("processes") from templates, with state as JSON under `~/.claude/agentic-processes/active/<process>/`. `process.json` holds `currentState.activeStep`, which can list the files the step changed (`filesChanged`), shown in the UI app. This item, `scripts/track-file-change.sh`, is a `PostToolUse` hook that records every Write/Edit into that list. It is an observer, not a guard. `process_manager.py` is the only supported writer of process state, so the hook shells out to it. Related: H08 (runs just before it, binds the session), C01 (session lookup), H06.

## 2. What exists today
- Wiring: `hooks/hooks.json:65-81`. Event `PostToolUse`, matcher `Write|StrReplace|Edit`, second hook after `bind-session-to-process.sh`.
- Script `scripts/track-file-change.sh` (48 lines):
  - Parses `session_id tool_name file_path` (`:8`). Empty session or file path: print `{}`, exit 0.
  - Session lookup (`:16-26`): loops over `~/.claude/agentic-processes/active/*/.session`, compares with whitespace trimmed (`tr -d '[:space:]'`). No match: `{}`, exit 0.
  - `OPERATION` (`:34-38`): the `case` assigns `"edited"` in every branch, so Write (a create or overwrite), Edit and StrReplace all record `edited`. The case statement is effectively dead logic; the field cannot distinguish "created" from "modified".
  - Runs `python3 process_manager.py track-file-change --process-dir D --file-path P --operation edited --tool T >/dev/null 2>&1` (`:41-45`). Output and errors are discarded; failure is silent. Always prints `{}`, exit 0. The comment says "fire-and-forget", but the call is **synchronous** (no `&`), so each Write/Edit waits for two Python startups (the parser and the manager).
- Python side: `scripts/process_manager.py:618-648` `cmd_track_file_change`: reads `process.json`, builds a `FileChange(path, operation, tool, timestamp)`, creates `activeStep.filesChanged` if None, **upserts by path** (same path replaces the earlier entry, so history of repeated edits and the first-created timestamp are lost), writes `process.json` back. `track-file-change` is not in `_LOG_GATED_COMMANDS` nor `_APPROVAL_GATED_COMMANDS` (`process_manager.py:1735-1749`), so it works even while a log or approval is pending. `cmd_update_current_state` copies `filesChanged` over when the same step id continues (`:574-587`) and resets it for a new step id.
- Write safety: `scripts/models.py:986-992` `write_json` writes a temp file and `os.replace`s it (atomic file), but the read-modify-write sequence has no lock. Two writers at once (this hook and a `process_manager.py` call by the agent, or by a parallel subagent) can lose one update. Not verified how often this happens.
- What gets tracked: every Write/Edit by the bound session, **including edits to the process's own state files** (`process.json`, `log.json`, memory files) and to files unrelated to the process (the path can be anywhere), and Writes by subagents (same `session_id`) such as the step-executor. Paths are recorded exactly as given (absolute or relative as Claude passed). `MultiEdit`, `NotebookEdit`, and files changed through Bash (`sed -i`, `git`, build tools) are not tracked. `StrReplace` is probably not a real Claude Code tool name (not verified).
- Edge: the tool might have failed; `PostToolUse` fires after a successful tool call (per `docs/claude/claude-code-hooks-reference.md`), failures go to `PostToolUseFailure`, so failed edits are not tracked.
- State: reads `.session`; writes `process.json` (via the CLI). UI reads `filesChanged` from `process.json`; the type is in `types/process-instance.ts` / `types/schema.json` (search `filesChanged`).

## 3. First guess (step 3, not final)
- Verdict: replace
- Why: it is a pure observer of a tool call result, which is what `tool.call` with `await next(e)` is for. A mod avoids two Python starts per edit, can see whether the tool succeeded (`result.isError`, `result.deny`) and can tell Write (create) from Edit if the tool input allows. The JSON schema stays the same, so the UI is unaffected, but who writes it must be decided: calling `process_manager.py` via `$.process.run` keeps it "the only writer"; writing the JSON from the mod would break that rule.
- Mod abilities that might apply: `on('tool.call', { tool: ['Write','Edit','MultiEdit','NotebookEdit'] }, async ($, e, next) => { const r = await next(e); ... return r })`; `classic.PostToolUse` (same JSON as the settings hook); `e.file_path`; `$.session.id()`; `$.process.run(['python3', ..., 'track-file-change', ...])` (30 s limit); `$.fs.read/write` (non-atomic write); `$.store` for a per-process queue to batch writes; `$.clock.after`/`every` to debounce; `agentId` on the event to tell subagent writes.

## 4. Research questions
1. Does `tool.call` with `await next(e)` reliably run **after** a successful Write/Edit, and can the hook tell success from failure and denial (`result.isError`, `result.deny`)? Is that equal to the settings `PostToolUse` condition?
2. What fields does the `tool.call` event expose for Write/Edit/MultiEdit/NotebookEdit (docs say arguments are fields of `e`, such as `e.file_path`)? Can a mod tell file creation from overwrite so `operation` can be `created` or `edited`?
3. Which write path should a mod use: `$.process.run` to `process_manager.py` (keeps the single-writer rule, costs one Python start per edit), or direct `$.fs` JSON edit (faster but breaks the rule and has a race)? What does `$.fs.write` non-atomicity mean for `process.json`?
4. Does the hook time limit (10 s, not counting time in `next` or a mods API call) and the 30 s `$.process.run` limit matter here? What happens to a slow call: does the edit wait?
5. Does `tool.call` fire for subagent Writes with `agentId`, and should they be tracked against the parent process's active step as today?
6. Can a mod track more than the hook does (Bash file changes, MultiEdit, NotebookEdit)? Is that wanted, or does it change what `filesChanged` means for the UI and for the `end-process-validation` step?
7. Does ordering with H08 matter (bind first, then track)? In one mod there is one `tool.call` hook per matcher, so how are two jobs combined, and what if the process is bound by the same call?
8. If mods are off (X01), the settings hook must remain as fallback. Can both run without double-recording (the upsert makes it idempotent by path; verify)?

## 5. How to research
1. Re-read these mods docs pages (see `../shared/mods-docs-reading-list.md`):
   - https://code.claude.com/docs/en/plugins/mods/events#guard-or-change-a-tool-call (the `.mdx` logging example is almost exactly this job: `const result = await next(e)`, check `!result.deny && !result.isError`, use `e.file_path`)
   - https://code.claude.com/docs/en/plugins/mods/events#handle-the-settings-hook-events (`classic.PostToolUse`)
   - https://code.claude.com/docs/en/plugins/mods/api#reach-files-processes-and-the-network (`$.process.run`, `$.fs`) and `#run-work-in-the-background` (`$.clock`)
   - https://code.claude.com/docs/en/plugins/mods/reference#events (Tools table) and `#limits`
   - https://code.claude.com/docs/en/plugins/mods/events#handle-a-hook-that-fails (an observer should fail open: no `.catch` needed; confirm)
2. Search the type file for: `ToolCallInput`, `ToolCallResult`, `isError`, `file_path`, `agentId`, `ProcessApi`, `run(`, `PostToolUseInput`, `FsApi`.
3. Read these repo files: `scripts/track-file-change.sh`, `scripts/process_manager.py:618-648` and `:565-600` and `:1735-1760`, `scripts/models.py:986-992`, `types/process-instance.ts` (search `filesChanged`), `../agentic-processes-ui` (grep `filesChanged`), `framework-steps/end-process-validation/end-process-validation.json` (does any check use `filesChanged`?).
4. Compare with: `PostToolUse` settings hook (after success, shell+Python, silent failure, synchronous) versus `await next(e)` in a mod (in-process, result visible); exit code semantics do not apply (observer); ordering with H08; time limits; failure behaviour (silent skip versus mod hook skip).
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
Edit `../progress.html`: find the object with `"id": "H09"` between `/* ITEMS:START */` and `/* ITEMS:END */` and set:
- `status`: `"done"` (or `"blocked"` with the reason in `summary`)
- `verdict`: the final verdict
- `summary`: 1–3 sentences
- `open`: list of open questions (empty list if none)
- `updated`: today's date `YYYY-MM-DD`
Do not change other entries. Then open the file in a browser and check your row.
