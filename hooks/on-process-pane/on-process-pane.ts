import type { Register } from 'claude-code'
import { findAgenticProcessDir, sessionKey } from '../infra/agentic-process-repository/agentic-process-repository'
import { raiseLogOwed } from '../infra/log-owed/log-owed'
import type { FileSystem, ManagerPorts } from '../infra/ports/ports'
import { boundView, deleteProcess, fingerprint, inFolder, stepDetail, listProcesses, listTemplates, resumeProcess, startProcess, waitingCount } from '../infra/process-pane/process-pane'
import type { ProcessInfo, StepRow, Started, TemplateInfo } from '../infra/process-pane/process-pane'
import { LOOK, needsUser, symbolOf } from '../infra/process-pane/status-look'
import { moveCommands, slash } from '../infra/process-manager/move'
import { ensureProcessTools } from '../infra/process-manager/tools'
import { FAVORITES, matches, mergeTemplates, templateDetail } from '../infra/process-pane/template-views'
import type { TemplateRow } from '../infra/process-pane/template-views'
import { flowGrid, nodeSegment, progressBar, ring } from '../infra/process-pane/rich'
import { filesView, logView, memoryView } from '../infra/process-pane/process-views'
import { stepLine } from '../infra/process-pane/step-line'
import { addMarketplace, catalog, installTemplate, listMarketplaces, refreshMarketplaces, removeMarketplace, removeTemplate, toggleMarketplace, updateMarketplace } from '../infra/templates/templates'
import type { CatalogEntry, MarketplaceFields, MarketplaceInfo, TemplatePorts } from '../infra/templates/templates'
import { startCountingAgain } from '../on-agent-stopping/on-agent-stopping'

// The command /process opens a pane. With no process bound to the session it has three tabs. New: pick a template, fill its fields, Create.
// Continue: pick a process (this folder or all folders). Templates: refresh the marketplaces, install, update or remove a template. Either way the mod does the files and the session link itself, lists the process
// tools, and sends the agent one message (see handoff in infra/process-pane). The agent then runs the steps with the process-run skill.
// With a process bound to the session, the pane shows that one process and its steps. A button above the prompt opens the pane, and a timer keeps the waiting count current.

const PANE = 'process-pane'
const COMMANDS = ['process', 'agentic-processes:process']
const TABS = ['new', 'continue', 'templates'] as const
const REFRESH_MS = 5000
const ICONS = {
  new: '<path d="M8 2v12M2 8h12"/>',
  continue: '<path d="M4 2l9 6-9 6z"/>',
}

// The pane keeps what it shows in module variables: a reload of the mod starts it again from the command.
let tab: (typeof TABS)[number] = 'new'
let view: 'list' | 'process' = 'list' // process: the pane shows the one process bound to the session
let boundDir: string | undefined
let shown: string | undefined // the process the pane draws: the bound one, or a sub-process or the parent the user opened
let openStep: string | undefined // the step whose detail shows, if any
let detailTab: 'definition' | 'execution' = 'definition'
let favorites = new Set<string>() // starred templates (`category/name`), kept in the store as `favorites`
let query = '' // the search words of the New tab
let category: string | undefined // the chip: a category, the favorites, or all
let detailKey: string | undefined // the template whose detail shows
let tdTab: 'overview' | 'steps' | 'flow' | 'raw' = 'overview'
let tdStep: number | undefined
let section: 'steps' | 'memory' | 'logs' | 'files' = 'steps' // the tab of the bound process
let memTab: 'flow' | 'topics' | 'history' | 'diffs' = 'flow'
let openTopic: string | undefined
let showFramework = false
let graphOn = false // Desktop: draw the steps as a graph (a Client, behind the Graph button) or as the timeline (default, with SVG nodes)
let allFolders = false // Continue shows every folder; kept in the store as `allFolders`
let loaded = false
let timer: { cancel(): void } | undefined
let seen = new Set<string>() // the processes that needed the user at the last look: a new one raises a toast
let primed = false
let lastPrint: string | undefined // the fingerprint of the process list at the last redraw
let entries: CatalogEntry[] = []
let markets: MarketplaceInfo[] = []
let form: { original?: string; values: MarketplaceFields } | undefined // the Add or Edit form of a marketplace
let sure: string | undefined // the marketplace whose Remove was pressed once
let templates: TemplateInfo[] = []
let processes: ProcessInfo[] = []
let chosen: TemplateInfo | undefined
let values: Record<string, string> = {}
let message = ''
let firstArg = '' // the text typed after the command: goes into the first field of the template that gets picked

