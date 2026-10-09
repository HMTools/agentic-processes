# P11 · Step status shown in the session

> Status and result live in `../progress.html` (entry `P11`). Read `../README.md` first, then `../shared/mods-docs-reading-list.md`.

> **Note on scope**: this is a **new idea** with no existing code. It would use a small piece of the screen (one status line and/or a short toast). The owner has **not yet confirmed** it is part of this round. Research it so the owner can decide; do not assume a yes.

## 1. Context (no previous knowledge needed)
`agentic-processes` (v2.0.28) is a Claude Code plugin that runs resumable workflows ("processes") made of steps. While a process runs, the user sees only the chat. Which step is active, whether the step waits for approval, and how far along it is, is visible today only in the separate Electron UI app (`../agentic-processes-ui`) or by reading `process.json`. The idea: a mod shows "process X, step 3 of 7: Review plan (substep 2/5), awaiting approval" inside the Claude Code session with `$.ui.status` (a line under the prompt) and/or `$.ui.toast` (a short notice on step changes). The data already exists in `process.json`; the question is whether a mod can find the right process folder, read it, and refresh the line.

## 2. What exists today
**Data the mod would read** (`~/.claude/agentic-processes/active/<process>/process.json`, shape in `types/process-instance.ts`):
- `ProcessInstance` (`types/process-instance.ts:50-76`): `id`, `name` (`:58`), `status` (`:64`: `running | completed | failed | paused`, `types/process-status.ts:4`), `currentState` (`:70`), `steps[]`.
- `ProcessCurrentState.activeStep` (`:141-155`, `:161-164`): `id`, `name` (`:145`), `actionSummary` ("Brief summary of current action for UI status bars", `:147`), optional `actionDetails`, `totalSubsteps` (`:151`), optional `currentSubstep { number, name }` (`:114-119`, `:153`), optional `filesChanged`.
- `ProcessStep` (`:169-`): `number` (`:174`), `name` (`:177`), `status` (`:180`): `pending | in_progress | completed | skipped | awaiting_approval` (`types/process-status.ts:10`). The step total is `steps.length`.
- Approval wait: the file `pending-interaction.json` exists next to `process.json` while a checkpoint is open (`types/process-instance.ts:268-290`, `process_manager.py:249-262`, `:1193` `cmd_write_pending`).
- Who writes `activeStep`: `scripts/process_manager.py:557` `cmd_update_current_state`, `:596` `cmd_update_active_substep`, `:455` `cmd_update_step_status`, `:618` `cmd_track_file_change`. All write with the atomic `write_json` (`models.py:986-992`).

**How a process folder is found for a session** (there is no direct "current process" pointer):
- The process folder holds a `.session` file with the Claude session id. Eight hook scripts find "their" process by looping over `~/.claude/agentic-processes/active/*/.session` and comparing the content to the hook's `session_id` (for example `scripts/block-tools-on-pending.sh:15-17`, `scripts/check-qa-session.sh:17-19`, `scripts/track-file-change.sh:19`; listed in `../README.md`).
- The file is written by `scripts/bind-session-to-process.sh:4-30`, a PostToolUse hook that fires when the agent writes or edits any file inside an `active/<process>/` folder and `.session` is missing or empty. So a session is bound only after its first file write in the process folder, not at `process-new` start. A mod must handle "no binding yet".
- When a process finishes its folder moves from `active/` to `completed/` or `failed/` (`process_manager.py:994-1015`), so the mod must stop showing a line then.

**Mods surfaces** (from the live docs, Claude Code v2.1.290 reference):
- `$.ui.status(text)`: one line under the prompt that stays until changed; it starts with `⚠` and the mod's name, for example `⚠ my-mod: checks: 3 passing` (`mods/api#show-something-without-starting-a-turn`). The `⚠` is added by Claude Code; the text is unclear on whether it can be removed.
- `$.ui.toast(text)`: a notification with the mod's name that disappears after 4 seconds unless `{ timeoutMs }` is passed (`mods/reference#limits`). `$.ui.log(text)`: a dim transcript line Claude does not read.
- Other small options: the `Spinner` render site has a `suffix` prop (`mods/interface#change-what-claude-code-already-draws`, so a step name can follow the spinner word while Claude works); the band above the prompt (`AbovePrompt`, a bigger use of the screen, not part of this idea).
- Refresh: `$.clock.every(ms, fn)` (timer started in `session.start`), `$.ui.invalidate('ui.render')` (throttled to 10 redraws a second). There is **no** file-watch method in the `$` list (`$.fs` has `read`, `write`, `list`, `exists`, `stat`, `ancestors`), so the mod must poll, or react to events such as `classic.PostToolUse`.
- Where it shows: the terminal and the Code tab of the Desktop app; **not** the VS Code chat panel, **not** `claude -p` (`mods/overview#where-mods-run`). A status or toast on those surfaces is simply not drawn (to be confirmed for `$.ui.status` and `$.ui.toast` in the type file).

**Known weaknesses (step 3)**: no code exists yet; the `.session` binding is late; the mod depends on mods being on (see `X01`).

