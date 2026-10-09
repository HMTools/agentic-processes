# H11 · check-qa-session

> Status and result live in `../progress.html` (entry `H11`). Read `../README.md` first, then `../shared/mods-docs-reading-list.md`.

## 1. Context (no previous knowledge needed)
`agentic-processes` is a Claude Code plugin that runs resumable workflows ("processes") from templates, with state as JSON under `~/.claude/agentic-processes/active/<process>/`. A "Q&A session" (skill `process-QnA-session`) lets a process ask the user structured questions; it lives in `qa-session.json` in the process folder until all required questions are answered and archived. This item, `scripts/check-qa-session.sh`, is a `UserPromptSubmit` hook meant to **block the agent from continuing** while a Q&A session is unfinished, and to print instructions for processing the answers. Related: H10 (the other `UserPromptSubmit` hook), H08, C01, and the `process-QnA-session` skill item.

## 2. What exists today
- Wiring: `hooks/hooks.json:93-108`. Event `UserPromptSubmit`, no matcher (always fires), second of two hooks (after `create-log-flag.sh`, H10).
- Script `scripts/check-qa-session.sh` (77 lines):
  - Parses `session_id` (`:10`); empty: `exit 0`. Session lookup (`:17-24`) as in the other scripts (raw equality on `.session`). No bound process: `exit 0`. No `qa-session.json` in that process dir: `exit 0` (`:30-34`).
  - Reads the file with an inline `python3 -c` that interpolates `$QA_FILE` into the code (`:37-52`). If `status == 'completed'` prints `completed`; otherwise lists questions whose own status is not `completed` as `id: topic (status)` joined by `; ` and prints `<status>|<summary>`. On any exception `sys.exit(1)` with no output (malformed file).
  - `completed` => `exit 0` (`:54-56`). Note: `cmd_complete_qa_session` deletes the file, so a file with status `completed` should not normally exist.
  - Otherwise prints a plain-text (not JSON) message on **stdout**: "Q&A Session active ... Process, status, incomplete questions, 4 steps with `process_manager.py get-qa-session / update-qa-answer / complete-qa-question / complete-qa-session`" (`:62-76`), then `exit 1` (`:77`).
  - A malformed file: `QA_INFO` is empty, so `QA_STATUS` and `QA_QUESTIONS` are empty and it still prints the message and exits 1.
- **Probable bug: the hook does not block.** The repo's hooks reference (`docs/claude/claude-code-hooks-reference.md:260-265`) says only exit code 2 blocks; "Other" exit codes (such as 1) are a non-blocking error whose stderr is shown in verbose mode and execution continues. The script prints to stdout and exits 1, so per that doc it neither blocks the prompt nor (since stdout from exit 0 only is added as context) clearly injects its text. The same doc (`:354-380`) says for `UserPromptSubmit`: exit 2 blocks and erases the prompt; plain stdout at exit 0 is added as context; `decision: "block"` blocks. So today this hook may be a **no-op**, and `skills/process-QnA-session/SKILL.md:314-318` claims it "enforces blocking". I have not run it; verify with the current Claude Code (this could be settled by a spike, or by reading the current hooks docs at https://code.claude.com/docs/en/hooks).
- Design tension: even if it blocked, `exit 2` on `UserPromptSubmit` erases the user's prompt, which would stop the user's answer from reaching Claude. The message tells Claude to process "the user's answers", which implies the prompt must get through. So the intended semantics seem to be "inject context, do not block", not a block. The intent is unclear; an answer to the Q&A session may arrive through the UI file watcher (`qa-session.json` updates, `../agentic-processes-ui/electron/fileWatcher.ts:77`, `main.ts:235`) rather than a typed prompt.
- Skill text also mentions `block-pending-on-qa.sh` (`skills/process-QnA-session/SKILL.md:322-326`), which **does not exist** in `scripts/` or `hooks.json`. So "no approval checkpoint while a Q&A is open" is documented but not implemented by any hook.
- Weaknesses: inline Python with an interpolated path (breaks on a quote in the path); question IDs are used in an f-string with `q['id']` (KeyError on a question with no id caught by `except` -> silent exit 1 path); no check of `status` values other than `completed`; it reads the file on every prompt; and the message is produced for every prompt including `/process-approve`.
- State: reads `active/*/.session`, `qa-session.json`. Writes nothing. Q&A state is written by `process_manager.py` `cmd_create_qa_session` (`:1264`), `cmd_update_qa_answer` (`:1323`), `cmd_complete_qa_question` (`:1376`), `cmd_complete_qa_session` (`:1419`, deletes the file after archiving to log and memory), `cmd_get_qa_session` (`:1507`).

