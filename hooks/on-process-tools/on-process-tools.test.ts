import { test, expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

const ACTIVE = '/h/.claude/agentic-processes/active'
const DIR = `${ACTIVE}/p1`
const NEW = `${ACTIVE}/new1`
const TOOL = (name: string) => `mcp__agentic-processes__${name}`
const processFile = JSON.stringify({ status: 'running', metadata: { lastUpdated: 'then' }, currentState: {}, steps: [{ id: 's1', name: 'Design', status: 'pending' }] })

// fake disk: one process folder bound to session S1, and a template to create another from; writes land on the disk
function world(on: On, { bound = 'S1', env = { HOME: '/h' } as Record<string, string> } = {}) {
  const all: Record<string, string> = {
    [`${DIR}/process.json`]: processFile,
    '/t/tpl.json': JSON.stringify({ name: 'T', steps: [{ name: 'Only', stepRef: '' }] }),
  }
  const registered: string[] = []
  mock.env(on, env)
  const store: Record<string, unknown> = { [`session:${bound}`]: [DIR] }
  on('store.get', async (_$, e: any) => ({ value: store[e.key] as never }))
  on('store.set', async (_$, e: any) => { store[e.key] = e.value; return { value: undefined } as never })
  on('store.delete', async (_$, e: any) => { delete store[e.key]; return { value: undefined } as never })
  on('session.id', async () => ({ value: 'S1' }))
  on('session.cwd', async () => ({ value: '/work' }))
  on('fs.list', async (_$, e) => ({ value: e.path === ACTIVE ? [{ name: 'p1', kind: 'dir', size: 0, mtimeMs: 0, isLink: false }] : [] }))
  on('fs.exists', async (_$, e) => ({ value: e.path in all || Object.keys(all).some(p => p.startsWith(`${e.path}/`)) }))
  on('fs.read', async (_$, e) => ({ value: all[e.path] }))
  on('fs.write', async (_$, e) => { all[e.path] = e.text; return { value: undefined } })
  on('tool.register', async (_$, e: any) => { registered.push(e.name); return { value: { tool: `mcp__agentic-processes__${e.name}` } } as never })
  on('prompt.submit', async () => ({ drop: 'test' }))
  on('tool.call', async () => ({ result: 'done', text: 'done' }) as never)
  return { all, registered, store }
}
const answer = (r: any) => JSON.parse(r.result.content[0].text)

test('a process tool runs and answers with the script-style result', async ($, on) => {
  const w = world(on)
  const r = await $.tool.call({ tool: TOOL('update_step_status'), processDir: DIR, stepId: 's1', status: 'in_progress' })
  expect(answer(r)).toEqual({ status: 'ok', files_written: ['process.json'] })
  expect(JSON.parse(w.all[`${DIR}/process.json`]).steps[0].status).toBe('in_progress')
})
test('a failing rule is an error result, and the model can read the message', async ($, on) => {
  world(on)
  const r = await $.tool.call({ tool: TOOL('update_step_status'), processDir: DIR, stepId: 'zzz', status: 'completed' })
  expect(r.result.isError).toBe(true)
  expect(answer(r)).toEqual({ status: 'error', message: 'Step zzz not found' })
})
test('create_process binds the new process to the session', async ($, on) => {
  const w = world(on)
  const r = await $.tool.call({ tool: TOOL('create_process'), processDir: NEW, templatePath: '/t/tpl.json' })
  expect(answer(r).status).toBe('ok')
  expect(w.store['session:S1']).toEqual([DIR, NEW]) // the newest goes last, and answers first
})
test('bind_process links a resumed process to the new session', async ($, on) => {
  const w = world(on, { bound: 'old' })
  const r = await $.tool.call({ tool: TOOL('bind_process'), processDir: DIR })
  expect(answer(r).status).toBe('ok')
  expect(w.store['session:S1']).toEqual([DIR])
})
test('bind_process on a wrong folder is an error result', async ($, on) => {
  world(on)
  const r = await $.tool.call({ tool: TOOL('bind_process'), processDir: '/h/elsewhere' })
  expect(r.result.isError).toBe(true)
})
test('create_process that fails binds nothing', async ($, on) => {
  const w = world(on)
  await $.tool.call({ tool: TOOL('create_process'), processDir: NEW, templatePath: '/nope.json' })
  expect(w.store['session:S1']).toEqual([DIR])
})
test('a prompt in a session with a process lists the tools, once', async ($, on) => {
  const w = world(on)
  await $.prompt.submit({ text: 'continue' })
  await $.prompt.submit({ text: 'and again' })
  expect(w.registered.length).toBe(17)
  expect(w.registered).toContain('create_process')
  expect(w.registered).toContain('request_approval')
})
test('Windows has USERPROFILE and no HOME: the process is still found', async ($, on) => {
  const w = world(on, { env: { USERPROFILE: '/h', OS: 'Windows_NT' } })
  await $.prompt.submit({ text: 'continue' })
  expect(w.registered.length).toBe(17)
})
test('a prompt in a session with no process lists nothing', async ($, on) => {
  const w = world(on, { bound: 'other' })
  await $.prompt.submit({ text: 'hello' })
  expect(w.registered).toEqual([])
})