## 3. First guess (step 3, not final)
- Verdict: **improve** (the plugin stays; a mod adds a read-only display).
- Why: all needed data is already in `process.json`; the mod only reads. It cannot corrupt state. The cost is one line of screen, and only while a process is bound.
- Mod abilities that might apply: `session.start` (start the timer, find the process), `$.session.id` (compare with `.session`), `$.fs.list` / `$.fs.read` / `$.fs.exists`, `$.clock.every`, `classic.PostToolUse` or `tool.call` (react when `process_manager.py update-current-state` runs, to refresh at once), `turn.complete`, `$.ui.status`, `$.ui.toast`, `$.ui.log`, the `Spinner` `suffix`, `$.store` (remember that the user turned the line off), `$.command.register` (`/process-status on|off`, a command can print the full status as `{ text }`).

## 4. Research questions
1. Can a mod read `~/.claude/agentic-processes/active/*/.session` and `process.json` with `$.fs.list` / `$.fs.read`? How does a mod name the home directory (is `~` expanded, is there `$.env.get('HOME')`)? Are `$.fs` paths outside the project allowed by default?
2. How does a mod get the current session id (`$.session.id`) and does that id match the `session_id` that the hooks wrote into `.session`? Does `/resume`, `/clear` or `/branch` change it? (Interface page: state after `/clear` and `/resume`.)
3. Does `$.ui.status` accept only text (one line, no styling), and can the `⚠` prefix and the plugin name prefix be avoided? Is the line per mod or shared? What happens when two mods call it? Is it drawn in the Desktop app and ignored (or does it throw) in `claude -p` and VS Code?
4. Which refresh mechanism is best: `$.clock.every(2000, ...)` with a cheap `$.fs.read` of one file, or an event hook? Which events fire when the agent runs `process_manager.py update-current-state` (a Bash `tool.call` / `classic.PostToolUse` with the command text)? What is the cost per poll (4 MiB read limit, 10 s hook limit, redraw throttle)?
5. What exactly should the line show, using only fields from section 2? Draft two lines of 60-100 characters: one while running, one while `awaiting_approval` (status `awaiting_approval` or `pending-interaction.json` present). Does a toast on each step change add value, or is it noise (a toast is shown 4 s)?
6. What happens when no process is bound to the session, when the process folder moves to `completed/`, or when several processes are active at once (sub-processes: `subProcessState`, `types/process-instance.ts:291-317`)? Does the mod clear the status with an empty string (check the signature in the type file)?
7. Is this worth a spike? If yes, write the single question the spike must answer for `S01`-`S03` planning; do not build it here.

## 5. How to research
1. Re-read these mods docs pages (full URLs under `https://code.claude.com/docs/en/plugins/mods/`):
   - `api`: "Show something without starting a turn", "Run work in the background", "Reach files, processes, and the network".
   - `interface`: "Change what Claude Code already draws" (Spinner `suffix`), "Keep state" (what survives `/clear`, `/resume`), "Redraw a site".
   - `reference`: "Mods API methods" (`$.ui`, `$.session`, `$.fs`, `$.clock`, `$.env`), "Render sites", "Limits" (toast 4 s, redraw throttle).
   - `overview`: "Where mods run".
2. Search the type file for: `status(`, `toast(`, `interface UiApi` (or `ui.status`), `session.id`, `fs.list`, `fs.read`, `HOME`, `classic.PostToolUse`, `PostToolUseInput`, `surfaces` (`$.session.surfaces`), `isInteractive`.
3. Read these repo files: `types/process-instance.ts` (`:1-76`, `:111-175`, `:240-290`), `types/process-status.ts`, `scripts/process_manager.py` (`:455-620`, `:994-1015`), `scripts/bind-session-to-process.sh`, `scripts/check-qa-session.sh` (a typical session lookup), and `skills/process-state-update/SKILL.md` (sections on `update-current-state`, `update-active-substep`).
4. Compare: the fields available in `activeStep` with what a status line can show; the mod's polling approach with the event approach; the line's value against the screen space it uses.
5. Write the answer under "7. Research result": the draft status line texts, the chosen refresh method, the surfaces where it shows, and a clear yes / no / "needs a spike" for the owner.

## 6. Out of scope
Research only. No repo edits and no building a mod (a spike may be proposed, not built here). Not part of this item: a pane or band for the full UI (that is the later UI round, item `P12`). Related items: `P07` (the files read), `P12` (UI app), `C01` (the shared session lookup), `X01` (mods off).

## 7. Research result
_(empty until the research is done)_
- Claude Code version:
- Answers to each question (with evidence):
- Final verdict:
- Evidence (doc page + section, type file name, repo `path:line`):
- Open questions:
- Risks:
- What a later plan must decide:

## 8. After the research: update the progress page
Edit `../progress.html`: find the object with `"id": "P11"` between `/* ITEMS:START */` and `/* ITEMS:END */` and set:
- `status`: `"done"` (or `"blocked"` with the reason in `summary`)
- `verdict`: the final verdict
- `summary`: 1–3 sentences
- `open`: list of open questions (empty list if none)
- `updated`: today's date `YYYY-MM-DD`
Do not change other entries. Then open the file in a browser and check your row.
