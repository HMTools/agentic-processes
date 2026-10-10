import { test, expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

const HOME = '/h/.claude/agentic-processes'
const T = `${HOME}/templates/processes/dev/bug`
const PANE = {
  plugin: 'agentic-processes', component: 'Pane', requestId: 'process-pane', surface: 'terminal', viewport: { columns: 100, rows: 30 },
  props: { title: 'Process', isFocused: true, bodyColumns: 60, placement: 'inline', scroll: { offset: 0, bodyRows: 10 }, view: {} },
} as const

const template = { type: 'template', name: 'bug', category: 'dev', parameters: { required: ['workItemId'], optional: [], definitions: { workItemId: { example: '7' } } }, steps: [{ name: 'Design', stepRef: 'r1' }] }
const process = { name: 'Old fix', metadata: { lastUpdated: '2026-01-01T10:00:00Z' }, parameters: {}, steps: [{ id: 'a', number: 0, name: 'Design', status: 'pending' }] }

// A fake disk (path → text) with the stubs a pane needs. `sent` collects the prompts the mod submits.
function world(on: On, disk: Record<string, unknown>) {
  const files: Record<string, string> = Object.fromEntries(Object.entries(disk).map(([k, v]) => [k, JSON.stringify(v)]))
  const sent: { text: string; asUser?: boolean }[] = []
  const under = (folder: string) => Object.keys(files).filter(p => p.startsWith(`${folder}/`))
  mock.env(on, { HOME: '/h' })
  mock.store(on, {})
  on('session.id', async () => ({ value: 'S1' }))
  on('session.cwd', async () => ({ value: '/work' }))
  on('fs.list', async (_$, e) => ({ value: [...new Set(under(e.path).map(p => p.slice(e.path.length + 1).split('/')[0]))].map(name => ({ name, kind: under(`${e.path}/${name}`).length ? 'dir' : 'file', size: 0, mtimeMs: 0, isLink: false })) }))
  on('fs.exists', async (_$, e) => ({ value: e.path in files || under(e.path).length > 0 }))
  on('fs.read', async (_$, e) => ({ value: files[e.path] }))
  on('fs.write', async (_$, e) => { files[e.path] = e.text; return { value: undefined } })
  on('ui.open', async () => ({ value: { isPlaced: true } }))
  on('ui.close', async () => ({ value: undefined }))
  on('tool.register', async () => ({ value: undefined }))
  on('prompt.submit', async (_$, e) => { sent.push({ text: e.text, asUser: (e as any).origin?.asUser }); return { text: e.text } })
  return { files, sent }
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
  await ui.press({ key: 'template-0' })
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

test('the Templates tab lists the cache, installs a template and shows it on the New tab', async ($, on) => {
  const CACHE = `${HOME}/cache/sources/official`
  const runs: string[][] = []
  const w = world(on, {
    [`${HOME}/config/marketplaces.json`]: { marketplaces: [{ name: 'official', url: 'u', branch: 'main', enabled: true, priority: 1 }] },
    [`${CACHE}/templates/processes/dev/bug/bug.json`]: { metadata: { title: 'Bug' } },
  })
  on('process.run', async (_$, e: any) => {
    runs.push(e.argv)
    if (e.argv[0] === 'cp') for (const p of Object.keys(w.files)) if (p.startsWith(`${e.argv[2]}/`)) w.files[e.argv[3] + p.slice(e.argv[2].length)] = w.files[p]
    return { value: { exitCode: 0, stdout: 'abc\n', stderr: '', timedOut: false } } as never
  })
  await $.command.run({ command: 'process', args: '' })
  const ui = await $.ui.mount(PANE)
  await ui.press({ key: 'tab-templates' })
  expect(await ui.find({ type: 'Text', text: 'dev / bug  ·  not installed' })).toBeDefined()
  await ui.press({ key: 'tpl-install-0' })
  expect(runs.map(r => r[0]).filter(c => c !== 'git')).toEqual(['rm', 'mkdir', 'cp'])
  expect(await ui.find({ type: 'Text', text: 'dev / bug  ·  installed' })).toBeDefined()
})

test('marketplaces: Add saves a line, Off switches it, Remove needs two presses', async ($, on) => {
  const w = world(on, { [`${HOME}/config/marketplaces.json`]: { marketplaces: [] } })
  const runs: string[][] = []
  on('process.run', async (_$, e: any) => { runs.push(e.argv); return { value: { exitCode: 0, stdout: '', stderr: '', timedOut: false } } as never })
  const saved = () => JSON.parse(w.files[`${HOME}/config/marketplaces.json`]).marketplaces
  await $.command.run({ command: 'process', args: '' })
  const ui = await $.ui.mount(PANE)
  await ui.press({ key: 'tab-templates' })
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
