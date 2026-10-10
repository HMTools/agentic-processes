import type { Register } from 'claude-code'
import { sessionKey } from '../infra/agentic-process-repository/agentic-process-repository'
import { raiseLogOwed } from '../infra/log-owed/log-owed'
import type { FileSystem, ManagerPorts } from '../infra/ports/ports'
import { listProcesses, listTemplates, resumeProcess, startProcess } from '../infra/process-pane/process-pane'
import type { ProcessInfo, Started, TemplateInfo } from '../infra/process-pane/process-pane'
import { moveCommands, slash } from '../infra/process-manager/move'
import { ensureProcessTools } from '../infra/process-manager/tools'
import { stepLine } from '../infra/process-pane/step-line'
import { addMarketplace, catalog, installTemplate, listMarketplaces, refreshMarketplaces, removeMarketplace, removeTemplate, toggleMarketplace, updateMarketplace } from '../infra/templates/templates'
import type { CatalogEntry, MarketplaceFields, MarketplaceInfo, TemplatePorts } from '../infra/templates/templates'
import { startCountingAgain } from '../on-agent-stopping/on-agent-stopping'

// The command /process opens a pane with three tabs. New: pick a template, fill its fields, Create.
// Continue: pick a process. Templates: refresh the marketplaces, install, update or remove a template. Either way the mod does the files and the session link itself, lists the process
// tools, and sends the agent one message (see handoff in infra/process-pane). The agent then runs the steps with the process-run skill.

const PANE = 'process-pane'
const COMMANDS = ['process', 'agentic-processes:process']

// The pane keeps what it shows in module variables: a reload of the mod starts it again from the command.
let tab: 'new' | 'continue' | 'templates' = 'new'
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

export const register: Register = on => {
  // The command is registered in on-process-tools: a plugin can have only one session.start hook without a matcher.
  on('command.run', { command: COMMANDS }, async ($, e) => {
    const files = filesOf($)
    ;[templates, processes] = await Promise.all([listTemplates(files), listProcesses(files)])
    tab = templates.length || !processes.length ? 'new' : 'continue'
    chosen = undefined
    values = {}
    message = ''
    firstArg = String(e.args ?? '').trim()
    await $.ui.open({ id: PANE, title: 'Process', focus: true, closeOnEscape: true })
    return {}
  })

  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    if (e.requestId !== PANE) return next(e)
    const { Box, Text, Button, Input } = $.ui.resolve(e)
    const redraw = () => $.ui.invalidate('ui.render')
    const show = (to: typeof tab) => () => { tab = to; message = ''; form = undefined; sure = undefined; redraw() }
    const line = (text: string, props: Record<string, unknown> = {}) => Text({ children: [text], ...props })

    const tabs = Box({
      flexDirection: 'row', columnGap: 3,
      children: [
        Button({ key: 'tab-new', label: 'New', hotkey: '1', plain: true, dimColor: tab !== 'new', onPress: show('new') }),
        Button({ key: 'tab-continue', label: `Continue (${processes.length})`, hotkey: '2', plain: true, dimColor: tab !== 'continue', onPress: show('continue') }),
        Button({ key: 'tab-templates', label: 'Templates', hotkey: '3', plain: true, dimColor: tab !== 'templates', onPress: () => { show('templates')(); void templateJob($, async () => {}) } }),
      ],
    })

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
          Button({ key: 'mk-save', label: 'Save', hotkey: 's', onPress: save }),
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
        Button({ key: 'tpl-refresh', label: 'Refresh', hotkey: 'r', onPress: () => templateJob($, async ports => (await refreshMarketplaces(ports)).join('\n')) }),
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
      body = processes.length
        ? processes.map((p, i) => Button({
          key: `process-${i}`, plain: true, label: `${p.name}  ·  step ${p.step} of ${p.total}  ·  ${p.updated}`,
          onPress: async () => handOff($, await resumeProcess(portsOf($), p.dir)),
        }))
        : [line('No process is running. Start one on the New tab.', { dimColor: true })]
    } else if (!chosen) {
      body = templates.length
        ? templates.map((t, i) => Button({
          key: `template-${i}`, plain: true, label: `${t.category} / ${t.name}`,
          onPress: () => { chosen = t; values = t.fields[0] && firstArg ? { [t.fields[0].name]: firstArg } : {}; message = ''; redraw() },
        }))
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
            Button({ key: 'create', label: 'Create', hotkey: 'c', onPress: create }),
            Button({ key: 'back', label: 'Back', hotkey: 'b', plain: true, onPress: () => { chosen = undefined; message = ''; redraw() } }),
          ],
        }),
      ]
    }
    return Box({ flexDirection: 'column', children: [tabs, line(' '), ...body, ...(message ? [line(message, { color: tab === 'templates' ? undefined : 'red' })] : [])] })
  })
}
