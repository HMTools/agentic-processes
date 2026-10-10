import { test, expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

const ACTIVE = '/h/.claude/agentic-processes/active'
const DIR = `${ACTIVE}/p1`
const process = JSON.stringify({ status: 'running', steps: [], currentState: { activeStep: { id: 's7' } } })
const LOG = 'mcp__agentic-processes__log_interaction'
const LOG_INPUT = { processDir: DIR, stepId: 's7', request: 'r', reason: 'why', response: 'done' }
const LOG_FILE = JSON.stringify({ type: 'log-file', steps: {}, processWideObservations: {} })

// fake disk: one process folder bound to `bound`, with a log; the process tools run for real on it
function world(on: On, { bound = 'S1' } = {}) {
  const all: Record<string, string> = { [`${DIR}/.session`]: bound, [`${DIR}/process.json`]: process, [`${DIR}/log.json`]: LOG_FILE }
  mock.env(on, { HOME: '/h' })
  mock.store(on)
  on('session.id', async () => ({ value: 'S1' }))
  on('fs.list', async (_$, e) => ({ value: e.path === ACTIVE ? [{ name: 'p1', kind: 'dir', size: 0, mtimeMs: 0, isLink: false }] : [] }))
  on('fs.exists', async (_$, e) => ({ value: e.path in all }))
  on('fs.read', async (_$, e) => ({ value: all[e.path] }))
  on('fs.write', async (_$, e) => { all[e.path] = e.text; return { value: undefined } })
  on('prompt.submit', async () => ({ drop: 'test' }))
  on('tool.call', async () => ({ result: 'done', text: 'done' }) as never)
}
// the user sends a prompt: the agent owes a log entry
const owe = ($: any) => $.prompt.submit({ text: 'please change the plan' })
const call = ($: any, tool: string, extra = {}) => $.tool.call({ tool, file_path: '/x', content: 'y', ...extra })
const bash = ($: any, command: string, extra = {}) => call($, 'Bash', { command, ...extra })

test('log owed: Write is refused with the log text', async ($, on) => {
  world(on); await owe($)
  const r = await call($, 'Write')
  expect(r.deny).toContain('User interaction not yet logged')
  expect(r.deny).toContain('Step ID: s7')
})
for (const tool of ['Edit', 'MultiEdit', 'NotebookEdit', 'Agent', 'Task']) {
  test(`log owed: ${tool} is refused`, async ($, on) => {
    world(on); await owe($)
    expect((await call($, tool)).deny).toContain('not yet logged')
  })
}
test('log owed: Read passes', async ($, on) => {
  world(on); await owe($)
  expect((await call($, 'Read')).deny).toBeUndefined()
})
test('nothing owed: Write passes', async ($, on) => {
  world(on)
  expect((await call($, 'Write')).deny).toBeUndefined()
})
test('log owed, no process for the session: Write passes', async ($, on) => {
  world(on, { bound: 'other' }); await owe($)
  expect((await call($, 'Write')).deny).toBeUndefined()
})
test('log owed, call from a subagent: passes', async ($, on) => {
  world(on); await owe($)
  expect((await call($, 'Write', { agentId: 'a1' })).deny).toBeUndefined()
})

// the process tools
test('log owed: a tool that changes the process is refused', async ($, on) => {
  world(on); await owe($)
  expect((await call($, 'mcp__agentic-processes__update_step_status', { processDir: DIR, stepId: 's1', status: 'completed' })).deny).toContain('not yet logged')
})
test('log owed: a tool that only reads passes', async ($, on) => {
  world(on); await owe($)
  expect((await call($, 'mcp__agentic-processes__list_findings')).deny).toBeUndefined()
})
test('log owed: Bash passes, the process tools are the only way to change the process', async ($, on) => {
  world(on); await owe($)
  expect((await bash($, 'ls -la')).deny).toBeUndefined()
})
test('the log tool succeeds: the log is no longer owed, and Write passes', async ($, on) => {
  world(on); await owe($)
  expect((await call($, LOG, LOG_INPUT)).deny).toBeUndefined()
  expect((await call($, 'Write')).deny).toBeUndefined()
})
test('the log tool fails: the log is still owed', async ($, on) => {
  world(on); await owe($)
  await call($, LOG, { processDir: DIR }) // no step, no request: the tool answers an error
  expect((await call($, 'Write')).deny).toContain('not yet logged')
})
test('a new prompt owes a log again after the agent logged', async ($, on) => {
  world(on); await owe($)
  await call($, LOG, LOG_INPUT)
  await owe($)
  expect((await call($, 'Write')).deny).toContain('not yet logged')
})