const filesOf = ($: any): FileSystem => ({
  home: async () => (await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE')), // Windows has no HOME in every shell
  list: path => $.fs.list(path),
  exists: path => $.fs.exists(path),
  read: path => $.fs.read(path),
})
const linksOf = ($: any): ManagerPorts['links'] => ({
  get: async sessionId => ((await $.store.get(sessionKey(sessionId))) as string[] | undefined) ?? [],
  add: async (sessionId, dir) => {
    const dirs = ((await $.store.get(sessionKey(sessionId))) as string[] | undefined) ?? []
    await $.store.set(sessionKey(sessionId), [...dirs.filter(d => d !== dir), dir]) // the newest goes last, and answers first
  },
})
const portsOf = ($: any): ManagerPorts => ({
  files: filesOf($),
  write: (path, text) => $.fs.write(path, text),
  move: async (from, to) => {
    const windows = (await $.env.get('OS')) === 'Windows_NT'
    for (const argv of moveCommands(windows, from, to)) {
      const run = await $.process.run(argv)
      if (run.exitCode !== 0) throw new Error(`${argv[0]} failed: ${(run.stderr || run.stdout).trim()}`)
    }
  },
  now: () => new Date().toISOString(),
  uuid: () => crypto.randomUUID(),
  pluginRoot: slash($.plugin.root),
  cwd: () => $.session.cwd(),
  sessionId: () => $.session.id(),
  links: linksOf($),
})

const templatePortsOf = async ($: any): Promise<TemplatePorts> => ({
  files: filesOf($),
  write: (path, text) => $.fs.write(path, text),
  now: () => new Date().toISOString(),
  pluginRoot: slash($.plugin.root),
  windows: (await $.env.get('OS')) === 'Windows_NT',
  run: argv => $.process.run(argv, { timeoutMs: 120_000 }), // a clone can take a while
})

// The line under the prompt. Mods cannot share a function that takes `$` across files, so on-process-tools has the same one.
async function showStepLine($: any, dir: string): Promise<void> {
  try { await $.ui.status(await stepLine(filesOf($), dir)) } catch { /* a surface that cannot draw it */ }
}

// Run one template job, then read the catalog and the installed templates again. A failure is shown in the pane.
async function templateJob($: any, job: (ports: TemplatePorts) => Promise<string | void>): Promise<void> {
  try {
    const ports = await templatePortsOf($)
    sure = undefined // any other action takes the first Remove press back
    message = (await job(ports)) ?? ''
    ;[entries, templates, markets] = await Promise.all([catalog(ports), listTemplates(filesOf($)), listMarketplaces(ports)])
  } catch (error) { message = error instanceof Error ? error.message : String(error) }
  $.ui.invalidate('ui.render')
}

// The process is bound. Close the pane and hand it to the agent as the user's own prompt.
// The prompt hook skips prompts from the plugin, so the work it does for a user prompt is done here.
async function handOff($: any, started: Started): Promise<void> {
  if ('error' in started) { message = started.error; $.ui.invalidate('ui.render'); return }
  const sessionId = await $.session.id()
  await ensureProcessTools(spec => $.tool.register(spec), sessionId)
  await showStepLine($, started.dir)
  await raiseLogOwed(filesOf($), linksOf($), sessionId)
  startCountingAgain()
  await $.ui.close({ id: PANE })
  $.prompt.submit({ text: started.text, asUser: true }) // not awaited: it resolves when the turn starts
}

// Read every process again, and say so with a toast when one starts to need the user. The first look raises none.
// The pane redraws only when the list changed, so a redraw cannot swallow a click. A bound process reads its files on each draw, so it redraws each time.
async function refresh($: any): Promise<void> {
  let changed = true
  try {
    processes = await listProcesses(filesOf($))
    const print = fingerprint(processes)
    changed = print !== lastPrint
    lastPrint = print
    const needing = processes.filter(p => needsUser(p.kind))
    if (primed) for (const p of needing) if (!seen.has(p.dir)) await $.ui.toast(`${p.name} ${LOOK[p.kind].word}`)
    seen = new Set(needing.map(p => p.dir))
    primed = true
  } catch { /* keep the last list */ }
  if (changed || view === 'process') $.ui.invalidate('ui.render')
}

// The saved folder switch, and the timer that keeps the count and the badge current. A mod has no file watcher.
async function ensureLoaded($: any): Promise<void> {
  if (!loaded) {
    loaded = true
    allFolders = (await $.store.get('allFolders')) === true
    favorites = new Set(((await $.store.get('favorites')) as string[] | undefined) ?? [])
  }
  if (!timer) {
    try { timer = $.clock.every(REFRESH_MS, () => refresh($)) } catch { /* no timer: the pane refreshes when it opens */ }
    void refresh($)
  }
}

// Open the pane the way the command does: the bound process if the session has one, else the list. A tab name picks the list.
async function openPane($: any, named?: (typeof TABS)[number], rest = ''): Promise<void> {
  const files = filesOf($)
  await ensureLoaded($)
  ;[templates, processes] = await Promise.all([listTemplates(files), listProcesses(files)])
  try { const ports = await templatePortsOf($); [entries, markets] = await Promise.all([catalog(ports), listMarketplaces(ports)]) } catch { /* no catalog: the list shows what is installed */ }
  detailKey = undefined
  boundDir = await findAgenticProcessDir(files, linksOf($), await $.session.id())
  view = !named && boundDir ? 'process' : 'list'
  shown = boundDir
  openStep = undefined
  section = 'steps'
  tab = named ?? (templates.length || !processes.length ? 'new' : 'continue')
  chosen = undefined
  values = {}
  message = ''
  firstArg = rest
  await $.ui.open({ id: PANE, title: 'Process', focus: true, closeOnEscape: true })
}

// A file never opens inside the pane. The terminal hands it to the editor (`code`). Desktop hands it to the system opener, which is the
// nearest thing the mods API has to a built-in viewer. Says why, with the path, when nothing opened.
async function openInViewer($: any, path: string, surface: string): Promise<string> {
  const windows = (await $.env.get('OS')) === 'Windows_NT'
  const tries: string[][] = surface === 'desktop'
    ? windows ? [['cmd', '/c', 'start', '', path]] : [['open', path], ['xdg-open', path]]
    : [['code', '--goto', path]]
  for (const argv of tries) {
    const run = await $.process.run(argv).catch(() => undefined)
    if (run && run.exitCode === 0) return ''
  }
  return `Could not open the file with ${tries.map(t => t[0]).join(' or ')}. The file is ${path}`
}

const iconSvg = (path: string, color: string, dot: boolean) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><g transform="translate(2 2)" fill="none" stroke="${color}" stroke-width="2">${path}</g>${dot ? '<circle cx="16" cy="4" r="3.5" fill="#e3a63b"/>' : ''}</svg>`

export const register: Register = on => {
  // The command is registered in on-process-tools: a plugin can have only one session.start hook without a matcher.
  // A first word that is a tab name opens that tab. Any other text goes to the first field, as before.
  on('command.run', { command: COMMANDS }, async ($, e) => {
    const text = String(e.args ?? '').trim()
    const [word = '', ...others] = text.split(/\s+/)
    const named = TABS.find(t => t === word.toLowerCase())
    await openPane($, named, named ? others.join(' ') : text)
    return {}
  })

  // After /clear, /resume and /branch the saved folder switch is read again.
  on('classic.SessionStart', { source: ['clear', 'resume', 'fork'] }, async ($, e, next) => {
    loaded = false
    await ensureLoaded($)
    return next(e)
  })

  // The button above the prompt: always there, with the count of processes that need the user. Key 1 opens the pane.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    await ensureLoaded($)
    const { Box, Button } = $.ui.resolve(e)
    const count = waitingCount(processes)
    const theirs = await next(e).catch(() => undefined) // a mod after this one that fails must not blank the button
    return Box({
      flexDirection: 'column',
      children: [
        Button({ key: 'band-open', label: count ? `Processes ${symbolOf('waiting', false)} ${count} wait` : 'Processes', plain: true, dimColor: !count, onPress: () => openPane($) }),
        ...(theirs ? [theirs] : []), // keep what the mods after this one draw
      ],
    })
  })

  // A press on a node of the graph (a Client on Desktop). The data comes from code that runs on the drawing side: check it.
  on('ui.message', async ($, e, next) => {
    const data = e.data as { go?: unknown; id?: unknown; dir?: unknown } | null
    if (e.element !== 'graph' || !data || typeof data !== 'object') return next(e)
    if (data.go === 'step' && typeof data.id === 'string') openStep = data.id
    else if (data.go === 'open' && typeof data.dir === 'string') { shown = data.dir; openStep = undefined }
    else return {}
    $.ui.invalidate('ui.render')
    return {}
  })

  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    if (e.requestId !== PANE) return next(e)
    const { Box, Text, Button, Input, Svg, Client } = $.ui.resolve(e) as any // Svg and Client: the Desktop app (and Client the terminal) only
    const redraw = () => $.ui.invalidate('ui.render')
    const show = (to: typeof tab) => () => { tab = to; message = ''; form = undefined; sure = undefined; redraw() }
    const line = (text: string, props: Record<string, unknown> = {}) => Text({ children: [text], ...props })
    const narrow = ((e.props as any).bodyColumns ?? 60) < 52 // short labels, no bar
    const rich = !!Svg && e.surface === 'desktop' // Desktop draws small SVG pictures (see infra/process-pane/rich): status nodes, bars, a ring. The terminal never does.
    const picture = (source: string, alt: string, width: number, height: number) => Svg({ source, alt, width, height, isInteractive: true })
    const cwd: string = await $.session.cwd()
    const need = waitingCount(processes)
    const bound = view === 'process' && shown ? await boundView(filesOf($), shown) : undefined
    const detail = bound && openStep ? await stepDetail(filesOf($), bound.dir, openStep) : undefined
    // The Memory, Logs and Files tabs read their files on each draw (the 5 second timer redraws). The tab counts need all three.
    const views = bound && !detail ? { mem: await memoryView(filesOf($), bound.dir), logs: await logView(filesOf($), bound.dir), rows: await filesView(filesOf($), bound.dir) } : undefined

    // The two tabs: buttons in a row, and on Desktop a rail with an icon for each.
    const badge = need ? ` ${symbolOf('waiting', false)}${need}` : ''
    const tabDefs = [
      { name: 'new', key: 'tab-new', label: 'New', short: 'New', go: show('new') },
      { name: 'continue', key: 'tab-continue', label: `Continue${badge}`, short: `Cont${badge}`, go: show('continue') },
    ] as const
    const tabButton = (t: (typeof tabDefs)[number]) => Button({ key: t.key, label: narrow ? t.short : t.label, plain: true, dimColor: tab !== t.name, onPress: t.go })
    const tabs = Box({ flexDirection: 'row', columnGap: narrow ? 1 : 3, children: tabDefs.map(tabButton) })
    const rail = Svg && Box({
      flexDirection: 'column',
      children: tabDefs.map(t => Box({
        key: `rail-${t.name}`, flexDirection: 'row', columnGap: 1,
        children: [Svg({ source: iconSvg(ICONS[t.name], tab === t.name ? '#8fa8ff' : '#8a90a0', t.name === 'continue' && need > 0), alt: `${t.label} icon`, width: 20, height: 20 }), tabButton(t)],
      })),
    })

    // A card: a round border, the status symbol and word, the step, and a bar. A process that needs the user has a yellow border.
    const card = (cardKey: string, children: unknown[], hot = false) => Box({
      key: cardKey, flexDirection: 'column', borderStyle: 'round', borderColor: hot ? 'warning' : 'inactive',
      paddingLeft: 1, paddingRight: 1, hover: { borderColor: 'claude' }, children,
    })
    const processCard = (p: ProcessInfo, i: number) => {
      const look = LOOK[p.kind]
      const filled = p.kind === 'done' ? 20 : Math.round(((p.step - 1) / Math.max(1, p.total)) * 20)
      return card(`card-${i}`, [
        Box({
          flexDirection: 'row', columnGap: 1,
          children: [
            line(symbolOf(p.kind, false), { color: look.color, bold: true }),
            Button({ key: `process-${i}`, plain: true, label: p.name, onPress: async () => handOff($, await resumeProcess(portsOf($), p.dir)) }),
            line(look.word, { color: look.color }),
            // Delete moves the folder to deleted/ and asks twice. The process this session works on stays.
            Button({ key: `del-${i}`, label: sure === p.dir ? 'Sure?' : 'Delete', plain: true, dimColor: sure !== p.dir, onPress: async () => {
              if (p.dir === boundDir) { message = 'This session works on that process. Close it first.'; redraw(); return }
              if (sure !== p.dir) { sure = p.dir; message = ''; redraw(); return }
              sure = undefined
              try { message = `Moved to ${await deleteProcess(portsOf($), p.dir)}` } catch (error) { message = error instanceof Error ? error.message : String(error) }
              await refresh($)
            } }),
          ],
        }),
        line(narrow ? `step ${p.step}/${p.total}` : `step ${p.step} of ${p.total}  ·  ${p.updated}`, { dimColor: true }),
        ...(narrow ? [] : [rich ? picture(progressBar(p.kind === 'done' ? p.total : p.step - 1, p.total, p.kind, 240), `step ${p.step} of ${p.total}`, 240, 8) : line('█'.repeat(filled).padEnd(20, '░'), { color: look.color })]),
      ], needsUser(p.kind))
    }

    let body: unknown[]
    if (tab === 'templates') {
      const marketplaces = markets.map((m, i) => Box({
        key: `mk-${i}`, flexDirection: 'row', columnGap: 2,
        children: [
          line(`${m.name}  ·  ${m.enabled ? 'on' : 'off'}  ·  ${m.cached ? `priority ${m.priority}` : 'not refreshed'}`, { dimColor: !m.enabled }),
          Button({ key: `mk-toggle-${i}`, label: m.enabled ? 'Off' : 'On', plain: true, onPress: () => templateJob($, ports => toggleMarketplace(ports, m.name)) }),
          Button({ key: `mk-edit-${i}`, label: 'Edit', plain: true, onPress: () => { form = { original: m.name, values: { name: m.name, url: m.url, branch: m.branch, priority: String(m.priority) } }; message = ''; redraw() } }),
          // Remove deletes the cache: the first press asks, the second removes.
          Button({ key: `mk-remove-${i}`, label: sure === m.name ? 'Sure?' : 'Remove', plain: true, onPress: () => { if (sure === m.name) return templateJob($, ports => removeMarketplace(ports, m.name)); sure = m.name; redraw() } }),
        ],
      }))
      const fields: [keyof MarketplaceFields, string][] = [['name', 'name *'], ['url', 'git address *'], ['branch', 'branch (main)'], ['priority', 'priority (100)']]
      const editor = form && [
        line(form.original ? `Edit ${form.original}` : 'Add a marketplace', { bold: true }),
        ...fields.map(([key, label], i) => Input({
          key: `mk-field-${key}`, label, value: form!.values[key], ...(i === 0 ? { autoFocus: true } : {}),
          onInput: (text: string) => { form!.values[key] = text },
          submitLabel: 'save', onSubmit: async (text: string) => { form!.values[key] = text; await save() },
        })),
        Box({ flexDirection: 'row', columnGap: 3, children: [
          Button({ key: 'mk-save', label: 'Save', onPress: save }),
          Button({ key: 'mk-cancel', label: 'Cancel', plain: true, onPress: () => { form = undefined; message = ''; redraw() } }),
        ] }),
      ]
      async function save() {
        const f = form!
        await templateJob($, async ports => { await (f.original ? updateMarketplace(ports, f.original, f.values) : addMarketplace(ports, f.values)); form = undefined })
      }
      body = editor ?? [
        line('Marketplaces', { bold: true }),
        ...marketplaces,
        Button({ key: 'mk-add', label: 'Add marketplace', plain: true, onPress: () => { form = { values: { name: '', url: '', branch: '', priority: '' } }; message = ''; redraw() } }),
        line(' '),
        Box({ flexDirection: 'row', columnGap: 3, children: [
          Button({ key: 'tpl-refresh', label: 'Refresh', onPress: () => templateJob($, async ports => (await refreshMarketplaces(ports)).join('\n')) }),
          Button({ key: 'mk-back', label: 'Back to templates', plain: true, onPress: () => { tab = 'new'; message = ''; redraw() } }),
        ] }),
      ]
    } else if (tab === 'continue') {
      const visible = inFolder(processes, cwd, allFolders)
      const setFolders = (all: boolean) => async () => { allFolders = all; await $.store.set('allFolders', all); redraw() }
      const folderSwitch = Box({
        flexDirection: 'row', columnGap: 2,
        children: [
          Button({ key: 'folder-here', label: 'This folder', plain: true, dimColor: allFolders, onPress: setFolders(false) }),
          Button({ key: 'folder-all', label: 'All folders', plain: true, dimColor: !allFolders, onPress: setFolders(true) }),
        ],
      })
      body = [
        folderSwitch,
        ...(visible.length
          ? visible.map(processCard)
          : [line(allFolders || !processes.length ? 'No process is running. Start one on the New tab.' : 'No process in this folder. Press All folders to see every process.', { dimColor: true })]),
      ]
    } else if (!chosen) {
      const allRows = mergeTemplates(templates, entries)
      const row = detailKey ? allRows.find(r => r.key === detailKey) : undefined
      const saveFavorites = async () => { await $.store.set('favorites', [...favorites]); redraw() }
      const toggleFavorite = (key: string) => () => { if (!favorites.delete(key)) favorites.add(key); return saveFavorites() }
      const star = (key: string, id: string) => Button({ key: id, label: favorites.has(key) ? '★' : '☆', plain: true, onPress: toggleFavorite(key) })
      const wordOf = { installed: 'installed', update: 'update available', available: 'not installed' } as const
      const install = (r: TemplateRow) => Button({ key: `tpl-install-${r.key}`, label: r.state === 'update' ? 'Update' : 'Install', onPress: () => templateJob($, ports => installTemplate(ports, r.entry!)) })
      const start = (r: TemplateRow) => Button({
        key: `start-${r.key}`, label: 'Start', variant: 'primary',
        onPress: () => { chosen = r.template; values = r.template!.fields[0] && firstArg ? { [r.template!.fields[0].name]: firstArg } : {}; message = ''; redraw() },
      })
      if (row) {
        // The detail of one template: purpose and parameters, the steps, the memory flow, and the file.
        const d = row.template ? await templateDetail(filesOf($), row.template.path) : undefined
        const tdTabButton = (name: typeof tdTab, label: string) => Button({ key: `td-${name}`, label, plain: true, dimColor: tdTab !== name, onPress: () => { tdTab = name; redraw() } })
        const param = (p: { name: string; required: boolean; description: string; example: string }) => line(`  ${p.name}${p.required ? ' *' : ''}   ${p.description}${p.example ? `   e.g. ${p.example}` : ''}`)
        const overview = !d ? [line(row.purpose || 'No description.'), line(' '), line('Install this template to see its steps.', { dimColor: true })] : [
          line('Purpose', { bold: true }), line(`  ${d.purpose || row.purpose || '-'}`),
          ...(d.parameters.some(p => p.required) ? [line('Needs', { bold: true }), ...d.parameters.filter(p => p.required).map(param)] : []),
          ...(d.parameters.some(p => !p.required) ? [line('Can take', { bold: true }), ...d.parameters.filter(p => !p.required).map(param)] : []),
        ]
        const stepsBody = !d ? [] : d.steps.flatMap(s => [
          Button({ key: `tdstep-${s.number}`, label: `${tdStep === s.number ? '▾' : '▸'} ${s.number}. ${s.name}${s.approval ? '   approval needed' : ''}`, plain: true, onPress: () => { tdStep = tdStep === s.number ? undefined : s.number; redraw() } }),
          ...(tdStep === s.number ? [
            ...(s.purpose ? [line(`     ${s.purpose}`, { dimColor: true })] : []),
            ...s.guidance.map(g => line(`     guidance: ${g}`)),
            ...(s.substeps.length ? [line(`     substeps: ${s.substeps.join(' · ')}`)] : []),
            ...(s.output ? [line(`     output: ${s.output}`)] : []),
            ...(s.reads.length ? [line(`     reads: ${s.reads.join(', ')}`)] : []), ...(s.writes.length ? [line(`     writes: ${s.writes.join(', ')}`)] : []),
          ] : []),
        ])
        const width = Math.max(5, ...(d?.flow.topics.map(t => t.length) ?? []))
        const flowBody = !d ? [] : d.flow.topics.length
          ? rich ? [picture(flowGrid(d.flow.topics, d.flow.cells, d.steps.map(s => s.number)), 'Which step reads and writes which memory topic', 150 + 44 * d.steps.length + 4, 26 + 28 * d.flow.topics.length), line('W writes · R reads · R/W both', { dimColor: true })] : [line(`${'topic'.padEnd(width)}  ${d.steps.map(s => String(s.number).padEnd(3)).join(' ')}`, { bold: true }),
            ...d.flow.topics.map(t => line(`${t.padEnd(width)}  ${d.flow.cells[t].map(c => (c || '·').padEnd(3)).join(' ')}`)),
            line('W writes · R reads · R/W both', { dimColor: true })]
          : [line('This template defines no memory topics.', { dimColor: true })]
        const rawBody = row.template
          ? [Button({ key: 'raw-open', label: 'Open file in the viewer', onPress: async () => { message = await openInViewer($, row.template!.path, e.surface); redraw() } }), line(narrow ? '' : (e.surface === 'desktop' ? 'The system opener opens the file.' : 'The editor (code) opens the file.'), { dimColor: true })]
          : [line('Install this template to open its file.', { dimColor: true })]
        body = [card('tdetail', [
          Box({ flexDirection: 'row', columnGap: 3, children: [
            Button({ key: 'td-back', label: 'Back', plain: true, onPress: () => { detailKey = undefined; tdStep = undefined; message = ''; redraw() } }),
            ...(row.template ? [start(row)] : []), ...(row.entry && row.state !== 'installed' ? [install(row)] : []),
            ...(row.state !== 'available' ? [Button({ key: `tpl-remove-${row.key}`, label: 'Remove', plain: true, onPress: () => templateJob($, ports => removeTemplate(ports, row)) })] : []),
          ] }),
          Box({ flexDirection: 'row', columnGap: 1, children: [star(row.key, 'td-fav'), line(`${row.category} / ${row.title}`, { bold: true }), line(wordOf[row.state], { dimColor: true })] }),
          Box({ flexDirection: 'row', columnGap: narrow ? 1 : 3, children: [tdTabButton('overview', 'Overview'), tdTabButton('steps', narrow ? 'Steps' : `Steps${d ? ` ·${d.steps.length}` : ''}`), tdTabButton('flow', narrow ? 'Flow' : 'Memory flow'), tdTabButton('raw', 'Raw')] }),
          line(' '),
          ...(tdTab === 'overview' ? overview : tdTab === 'steps' ? stepsBody : tdTab === 'flow' ? flowBody : rawBody),
        ])]
      } else {
        const cats = [...new Set(allRows.map(r => r.category))].sort()
        const chip = (id: string, label: string, value: string | undefined) => Button({ key: id, label, plain: true, dimColor: category !== value, onPress: () => { category = value; redraw() } })
        const shownRows = matches(allRows, query, category, favorites)
        body = [
          Input({ key: 'search', label: 'Search', placeholder: 'name, category or purpose', value: query, onInput: (text: string) => { query = text; redraw() }, onSubmit: (text: string) => { query = text; redraw() } }),
          Box({ flexDirection: 'row', columnGap: narrow ? 1 : 2, flexWrap: 'wrap', children: [
            chip('cat-all', 'All', undefined), chip('cat-fav', `★ Favorites${favorites.size ? ` ·${favorites.size}` : ''}`, FAVORITES), ...cats.map(c => chip(`cat-${c}`, c, c)),
          ] }),
          line(' '),
          ...(shownRows.length ? shownRows.map(r => card(`tcard-${r.key}`, [
            Box({ flexDirection: 'row', columnGap: 1, children: [
              star(r.key, `fav-${r.key}`),
              Button({ key: `template-${r.key}`, plain: true, label: `${r.category} / ${r.title}`, onPress: () => { detailKey = r.key; tdTab = 'overview'; tdStep = undefined; message = ''; redraw() } }),
              line(`${r.steps != null && !narrow ? `${r.steps} steps  ·  ` : ''}${wordOf[r.state]}`, { dimColor: true }),
            ] }),
            ...(narrow || !r.purpose ? [] : [line(r.purpose.length > 90 ? `${r.purpose.slice(0, 89)}…` : r.purpose, { dimColor: true })]),
            Box({ flexDirection: 'row', columnGap: 2, children: [...(r.template ? [start(r)] : []), ...(r.entry && r.state !== 'installed' ? [install(r)] : [])] }),
          ])) : [line(allRows.length ? 'No template matches. Clear the search or press All.' : 'No template yet. Press Refresh to read the marketplaces.', { dimColor: true })]),
          line(' '),
          Box({ flexDirection: 'row', columnGap: 3, children: [
            Button({ key: 'tpl-refresh', label: 'Refresh', plain: true, onPress: () => templateJob($, async ports => (await refreshMarketplaces(ports)).join('\n')) }),
            Button({ key: 'mk-open', label: 'Marketplaces', plain: true, onPress: () => { tab = 'templates'; message = ''; redraw() } }),
          ] }),
        ]
      }
    } else {
      const template = chosen
      const create = async () => handOff($, await startProcess(portsOf($), template, values))
      body = [
        line(`${template.category} / ${template.name}`, { bold: true }),
        ...template.fields.map((f, i) => Input({
          key: `field-${f.name}`, label: f.required ? `${f.name} *` : f.name, placeholder: f.example ? `e.g. ${f.example}` : f.description,
          value: values[f.name] ?? '', ...(i === 0 ? { autoFocus: true } : {}),
          onInput: (text: string) => { values[f.name] = text },
          submitLabel: 'create', onSubmit: async (text: string) => { values[f.name] = text; await create() }, // Enter in a field creates
        })),
        Box({
          flexDirection: 'row', columnGap: 3,
          children: [
            Button({ key: 'create', label: 'Create', onPress: create }),
            Button({ key: 'back', label: 'Back', plain: true, onPress: () => { chosen = undefined; message = ''; redraw() } }),
          ],
        }),
      ]
    }
    if (bound) {
      // A process is bound to the session: the pane shows that one process, or the detail of one of its steps.
      const look = LOOK[bound.kind]
      const kindWord = (kind: keyof typeof LOOK) => line(LOOK[kind].word, { color: LOOK[kind].color })
      const goTo = (dir: string | undefined) => () => { shown = dir; openStep = undefined; section = 'steps'; redraw() }
      if (detail) {
        const at = bound.steps.findIndex(s => s.id === detail.id)
        const move = (by: number) => () => { openStep = bound.steps[at + by]?.id; redraw() }
        const section = (title: string, items: string[]) => items.length ? [line(title, { bold: true }), ...items.map(item => line(`  ${item}`))] : []
        const tabButton = (name: typeof detailTab, label: string) => Button({ key: `dtab-${name}`, label, plain: true, dimColor: detailTab !== name, onPress: () => { detailTab = name; redraw() } })
        const parts = detailTab === 'definition'
          ? [...section('Produces', detail.produces), ...section('Substeps', detail.substeps), ...section('Reads memory', detail.reads), ...section('Writes memory', detail.writes)]
          : [...section('Actions', detail.actions), ...section('Reasoning', detail.reasoning), ...section('Decisions', detail.decisions), ...section('Files', detail.files),
             ...section('Produced', detail.produced.map(([k, v]) => `${k}: ${v}`)), ...section('Notes', detail.notes), ...section('Problems', detail.problems)]
        return card('step-detail', [
          Box({ flexDirection: 'row', columnGap: 1, children: [line(symbolOf(detail.kind, false), { color: LOOK[detail.kind].color, bold: true }), line(`${detail.number}. ${detail.name}`, { bold: true }), kindWord(detail.kind)] }),
          Box({ flexDirection: 'row', columnGap: 3, children: [tabButton('definition', 'Definition'), tabButton('execution', 'Execution')] }),
          line(' '),
          ...(parts.length ? parts : [line(detailTab === 'definition' ? 'This step has no definition.' : 'Nothing recorded yet.', { dimColor: true })]),
          line(' '),
          Box({ flexDirection: 'row', columnGap: 3, children: [
            Button({ key: 'back-steps', label: section === 'logs' ? 'Back to logs' : 'Back to steps', plain: true, onPress: () => { openStep = undefined; redraw() } }),
            ...(at > 0 ? [Button({ key: 'step-prev', label: `‹ ${bound.steps[at - 1].number}`, plain: true, onPress: move(-1) })] : []),
            ...(at >= 0 && at < bound.steps.length - 1 ? [Button({ key: 'step-next', label: `${bound.steps[at + 1].number} ›`, plain: true, onPress: move(1) })] : []),
          ] }),
        ], needsUser(detail.kind))
      }
      const stepRows = (s: StepRow, i: number) => [
        Box({ key: `row-${s.id}`, flexDirection: 'row', columnGap: 1, children: [
          rich ? picture(nodeSegment(s.kind, { first: i === 0, last: i === bound.steps.length - 1, height: 22 }), LOOK[s.kind].word, 24, 22) : line(symbolOf(s.kind, false), { color: LOOK[s.kind].color, bold: s.active }),
          Button({ key: `step-${s.id}`, label: `${s.number}. ${s.name}`, plain: true, onPress: () => { openStep = s.id; redraw() } }),
          ...(needsUser(s.kind) ? [kindWord(s.kind)] : []),
        ] }),
        ...(narrow ? [] : s.substeps.map(sub => line(`    ${sub.active ? '◀' : '·'} ${sub.number} ${sub.name}`, { dimColor: !sub.active, ...(sub.active ? { color: look.color } : {}) }))),
        ...(narrow ? [] : s.children.map((c, n) => Box({ key: `child-${s.id}-${n}`, flexDirection: 'row', columnGap: 1, children: [
          line('  └', { dimColor: true }), line(symbolOf(c.kind, false), { color: LOOK[c.kind].color }),
          Button({ key: `sub-${s.id}-${n}`, label: c.name, plain: true, onPress: goTo(c.dir) }), kindWord(c.kind),
        ] }))),
      ]
      // Desktop: the steps as a graph the user can move. The terminal and the toggle's other side keep the timeline.
      const node = (id: string, label: string, kind: keyof typeof LOOK, sub: string, go: 'step' | 'open', target: string) =>
        ({ id, label, sub, symbol: symbolOf(kind, false), color: LOOK[kind].color, hot: needsUser(kind), go, target })
      const graphToggle = Box({ flexDirection: 'row', columnGap: 3, children: [
        Button({ key: 'mode-graph', label: 'Graph', plain: true, dimColor: !graphOn, onPress: () => { graphOn = true; redraw() } }),
        Button({ key: 'mode-list', label: 'Timeline', plain: true, dimColor: graphOn, onPress: () => { graphOn = false; redraw() } }),
      ] })
      const graph = Client && e.surface === 'desktop' && graphOn ? Client({
        key: 'graph', module: './graph-view.ts', width: '100%', height: 22,
        props: {
          ...(bound.parent ? { parent: node('parent', bound.parent.name, 'running', 'parent process', 'open', bound.parent.dir) } : {}),
          rows: bound.steps.map(s => ({
            active: s.active,
            step: node(s.id, `${s.number}. ${s.name}`, s.kind, `${LOOK[s.kind].word}${s.substeps.length ? ` · substep ${s.substeps.find(x => x.active)?.number ?? '-'} of ${s.substeps.length}` : ''}`, 'step', s.id),
            children: s.children.map((c, n) => node(`${s.id}-${n}`, c.name, c.kind, `sub-process · ${LOOK[c.kind].word}`, 'open', c.dir)),
          })),
        },
      }) : undefined
      // The four tabs of a bound process. A count on a tab says how much is inside.
      const v = views!
      const outputs = v.rows.filter(r => r.output)
      const sec = (name: typeof section, label: string, short: string, count = 0) => Button({
        key: `sec-${name}`, label: `${narrow ? short : label}${count && !narrow ? ` ·${count}` : ''}`, plain: true, dimColor: section !== name,
        onPress: () => { section = name; message = ''; redraw() },
      })
      const sectionTabs = Box({ flexDirection: 'row', columnGap: narrow ? 1 : 3, children: [
        sec('steps', 'Steps', 'Steps'), sec('memory', 'Memory', 'Mem', v.mem.topics.length), sec('logs', 'Logs', 'Logs'), sec('files', 'Files', 'Files', outputs.length),
      ] })
      const none = (text: string) => line(text, { dimColor: true })
      const sub = (name: typeof memTab, label: string) => Button({ key: `mem-${name}`, label, plain: true, dimColor: memTab !== name, onPress: () => { memTab = name; redraw() } })
      const toLine = (items: string[]) => items.join(', ') || '-'
      const diffColor = (l: string) => (l[0] === '+' ? 'success' : l[0] === '-' ? 'error' : 'warning')
      const memoryBody = [
        Box({ flexDirection: 'row', columnGap: 3, children: [sub('flow', 'Flow'), sub('topics', 'Topics'), sub('history', 'History'), sub('diffs', 'Diffs')] }),
        line(' '),
        ...(!v.mem.topics.length ? [none('No memory yet. A step writes memory when it runs.')]
          : memTab === 'flow' ? v.mem.topics.map(t => line(`${t.topic}  ·  written by ${toLine(t.writtenBy)}  ·  read by ${toLine(t.readBy)}`))
          : memTab === 'topics' ? v.mem.topics.flatMap(t => [
            Button({ key: `topic-${t.topic}`, label: `${openTopic === t.topic ? '▾' : '▸'} ${t.topic}`, plain: true, onPress: () => { openTopic = openTopic === t.topic ? undefined : t.topic; redraw() } }),
            ...(openTopic === t.topic ? t.entries.flatMap(en => [
              line(`  step ${en.step} ${en.stepName}`, { bold: true }),
              ...en.values.map(([k, val]) => line(`    ${k}: ${val}`)),
              ...en.decisions.map(d => line(`    decision: ${d}`)), ...en.files.map(f => line(`    file: ${f}`)), ...en.notes.map(n => line(`    note: ${n}`)),
            ]) : []),
          ])
          : memTab === 'history' ? (v.mem.history.length ? v.mem.history.map(en => line(`${en.updated.slice(0, 16).replace('T', ' ')}  ${en.topic}  step ${en.step}  ·  ${en.values.length} values`)) : [none('No entries yet.')])
          : (v.mem.diffs.length ? v.mem.diffs.flatMap(d => [line(`${d.topic}: step ${d.from} → step ${d.to}`, { bold: true }), ...d.lines.map(l => line(`  ${l}`, { color: diffColor(l) }))]) : [none('No topic has two entries that differ.')])),
      ]
      const clock = (t?: string) => (t ? t.slice(11, 16) || t.slice(0, 16) : '')
      const logsBody = v.logs.length ? v.logs.flatMap(r => [
        Box({ key: `logrow-${r.id}`, flexDirection: 'row', columnGap: 1, children: [
          line(symbolOf(r.kind, false), { color: LOOK[r.kind].color }),
          Button({ key: `log-${r.id}`, label: `${r.number}. ${r.name}`, plain: true, onPress: () => { openStep = r.id; detailTab = 'execution'; redraw() } }),
          ...(clock(r.started) ? [line(`${clock(r.started)}${r.completed ? ` – ${clock(r.completed)}` : ''}`, { dimColor: true })] : []),
        ] }),
        ...(narrow ? [] : r.actions.slice(0, 2).map(a => line(`    ${a}`, { dimColor: true }))),
        ...(narrow ? [] : r.problems.slice(0, 2).map(p => line(`    problem: ${p}`, { color: 'error' }))),
      ]) : [none('No log yet.')]
      const fileRow = (r: (typeof v.rows)[number], i: number) => Box({ key: `filerow-${i}`, flexDirection: 'row', columnGap: 2, children: [
        r.openable ? Button({ key: `file-${r.path}`, label: r.name, plain: true, onPress: async () => { message = await openInViewer($, r.path, e.surface); redraw() } }) : line(r.name, { dimColor: true }),
        ...(r.step ? [line(`step ${r.step}`, { dimColor: true })] : []),
      ] })
      const framework = v.rows.filter(r => !r.output)
      // A file never opens inside the pane: a press hands it to the viewer (see openInViewer).
      const filesBody = [
        ...(outputs.length ? outputs.map(fileRow) : [none('No output file yet.')]),
        ...(framework.length ? [Button({ key: 'fw-toggle', label: `${showFramework ? '▾' : '▸'} Framework files (${framework.length})`, plain: true, dimColor: true, onPress: () => { showFramework = !showFramework; redraw() } })] : []),
        ...(showFramework ? framework.map(fileRow) : []),
        ...(message ? [line(message, { color: 'error' })] : []),
      ]
      const stepsBody = graph ? [graphToggle, graph] : [...(Client && e.surface === 'desktop' ? [graphToggle] : []), ...bound.steps.flatMap(stepRows)]
      return card('bound', [
        ...(bound.parent ? [Button({ key: 'parent', label: `↑ ${bound.parent.name}`, plain: true, onPress: goTo(bound.parent.dir) })] : []),
        ...(rich
          ? [Box({ flexDirection: 'row', columnGap: 2, children: [
            picture(ring(bound.step, bound.total, bound.kind), `Step ${bound.step} of ${bound.total}`, 44, 44),
            Box({ flexDirection: 'column', children: [
              Box({ flexDirection: 'row', columnGap: 1, children: [line(bound.name, { bold: true }), line(look.word, { color: look.color })] }),
              line(`Step ${bound.step} of ${bound.total}`, { dimColor: true }),
              picture(progressBar(bound.kind === 'done' ? bound.total : bound.step - 1, bound.total, bound.kind, 240), 'Progress of the process', 240, 8),
            ] }),
          ] })]
          : [Box({ flexDirection: 'row', columnGap: 1, children: [line(symbolOf(bound.kind, false), { color: look.color, bold: true }), line(bound.name, { bold: true }), line(look.word, { color: look.color })] }),
            line(`Step ${bound.step} of ${bound.total}`, { dimColor: true })]),
        sectionTabs,
        line(' '),
        ...(section === 'memory' ? memoryBody : section === 'logs' ? logsBody : section === 'files' ? filesBody : stepsBody),
        line(' '),
        Button({ key: 'back-list', label: 'Back to list', plain: true, onPress: () => { view = 'list'; tab = 'continue'; shown = boundDir; redraw() } }),
      ], needsUser(bound.kind))
    }
    const main = Box({ flexDirection: 'column', children: [...(rail ? [] : [tabs, line(' ')]), ...body, ...(message ? [line(message, { color: tab === 'templates' || (tab === 'new' && !chosen) || message.startsWith('Moved to') ? undefined : 'red' })] : [])] })
    return rail ? Box({ flexDirection: 'row', columnGap: 2, children: [rail, main] }) : main
  })
}
