# U07 · Templates browser and details

> Status and result live in `../progress.html` (entry `U07`). Read `../README.md` first, then `../shared/mods-docs-reading-list.md`. This item belongs to the UI phase (group `U`): the UI app moves into the mod. Do `U01` first, and use its result.

## 1. Context (no previous knowledge needed)
`agentic-processes` is a Claude Code plugin that runs resumable workflows ("processes") made of steps. The plugin is now a Claude Code mod: the process rules, tools, the `/process` pane and a step line are done (items H, C, P). A separate Electron app, `../agentic-processes-ui`, still shows the processes. Owner's decision of 2026-10-10: the whole UI moves into the mod, the connection to the app is obsolete, and the JSON files are no longer a contract for it. The owner also wants the mod UI to look less plain and more like a GUI. The app has a full templates screen: a list by category with favorites, a detail view of a template, its steps and their memory flow. The mod only lists installed templates to start one, and installs them from marketplaces (P04, P09).

## 2. What exists today
- `Templates/index.tsx` (353), `ProcessTemplateList.tsx` (167): categories, a list, favorites (`useFavoriteTemplates`, kept in the browser), search.
- `TemplateDetail.tsx` (510): a formatted view of a process template (purpose, parameters, steps) and a raw JSON view.
- `StepDetailModal.tsx` (179), `StepModalSections.tsx` (351): a step definition: guidance, substeps, output, memory usage.
- `MemoryFlowTable.tsx` (104): which step writes and reads which memory topic.
- `Marketplace/*` (about 960 lines): done in P09 as the Templates tab; U07 may restyle it.

## 3. First guess (step 3, not final)
- Verdict: replace
- Why: see the context. A mod draws with elements (`Box`, `Text`, `Button`, `Input`, `Select`, `Markdown`, `Code`, `Svg` on the Desktop app, `Client`) in a pane or the band above the prompt.

## 4. Research questions
1. What does a user want from a detail view that the New tab does not show today: purpose, parameters, steps, memory flow? Draw it at 100 columns.
2. How are favorites kept: `$.store` (shared by sessions)? How do they sort the list?
3. A search field: `Input` with `onInput` filtering the list on each key. What is the cost with hundreds of templates?
4. The memory flow table: a `Box` table, or text columns? Does the Desktop app add anything?
5. A raw JSON view: `Code` with `language: json`. Is a 100,000-character limit a problem for big templates?
6. Should Browse and Install be one list with a state column, instead of the two lists of today (New and Templates)?

## 4b. Shared questions (every U item answers these, for the terminal and for the Desktop app)
S1. What does the app screen do today? (files, sizes, behaviour in plain words; a screenshot if the app can run.)
S2. What draws it in the mod? Name the render site (`Pane`, `AbovePrompt`, ...), the elements and their props. Say what works in the terminal alone and what the Desktop app adds (`Svg`, `hover`). The terminal design must work alone.
S3. How does the screen learn of a change? A mod has no file watcher: use the process tool calls, `$.clock.every`, or an event. Give the cost (redraw limit 10 a second, 4 MiB file read).
S4. What stays outside the mod, or is dropped? Say why.
S5. Verdict (`replace`, `improve`, `keep`, `later`) and what a later plan must decide.
Apply the design result of `U01` (look and feel) to every answer. If `U01` is not done yet, answer for the current look and mark it.

## 5. How to research
1. Re-read these mods docs pages (see `../shared/mods-docs-reading-list.md`): `interface` (panes, `$.ui.open`, keyboard focus, state), `reference#elements` and `#render-sites`, and `gallery` (element samples). Check each prop you rely on in the type file.
2. Read the app files listed in section 2. The app has no screenshots in the repo: if you need one, run `npm run dev` in `../agentic-processes-ui` (the owner can run it and paste a picture).
3. Read the current mod pane for comparison: `hooks/on-process-pane/on-process-pane.ts` and `hooks/infra/process-pane/process-pane.ts`.
4. Answer the questions in section 4 and 4b under "7. Research result".

## 6. Out of scope
No implementation. No plugin edits. Do not edit the UI app. Do not change the JSON file shapes without saying so in the result (the UI app is obsolete, so they are free to change, but a later plan decides). Only `U01` may build a throwaway mod, outside this repo.

## 7. Research result
_(empty until the research is done; fill: Claude Code version, answers to each question with evidence, final verdict, open questions, risks, what a later plan must decide.)_

## 8. After the research: update the progress page
Edit `../progress.html`: find the object with `"id": "U07"` between `/* ITEMS:START */` and `/* ITEMS:END */` and set `status`, `verdict`, `summary`, `open`, `updated` (today's date `YYYY-MM-DD`). Do not change other entries. Check the file still parses (`node --check` on the script) and open it in a browser.
