import type { Register } from 'claude-code'
import { findAgenticProcessDir, sessionKey } from '../infra/agentic-process-repository/agentic-process-repository'
import { raiseLogOwed } from '../infra/log-owed/log-owed'
import type { FileSystem, ManagerPorts } from '../infra/ports/ports'
import { boundView, inFolder, listProcesses, listTemplates, resumeProcess, startProcess, waitingCount } from '../infra/process-pane/process-pane'
import type { ProcessInfo, Started, TemplateInfo } from '../infra/process-pane/process-pane'
import { LOOK, needsUser, symbolOf } from '../infra/process-pane/status-look'
import { moveCommands, slash } from '../infra/process-manager/move'
import { ensureProcessTools } from '../infra/process-manager/tools'
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
  templates: '<path d="M2 4l6-3 6 3-6 3zM2 4v8l6 3 6-3V4"/>',
}

// The pane keeps what it shows in module variables: a reload of the mod starts it again from the command.
let tab: (typeof TABS)[number] = 'new'
let view: 'list' | 'process' = 'list' // process: the pane shows the one process bound to the session
let boundDir: string | undefined
let allFolders = false // Continue shows every folder; kept in the store as `allFolders`
let loaded = false
let timer: { cancel(): void } | undefined
let seen = new Set<string>() // the processes that needed the user at the last look: a new one raises a toast
let primed = false
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
async function refresh($: any): Promise<void> {
  try {
    processes = await listProcesses(filesOf($))
    const needing = processes.filter(p => needsUser(p.kind))
    if (primed) for (const p of needing) if (!seen.has(p.dir)) await $.ui.toast(`${p.name} ${LOOK[p.kind].word}`)
    seen = new Set(needing.map(p => p.dir))
    primed = true
  } catch { /* keep the last list */ }
  $.ui.invalidate('ui.render')
}

// The saved folder switch, and the timer that keeps the count and the badge current. A mod has no file watcher.
async function ensureLoaded($: any): Promise<void> {
  if (!loaded) {
    loaded = true
    allFolders = (await $.store.get('allFolders')) === true
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
  boundDir = await findAgenticProcessDir(files, linksOf($), await $.session.id())
  view = !named && boundDir ? 'process' : 'list'
  tab = named ?? (templates.length || !processes.length ? 'new' : 'continue')
  chosen = undefined
  values = {}
  message = ''
  firstArg = rest
  await $.ui.open({ id: PANE, title: 'Process', focus: true, closeOnEscape: true })
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

  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    if (e.requestId !== PANE) return next(e)
    const { Box, Text, Button, Input, Svg } = $.ui.resolve(e) as any // Svg: the Desktop app only
    const redraw = () => $.ui.invalidate('ui.render')
    const show = (to: typeof tab) => () => { tab = to; message = ''; form = undefined; sure = undefined; redraw() }
    const line = (text: string, props: Record<string, unknown> = {}) => Text({ children: [text], ...props })
    const narrow = ((e.props as any).bodyColumns ?? 60) < 52 // short labels, no bar
    const cwd: string = await $.session.cwd()
    const need = waitingCount(processes)
    const bound = view === 'process' && boundDir ? await boundView(filesOf($), boundDir) : undefined

    // The three tabs: buttons in a row, and on Desktop a rail with an icon for each.
    const badge = need ? ` ${symbolOf('waiting', false)}${need}` : ''
    const tabDefs = [
      { name: 'new', key: 'tab-new', label: 'New', short: 'New', go: show('new') },
      { name: 'continue', key: 'tab-continue', label: `Continue${badge}`, short: `Cont${badge}`, go: show('continue') },
      { name: 'templates', key: 'tab-templates', label: 'Templates', short: 'Tmpl', go: () => { show('templates')(); void templateJob($, async () => {}) } },
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
          ],
        }),
        line(narrow ? `step ${p.step}/${p.total}` : `step ${p.step} of ${p.total}  ·  ${p.updated}`, { dimColor: true }),
        ...(narrow ? [] : [line('█'.repeat(filled).padEnd(20, '░'), { color: look.color })]),
      ], needsUser(p.kind))
    }

    let body: unknown[]
    if (tab === 'templates') {
      const mark = { installed: 'installed', update: 'update available', available: 'not installed' }
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
        line('Templates', { bold: true }),
        Button({ key: 'tpl-refresh', label: 'Refresh', onPress: () => templateJob($, async ports => (await refreshMarketplaces(ports)).join('\n')) }),
        ...(entries.length ? [] : [line('Nothing to show. Press Refresh to read the marketplaces.', { dimColor: true })]),
        ...entries.map((t, i) => Box({
          key: `tpl-${i}`, flexDirection: 'row', columnGap: 2,
          children: [
            line(`${t.category} / ${t.name}  ·  ${mark[t.state]}`),
            ...(t.state === 'installed' ? [] : [Button({ key: `tpl-install-${i}`, label: t.state === 'update' ? 'Update' : 'Install', onPress: () => templateJob($, ports => installTemplate(ports, t)) })]),
            ...(t.state === 'available' ? [] : [Button({ key: `tpl-remove-${i}`, label: 'Remove', plain: true, onPress: () => templateJob($, ports => removeTemplate(ports, t)) })]),
          ],
        })),
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
      body = templates.length
        ? templates.map((t, i) => card(`tcard-${i}`, [Button({
          key: `template-${i}`, plain: true, label: `${t.category} / ${t.name}`,
          onPress: () => { chosen = t; values = t.fields[0] && firstArg ? { [t.fields[0].name]: firstArg } : {}; message = ''; redraw() },
        })]))
        : [line('No template is installed. Open the Templates tab to install one.', { dimColor: true })]
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
      // A process is bound to the session: the pane shows that one process and its steps.
      const look = LOOK[bound.kind]
      return card('bound', [
        Box({ flexDirection: 'row', columnGap: 1, children: [line(symbolOf(bound.kind, false), { color: look.color, bold: true }), line(bound.name, { bold: true }), line(look.word, { color: look.color })] }),
        line(`Step ${bound.step} of ${bound.total}`, { dimColor: true }),
        line(' '),
        ...bound.steps.map(s => line(`${symbolOf(s.kind, false)} ${s.number}. ${s.name}`, { color: LOOK[s.kind].color })),
        line(' '),
        Button({ key: 'back-list', label: 'Back to list', plain: true, onPress: () => { view = 'list'; tab = 'continue'; redraw() } }),
      ], needsUser(bound.kind))
    }
    const main = Box({ flexDirection: 'column', children: [...(rail ? [] : [tabs, line(' ')]), ...body, ...(message ? [line(message, { color: tab === 'templates' ? undefined : 'red' })] : [])] })
    return rail ? Box({ flexDirection: 'row', columnGap: 2, children: [rail, main] }) : main
  })
}
