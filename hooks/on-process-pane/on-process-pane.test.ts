import { test, expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

const HOME = '/h/.claude/agentic-processes'
const T = `${HOME}/templates/processes/dev/bug`
const PANE = {
  plugin: 'agentic-processes', component: 'Pane', requestId: 'process-pane', surface: 'terminal', viewport: { columns: 100, rows: 30 },
  props: { title: 'Process', isFocused: true, bodyColumns: 60, placement: 'inline', scroll: { offset: 0, bodyRows: 10 }, view: {} },
} as const

const template = { type: 'template', name: 'bug', category: 'dev', parameters: { required: ['workItemId'], optional: [], definitions: { workItemId: { example: '7' } } }, steps: [{ name: 'Design', stepRef: 'r1' }] }
const process = { name: 'Old fix', metadata: { lastUpdated: '2026-01-01T10:00:00Z', projectPaths: ['/work'] }, parameters: {}, steps: [{ id: 'a', number: 0, name: 'Design', status: 'pending' }] }
const BAND = {
  plugin: 'agentic-processes', component: 'AbovePrompt', requestId: 'band', surface: 'terminal', viewport: { columns: 100, rows: 30 },
  props: { hasSurvey: false, isWorking: false, maxRows: 3, bodyColumns: 60, scroll: { offset: 0, bodyRows: 3 }, view: {} },
} as const

// A fake disk (path → text) with the stubs a pane needs. `sent` collects the prompts the mod submits.
function world(on: On, disk: Record<string, unknown>) {
  const files: Record<string, string> = Object.fromEntries(Object.entries(disk).map(([k, v]) => [k, JSON.stringify(v)]))
  const sent: { text: string; asUser?: boolean }[] = []
  const under = (folder: string) => Object.keys(files).filter(p => p.startsWith(`${folder}/`))
  mock.env(on, { HOME: '/h' })
  const clock = mock.clock(on)
  const store: Record<string, unknown> = {} // the mod's store, open to the test
  on('store.get', async (_$, e: any) => ({ value: store[e.key] }))
  on('store.set', async (_$, e: any) => { store[e.key] = e.value; return { value: undefined } })
  on('store.delete', async (_$, e: any) => { delete store[e.key]; return { value: undefined } })
  on('session.id', async () => ({ value: 'S1' }))
  on('session.cwd', async () => ({ value: '/work' }))
  on('fs.list', async (_$, e) => ({ value: [...new Set(under(e.path).map(p => p.slice(e.path.length + 1).split('/')[0]))].map(name => ({ name, kind: under(`${e.path}/${name}`).length ? 'dir' : 'file', size: 0, mtimeMs: 0, isLink: false })) }))
  on('fs.exists', async (_$, e) => ({ value: e.path in files || under(e.path).length > 0 }))
  on('fs.read', async (_$, e) => ({ value: files[e.path] }))
  on('fs.write', async (_$, e) => { files[e.path] = e.text; return { value: undefined } })
  const toasts: string[] = []
  on('ui.toast', async (_$, e: any) => { toasts.push(e.text); return { value: undefined } })
  on('ui.open', async () => ({ value: { isPlaced: true } }))
  on('ui.close', async () => ({ value: undefined }))
  on('tool.register', async () => ({ value: undefined }))
  on('prompt.submit', async (_$, e) => { sent.push({ text: e.text, asUser: (e as any).origin?.asUser }); return { text: e.text } })
  return { files, sent, store, toasts, clock }
}

test('/process opens the pane, and the Continue tab counts the processes', async ($, on) => {
  world(on, { [`${HOME}/active/p1/process.json`]: process })
  await $.command.run({ command: 'process', args: '' })
  const ui = await $.ui.mount(PANE)
  expect(await ui.find({ type: 'Button', key: 'tab-continue' })).toBeDefined()
  await ui.press({ key: 'tab-continue' })
  expect(await ui.find({ type: 'Button', key: 'process-0' })).toBeDefined()
})

test('Create refuses an empty required field, then starts the process and hands it to the agent', async ($, on) => {
  const w = world(on, { [`${T}/bug.json`]: template, [`${T}/design/design.json`]: { type: 'step', id: 'r1' } })
  await $.command.run({ command: 'process', args: '' })
  const ui = await $.ui.mount(PANE)
  await ui.press({ key: 'start-dev/bug' })
  await ui.press({ key: 'create' })
  expect(await ui.find({ type: 'Text', text: 'Fill in: workItemId' })).toBeDefined()
  expect(w.sent).toEqual([])

  await ui.input({ key: 'field-workItemId', text: '7', kind: 'change' })
  await ui.press({ key: 'create' })
  expect(w.sent).toHaveLength(1)
  expect(w.sent[0].asUser).toBe(true)
  expect(w.sent[0].text).toContain('I started the process "bug"')
  expect(Object.keys(w.files).some(p => /\/active\/bug-\d{8}-\d{6}\/process\.json$/.test(p))).toBe(true)
})

test('Resume binds the process and hands it to the agent', async ($, on) => {
  const w = world(on, { [`${HOME}/active/p1/process.json`]: process })
  await $.command.run({ command: 'process', args: '' })
  const ui = await $.ui.mount(PANE)
  await ui.press({ key: 'tab-continue' })
  await ui.press({ key: 'process-0' })
  expect(w.sent[0].text).toContain('I resumed the process "Old fix"')
})

test('the New list shows the marketplace templates with a state, and Install makes one startable', async ($, on) => {
  const CACHE = `${HOME}/cache/sources/official`
  const runs: string[][] = []
  const w = world(on, {
    [`${HOME}/config/marketplaces.json`]: { marketplaces: [{ name: 'official', url: 'u', branch: 'main', enabled: true, priority: 1 }] },
    [`${CACHE}/templates/processes/dev/bug/bug.json`]: { type: 'template', name: 'bug', metadata: { title: 'Bug' } },
  })
  on('process.run', async (_$, e: any) => {
    runs.push(e.argv)
    if (e.argv[0] === 'cp') for (const p of Object.keys(w.files)) if (p.startsWith(`${e.argv[2]}/`)) w.files[e.argv[3] + p.slice(e.argv[2].length)] = w.files[p]
    return { value: { exitCode: 0, stdout: 'abc\n', stderr: '', timedOut: false } } as never
  })
  await $.command.run({ command: 'process', args: '' })
  const ui = await $.ui.mount(PANE)
  expect(await ui.find({ type: 'Text', text: 'not installed' })).toBeDefined()
  expect(await ui.find({ type: 'Button', key: 'start-dev/bug' })).toBeUndefined() // only an installed template can start
  await ui.press({ key: 'tpl-install-dev/bug' })
  expect(runs.map(r => r[0]).filter(c => c !== 'git')).toEqual(['rm', 'mkdir', 'cp'])
  expect(await ui.find({ type: 'Button', key: 'start-dev/bug' })).toBeDefined()
})

test('search and favorites narrow the New list; a template opens with Overview, Steps, Memory flow and Raw', async ($, on) => {
  const ran: string[][] = []
  on('process.run', async (_$, e: any) => { ran.push(e.argv); return { value: { exitCode: 0, stdout: '', stderr: '' } } })
  const other = `${HOME}/templates/processes/infra/set`
  const w = world(on, {
    [`${T}/bug.json`]: { ...template, metadata: { title: 'Bug', purposeAndUsage: 'Fix a bug.' }, steps: [{ number: 1, name: 'Design', stepRef: 'r1' }] },
    [`${T}/design/design.json`]: { type: 'step', id: 'r1', output: { description: 'a design' }, guidance: { prerequisites: ['read the bug'] }, memoryFileUsage: { writeTo: ['bug.json'] } },
    [`${other}/set.json`]: { type: 'template', name: 'set', metadata: { title: 'Set' }, parameters: {}, steps: [] },
  })
  await $.command.run({ command: 'process', args: '' })
  const ui = await $.ui.mount(PANE)
  const has = async (key: string) => (await ui.find({ type: 'Button', key })) !== undefined
  expect(await has('start-dev/bug')).toBe(true)
  expect(await has('start-infra/set')).toBe(true)
  await ui.input({ key: 'search', text: 'fix', kind: 'change' })
  expect(await has('start-dev/bug')).toBe(true)
  expect(await has('start-infra/set')).toBe(false)
  await ui.input({ key: 'search', text: '', kind: 'change' })
  await ui.press({ key: 'fav-infra/set' })
  expect(w.store.favorites).toEqual(['infra/set'])
  await ui.press({ key: 'cat-fav' })
  expect(await has('start-dev/bug')).toBe(false)
  await ui.press({ key: 'cat-all' })

  await ui.press({ key: 'template-dev/bug' })
  expect(await ui.find({ type: 'Text', text: '  Fix a bug.' })).toBeDefined()
  await ui.press({ key: 'td-steps' })
  await ui.press({ key: 'tdstep-1' })
  expect(await ui.find({ type: 'Text', text: '     guidance: read the bug' })).toBeDefined()
  await ui.press({ key: 'td-flow' })
  expect(await ui.find({ type: 'Text', text: 'W writes · R reads · R/W both' })).toBeDefined()
  await ui.press({ key: 'td-raw' })
  await ui.press({ key: 'raw-open' }) // the pane draws no JSON: the file goes to the editor
  expect(ran).toEqual([['code', '--goto', `${T}/bug.json`]])
  await ui.press({ key: 'td-back' })
  expect(await has('search')).toBe(false) // an Input, not a Button
  expect(await ui.find({ type: 'Input', key: 'search' })).toBeDefined()
})

test('marketplaces: Add saves a line, Off switches it, Remove needs two presses', async ($, on) => {
  const w = world(on, { [`${HOME}/config/marketplaces.json`]: { marketplaces: [] } })
  const runs: string[][] = []
  on('process.run', async (_$, e: any) => { runs.push(e.argv); return { value: { exitCode: 0, stdout: '', stderr: '', timedOut: false } } as never })
  const saved = () => JSON.parse(w.files[`${HOME}/config/marketplaces.json`]).marketplaces
  await $.command.run({ command: 'process', args: '' })
  const ui = await $.ui.mount(PANE)
  await ui.press({ key: 'mk-open' })
  await ui.press({ key: 'mk-add' })
  await ui.press({ key: 'mk-save' })
  expect(await ui.find({ type: 'Text', text: 'Not a plain name: ' })).toBeDefined() // the form stays, with the reason
  await ui.input({ key: 'mk-field-name', text: 'team', kind: 'change' })
  await ui.input({ key: 'mk-field-url', text: 'https://x/t.git', kind: 'change' })
  await ui.press({ key: 'mk-save' })
  expect(saved()).toMatchObject([{ name: 'team', url: 'https://x/t.git', branch: 'main', enabled: true }])
  await ui.press({ key: 'mk-toggle-0' })
  expect(saved()[0].enabled).toBe(false)
  await ui.press({ key: 'mk-remove-0' })
  expect(saved()).toHaveLength(1) // the first press only asks
  expect(await ui.find({ type: 'Button', key: 'mk-remove-0', label: 'Sure?' })).toBeDefined()
  await ui.press({ key: 'mk-remove-0' })
  expect(saved()).toEqual([])
  expect(runs).toEqual([['rm', '-rf', `${HOME}/cache/sources/team`]])
})

test('/process templates opens that tab, and another word still goes to the first field', async ($, on) => {
  world(on, { [`${HOME}/config/marketplaces.json`]: { marketplaces: [] }, [`${T}/bug.json`]: template, [`${T}/design/design.json`]: { type: 'step', id: 'r1' } })
  await $.command.run({ command: 'process', args: 'templates' })
  let ui = await $.ui.mount(PANE)
  expect(await ui.find({ type: 'Button', key: 'mk-add' })).toBeDefined()
  await ui.unmount()
  await $.command.run({ command: 'process', args: '99' })
  ui = await $.ui.mount(PANE)
  await ui.press({ key: 'start-dev/bug' })
  expect(await ui.find({ type: 'Input', key: 'field-workItemId', value: '99' })).toBeDefined()
})

test('Delete on a Continue card asks twice, then moves the folder; the process of this session stays', async ($, on) => {
  const moves: string[][] = []
  on('process.run', async (_$, e: any) => { moves.push(e.argv); return { value: { exitCode: 0, stdout: '', stderr: '' } } })
  const mine = `${HOME}/active/mine`
  const w = world(on, { [`${HOME}/active/p1/process.json`]: process, [`${mine}/process.json`]: { ...process, name: 'Mine', metadata: { lastUpdated: '2026-01-02T10:00:00Z', projectPaths: ['/work'] } } })
  w.store['session:S1'] = [mine]
  await $.command.run({ command: 'process', args: 'continue' })
  const ui = await $.ui.mount(PANE)
  await ui.press({ key: 'del-0' }) // the newest card is the bound process: it stays
  expect(await ui.find({ type: 'Text', text: 'This session works on that process. Close it first.' })).toBeDefined()
  expect(moves).toEqual([])
  await ui.press({ key: 'del-1' })
  expect(await ui.find({ type: 'Button', key: 'del-1', label: 'Sure?' })).toBeDefined()
  expect(moves).toEqual([]) // the first press only asks
  await ui.press({ key: 'del-1' })
  expect(moves.flat().join(' ')).toContain(`${HOME}/deleted/p1`)
})

test('the timer redraws the list only when it changed, so a redraw cannot swallow a click', async ($, on) => {
  let redraws = 0
  on('ui.invalidate', async () => { redraws++; return { value: undefined } })
  const w = world(on, { [`${HOME}/active/p1/process.json`]: process })
  await $.command.run({ command: 'process', args: 'continue' })
  const ui = await $.ui.mount(PANE)
  await w.clock.advance(5000) // the first look
  const seen = redraws
  await w.clock.advance(5000)
  await w.clock.advance(5000)
  expect(redraws).toBe(seen) // nothing changed: no redraw
  w.files[`${HOME}/active/p1/process.json`] = JSON.stringify({ ...process, metadata: { ...process.metadata, lastUpdated: '2026-02-02T10:00:00Z' } })
  await w.clock.advance(5000)
  expect(redraws).toBeGreaterThan(seen) // the process changed: one redraw
  await ui.unmount()
})

test('a bound process redraws only when what it reads changed', async ($, on) => {
  let redraws = 0
  on('ui.invalidate', async () => { redraws++; return { value: undefined } })
  const dir = `${HOME}/active/p1`
  const w = world(on, { [`${dir}/process.json`]: { ...process, steps: [{ id: 'a', number: 1, name: 'Design', status: 'in_progress' }] } })
  w.store['session:S1'] = [dir]
  await $.command.run({ command: 'process', args: '' })
  const ui = await $.ui.mount(PANE)
  await w.clock.advance(5000) // the first look
  const seen = redraws
  await w.clock.advance(5000)
  await w.clock.advance(5000)
  expect(redraws).toBe(seen) // nothing changed: no redraw, so no click meets a redraw
  w.files[`${dir}/process.json`] = JSON.stringify({ ...process, steps: [{ id: 'a', number: 1, name: 'Design', status: 'completed' }] })
  await w.clock.advance(5000)
  expect(redraws).toBeGreaterThan(seen) // a step changed: it redraws
  await ui.unmount()
})

test('/process debug toasts each press with the button key, and /process debug again turns it off', async ($, on) => {
  const dir = `${HOME}/active/p1`
  const w = world(on, { [`${dir}/process.json`]: { ...process, steps: [{ id: 'a', number: 1, name: 'Design', status: 'pending' }] } })
  w.store['session:S1'] = [dir]
  const answer = await $.command.run({ command: 'process', args: 'debug' }) as any
  expect(JSON.stringify(answer)).toContain('Click debug on')
  expect(w.store.debugClicks).toBe(true)
  await $.command.run({ command: 'process', args: '' })
  const ui = await $.ui.mount(PANE)
  await ui.press({ key: 'sec-memory' })
  expect(w.toasts.some(t => t.startsWith('press sec-memory'))).toBe(true)
  await $.command.run({ command: 'process', args: 'debug' })
  expect(w.store.debugClicks).toBe(false)
  const count = w.toasts.length
  await ui.press({ key: 'sec-logs' })
  expect(w.toasts.length).toBe(count) // off: no toast
})

test('Continue shows this folder at first, and the switch shows every folder and is saved', async ($, on) => {
  const other = { ...process, name: 'Elsewhere', metadata: { lastUpdated: '2026-01-02T10:00:00Z', projectPaths: ['/other'] } }
  const w = world(on, { [`${HOME}/active/p1/process.json`]: process, [`${HOME}/active/p2/process.json`]: other })
  await $.command.run({ command: 'process', args: 'continue' })
  const ui = await $.ui.mount(PANE)
  expect(await ui.find({ type: 'Button', key: 'process-0', label: 'Old fix' })).toBeDefined()
  expect(await ui.find({ type: 'Button', key: 'process-1' })).toBeUndefined()
  await ui.press({ key: 'folder-all' })
  expect(await ui.find({ type: 'Button', key: 'process-1' })).toBeDefined()
  expect(w.store.allFolders).toBe(true)
  await ui.press({ key: 'folder-here' })
  expect(w.store.allFolders).toBe(false)
})

test('a step that waits puts a count on the Continue tab and on the button above the prompt', async ($, on) => {
  const waiting = { ...process, steps: [{ id: 'a', number: 0, name: 'Approve', status: 'awaiting_approval' }] }
  world(on, { [`${HOME}/active/p1/process.json`]: waiting })
  await $.command.run({ command: 'process', args: 'continue' })
  const ui = await $.ui.mount(PANE)
  expect(await ui.find({ type: 'Button', key: 'tab-continue', label: 'Continue ▲1' })).toBeDefined()
  const band = await $.ui.mount(BAND)
  expect(await band.find({ type: 'Button', key: 'band-open', label: 'Processes ▲ 1 wait' })).toBeDefined()
})

test('a process that starts to wait raises one toast within 5 seconds', async ($, on) => {
  const w = world(on, { [`${HOME}/active/p1/process.json`]: process })
  const clock = w.clock
  await $.command.run({ command: 'process', args: 'continue' })
  const band = await $.ui.mount(BAND) // the first look: nothing needs the user, and no toast
  await clock.advance(5000)
  expect(w.toasts).toEqual([])
  w.files[`${HOME}/active/p1/process.json`] = JSON.stringify({ ...process, steps: [{ id: 'a', number: 0, name: 'Approve', status: 'awaiting_approval' }] })
  await clock.advance(5000)
  await clock.advance(5000)
  expect(w.toasts).toEqual(['Old fix waits for you']) // not raised again for the same process
  await band.unmount()
})

test('the Desktop surface draws the same tabs with a rail of icons', async ($, on) => {
  world(on, { [`${HOME}/active/p1/process.json`]: process })
  await $.command.run({ command: 'process', args: 'continue' })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Svg' })).toBeDefined()
  await ui.press({ key: 'tab-new' })
  expect(await ui.find({ type: 'Button', key: 'tab-continue' })).toBeDefined()
})

test('with a process bound to the session the pane shows its steps, and Back goes to the list', async ($, on) => {
  const dir = `${HOME}/active/p1`
  const w = world(on, { [`${dir}/process.json`]: { ...process, steps: [{ id: 'a', number: 1, name: 'Design', status: 'completed' }, { id: 'b', number: 2, name: 'Build', status: 'pending' }] } })
  w.store['session:S1'] = [dir]
  await $.command.run({ command: 'process', args: '' })
  const ui = await $.ui.mount(PANE)
  expect(await ui.find({ type: 'Button', key: 'step-a', label: '1. Design' })).toBeDefined()
  expect(await ui.find({ type: 'Button', key: 'step-b', label: '2. Build' })).toBeDefined()
  expect(await ui.find({ type: 'Button', key: 'tab-new' })).toBeUndefined()
  expect(await ui.find({ type: 'Svg' })).toBeUndefined() // the terminal draws no pictures
  await ui.press({ key: 'back-list' })
  expect(await ui.find({ type: 'Button', key: 'tab-continue' })).toBeDefined()
})

test('on Desktop a bound process draws the timeline, the Graph button draws a Client graph, and Timeline goes back', async ($, on) => {
  const dir = `${HOME}/active/p1`
  const w = world(on, { [`${dir}/process.json`]: { ...process, steps: [{ id: 'a', number: 1, name: 'Design', status: 'completed' }, { id: 'b', number: 2, name: 'Build', status: 'pending' }] } })
  w.store['session:S1'] = [dir]
  await $.command.run({ command: 'process', args: '' })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Client', key: 'graph' })).toBeUndefined() // the timeline is the default on Desktop
  expect(await ui.find({ type: 'Button', key: 'step-a' })).toBeDefined()
  await ui.press({ key: 'mode-graph' })
  expect(await ui.find({ type: 'Client', key: 'graph' })).toBeDefined()
  expect(await ui.find({ type: 'Button', key: 'step-a' })).toBeUndefined()
  await ui.press({ key: 'mode-list' })
  expect(await ui.find({ type: 'Button', key: 'step-a' })).toBeDefined()
  expect(await ui.find({ type: 'Svg', alt: 'done' })).toBeDefined() // the rich look: a drawn node for each step, a ring and a bar in the header
  expect(await ui.find({ type: 'Svg', alt: 'Progress of the process' })).toBeDefined()
})

test('a bound process has Memory, Logs and Files tabs; a log row opens the step; a file opens with a Back and an editor button', async ($, on) => {
  const dir = `${HOME}/active/p1`
  const ran: string[][] = []
  on('process.run', async (_$, e: any) => { ran.push(e.argv); return { value: { exitCode: 0, stdout: '', stderr: '' } } })
  const w = world(on, {
    [`${dir}/process.json`]: { ...process, steps: [{ id: 'a', number: 1, name: 'Design', status: 'completed', stepDefinition: { memoryFileUsage: { writeTo: ['plan'] } } }, { id: 'b', number: 2, name: 'Build', status: 'pending', stepDefinition: { memoryFileUsage: { readFrom: ['plan'] } } }] },
    [`${dir}/log.json`]: { steps: { a: { timestamp: { startedAt: '2026-01-01T10:02:00Z' }, actionsTaken: ['drew it'], problemsEncountered: ['slow'] } } },
    [`${dir}/memory/plan.json`]: { entries: { a: { informationProduced: { goal: 'ship' }, updatedAt: '2026-01-01T10:03:00Z' } } },
    [`${dir}/notes.md`]: '# Notes\nhello',
  })
  w.store['session:S1'] = [dir]
  await $.command.run({ command: 'process', args: '' })
  const ui = await $.ui.mount(PANE)
  await ui.press({ key: 'sec-memory' })
  expect(await ui.find({ type: 'Text', text: 'plan  ·  written by 1  ·  read by 2' })).toBeDefined()
  await ui.press({ key: 'mem-topics' })
  await ui.press({ key: 'topic-plan' })
  expect(await ui.find({ type: 'Text', text: '    goal: ship' })).toBeDefined()
  await ui.press({ key: 'mem-history' })
  await ui.press({ key: 'mem-diffs' })
  expect(await ui.find({ type: 'Text', text: 'No topic has two entries that differ.' })).toBeDefined()
  await ui.press({ key: 'sec-logs' })
  expect(await ui.find({ type: 'Text', text: '    problem: slow' })).toBeDefined()
  await ui.press({ key: 'log-a' })
  expect(await ui.find({ type: 'Text', text: '  drew it' })).toBeDefined() // the step detail, on its Execution tab
  await ui.press({ key: 'back-steps' })
  await ui.press({ key: 'sec-files' })
  await ui.press({ key: `file-${dir}/notes.md` }) // the pane never shows the file: the terminal hands it to the editor
  expect(ran).toEqual([['code', '--goto', `${dir}/notes.md`]])
  expect(await ui.find({ type: 'Button', key: 'fw-toggle' })).toBeDefined() // still on the list
  await ui.unmount()
  const desk = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await desk.press({ key: 'sec-files' })
  await desk.press({ key: `file-${dir}/notes.md` }) // Desktop hands it to the system opener
  expect(ran[1]).toEqual(['open', `${dir}/notes.md`])
})

test('a step opens its detail with two tabs; Back and the arrows move around; a sub-process opens and the parent returns', async ($, on) => {
  const dir = `${HOME}/active/p1`, child = `${HOME}/active/kid`
  const w = world(on, {
    [`${dir}/process.json`]: { ...process, subProcessState: { parentProcess: null, childProcesses: [{ id: 'k', name: 'Lookup', status: 'running', spawnedAtStep: 'a', syncPoint: 's', processPath: child }] },
      steps: [{ id: 'a', number: 1, name: 'Design', status: 'completed', stepDefinition: { output: { description: 'a design' } } }, { id: 'b', number: 2, name: 'Build', status: 'pending' }] },
    [`${dir}/log.json`]: { steps: { a: { actionsTaken: ['drew it'] } } },
    [`${child}/process.json`]: { name: 'Lookup', metadata: {}, parameters: {}, subProcessState: { parentProcess: { name: 'Old fix', processPath: dir }, childProcesses: [] }, steps: [{ id: 'x', number: 1, name: 'Find', status: 'pending' }] },
  })
  w.store['session:S1'] = [dir]
  await $.command.run({ command: 'process', args: '' })
  const ui = await $.ui.mount(PANE)
  await ui.press({ key: 'step-a' })
  expect(await ui.find({ type: 'Text', text: '  a design' })).toBeDefined()
  await ui.press({ key: 'dtab-execution' })
  expect(await ui.find({ type: 'Text', text: '  drew it' })).toBeDefined()
  await ui.press({ key: 'step-next' })
  await ui.press({ key: 'dtab-definition' })
  expect(await ui.find({ type: 'Text', text: 'This step has no definition.' })).toBeDefined()
  expect(await ui.find({ type: 'Button', key: 'step-next' })).toBeUndefined() // the last step has no next
  await ui.press({ key: 'back-steps' })
  await ui.press({ key: 'sub-a-0' })
  expect(await ui.find({ type: 'Button', key: 'step-x' })).toBeDefined()
  await ui.press({ key: 'parent' })
  expect(await ui.find({ type: 'Button', key: 'step-a' })).toBeDefined()
})