## 3. First guess (step 3, not final)
- Verdict: replace
- Why: if the intent is "while a Q&A is open, tell Claude about it on each prompt and maybe refuse to continue", a `prompt.submit` mod can do both with a defined, documented result: `next({ ...e, context: [...] })` to add the instructions only Claude reads, or `{ drop: reason }` to refuse the prompt. It can read the file with `$.fs.read` and parse JSON in JS, with no shell. It can also watch the file or update when the CLI changes it. The current behaviour (exit 1) is probably wrong anyway, so replacing it fixes a bug; the plan must first decide what the right behaviour is.
- Mod abilities that might apply: `on('prompt.submit', ...)` with `context` or `{ drop }`; `$.fs.read`/`$.fs.exists`; `$.session.id()`; `$.ui.ask` or `$.ui.notice`/`$.ui.toast` to tell the user; a `$.ui` pane or band showing open questions (later UI round); `tool.call` `{ deny }` to stop work while a Q&A is open (what "block continuation" might really mean); `classic.Stop` `{ block }` to stop Claude ending its turn while questions are open; `$.command.register` for a `/qa` command; `$.clock.every` to watch the file.

## 4. Research questions
1. What does the current Claude Code do with a `UserPromptSubmit` command hook that prints text on stdout and exits 1? (Block, ignore, show as context, show as error?) Use the current hooks docs and, if needed, a spike. Is the hook effective today?
2. What was the intended behaviour: block the user's prompt, block Claude's actions, or only add instructions? Does `skills/process-QnA-session/SKILL.md` (lines about "Blocking Behavior") and the UI flow (answers arriving through UI file writes) suggest which?
3. For each candidate behaviour, what is the mod primitive and what does Claude or the user see: `prompt.submit` `context`, `prompt.submit` `{ drop: reason }` (is the drop reason visible to the user? 4,096 char limit), `tool.call` `{ deny }`, `classic.Stop` `{ block }`?
4. Can a `{ drop }` hook let the answer prompt through when it is the user's answer (how would the mod know)? What does `e.text` allow?
5. Can the mod read `qa-session.json` safely with `$.fs.read` (4 MiB, non-atomic writes by another process, partly written JSON) and handle a malformed file (fail open or closed)?
6. The skill mentions `block-pending-on-qa.sh`, which does not exist. Should the replacement also implement "no `pending-interaction.json` while a Q&A is open"? Where would that rule live (a `tool.call` deny on `write-pending`, or inside `process_manager.py`)? Coordinate with the Q&A skill item.
7. Is `qa-session.json` still the right state holder if the UI later moves into Claude Code (`$.ui` panes)? (Only note it; the UI round is later. The UI app reads this file today.)
8. Ordering with H10 in the same event: do two settings hooks on `UserPromptSubmit` run in parallel or in order, and in a mod are two jobs one `prompt.submit` hook (the same matcher may be registered only once per module)?

## 5. How to research
1. Re-read these mods docs pages (see `../shared/mods-docs-reading-list.md`):
   - https://code.claude.com/docs/en/plugins/mods/events#rewrite-or-add-to-a-prompt (the table: rewrite, add `context`, `drop`; the `drop` after `next` failure note)
   - https://code.claude.com/docs/en/plugins/mods/events#handle-a-hook-that-fails (`.catch` returning `{ drop }`)
   - https://code.claude.com/docs/en/plugins/mods/events#guard-or-change-a-tool-call and `#handle-the-settings-hook-events` (`classic.Stop` `block`)
   - https://code.claude.com/docs/en/plugins/mods/api#reach-files-processes-and-the-network (`$.fs`)
   - https://code.claude.com/docs/en/plugins/mods/reference#events (Prompts table; limits: `drop` reason 4,096 chars)
   - The settings hooks page https://code.claude.com/docs/en/hooks (`UserPromptSubmit` section: exit codes and output) to settle question 1.
2. Search the type file for: `PromptSubmitInput`, `PromptSubmitResult`, `drop`, `ClassicResult`, `UserPromptSubmit`, `Stop` (`block`, `stop_hook_active`), `FsApi`, `ui.notice`.
3. Read these repo files: `scripts/check-qa-session.sh`, `skills/process-QnA-session/SKILL.md` (esp. lines 90-110, 190-195, 305-335, 360-440), `scripts/process_manager.py:99-215` (QA validation helpers) and `:1264-1530`, `docs/claude/claude-code-hooks-reference.md:255-310,354-385`, `../agentic-processes-ui/electron/main.ts:474-480` and `fileWatcher.ts` (how the UI writes answers).
4. Compare with: exit 1 plus stdout (what the script does) versus exit 2 plus stderr versus JSON `decision: block` versus a mod's `context`/`drop`; fail-open on malformed file versus `.catch`; ordering with H10; time limits (10 s per hook; one file read is far below).
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
Edit `../progress.html`: find the object with `"id": "H11"` between `/* ITEMS:START */` and `/* ITEMS:END */` and set:
- `status`: `"done"` (or `"blocked"` with the reason in `summary`)
- `verdict`: the final verdict
- `summary`: 1–3 sentences
- `open`: list of open questions (empty list if none)
- `updated`: today's date `YYYY-MM-DD`
Do not change other entries. Then open the file in a browser and check your row.
