import { test, expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

const ACTIVE = '/h/.claude/agentic-processes/active'
const DIR = `${ACTIVE}/p1`
const process = JSON.stringify({ status: 'running', steps: [], currentState: { activeStep: { id: 's7' } } })

// fake disk: one process folder bound to `bound`; the pending file is there or not
function world(on: On, { pending = true, bound = 'S1' } = {}) {
  const all: Record<string, string> = { [`${DIR}/.session`]: bound, [`${DIR}/process.json`]: process }
  if (pending) all[`${DIR}/pending-interaction.json`] = '{}'
  mock.env(on, { HOME: '/h' })
  on('session.id', async () => ({ value: 'S1' }))
  on('fs.list', async (_$, e) => ({ value: e.path === ACTIVE ? [{ name: 'p1', kind: 'dir', size: 0, mtimeMs: 0, isLink: false }] : [] }))
  on('fs.exists', async (_$, e) => ({ value: e.path in all }))
  on('fs.read', async (_$, e) => ({ value: all[e.path] }))
  on('tool.call', async () => ({ result: 'done', text: 'done' }) as never)
}
const call = ($: any, tool: string, extra = {}) => $.tool.call({ tool, file_path: '/x', content: 'y', ...extra })
const bash = ($: any, command: string) => call($, 'Bash', { command })

for (const tool of ['Read', 'Glob', 'Grep', 'LS', 'WebFetch', 'WebSearch']) {
  test(`pending: ${tool} passes`, async ($, on) => {
    world(on)
    expect((await call($, tool)).deny).toBeUndefined()
  })
}
for (const tool of ['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Agent', 'Task', 'mcp__x__y', 'TodoWrite']) {
  test(`pending: ${tool} is refused`, async ($, on) => {
    world(on)
    const r = await call($, tool)
    expect(r.deny).toContain('Approval checkpoint active')
    expect(r.deny).toContain('Step ID: s7')
  })
}
test('pending: a Write to a process file is refused', async ($, on) => {
  world(on)
  expect((await call($, 'Write', { file_path: `${DIR}/log.json` })).deny).toContain('Approval checkpoint')
})
test('pending: the approve token in the bound folder passes', async ($, on) => {
  world(on)
  expect((await call($, 'Write', { file_path: `${DIR}/.approve-token` })).deny).toBeUndefined()
})
test('pending: a token file elsewhere is refused', async ($, on) => {
  world(on)
  expect((await call($, 'Write', { file_path: '/tmp/.approve-token' })).deny).toContain('Approval checkpoint')
})
test('pending: a process_manager.py run passes', async ($, on) => {
  world(on)
  expect((await bash($, 'python3 /x/scripts/process_manager.py write-pending --process-dir /p --delete')).deny).toBeUndefined()
})
test('pending: a fake mention of process_manager.py is refused', async ($, on) => {
  world(on)
  expect((await bash($, 'echo process_manager.py; rm -rf x')).deny).toContain('Approval checkpoint')
  expect((await bash($, 'ls # process_manager.py')).deny).toContain('Approval checkpoint')
})
test('pending: a subagent call is refused too', async ($, on) => {
  world(on)
  expect((await call($, 'Write', { agentId: 'a1' })).deny).toContain('Approval checkpoint')
})
test('no pending file: Write passes', async ($, on) => {
  world(on, { pending: false })
  expect((await call($, 'Write')).deny).toBeUndefined()
})
test('pending file of another session: Write passes', async ($, on) => {
  world(on, { bound: 'other' })
  expect((await call($, 'Write')).deny).toBeUndefined()
})
