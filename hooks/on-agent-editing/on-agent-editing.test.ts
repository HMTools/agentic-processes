import { test, expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

const ACTIVE = '/h/.claude/agentic-processes/active'
const DIR = `${ACTIVE}/p1`
const process = JSON.stringify({ status: 'running', steps: [], currentState: { activeStep: { id: 's7' } } })
const LOG = 'python3 /x/scripts/process_manager.py log-interaction --process-dir /p'

// fake disk: one process folder bound to `bound`; the tool itself answers "done" (or an error)
function world(on: On, { bound = 'S1', failTool = false } = {}) {
  const all: Record<string, string> = { [`${DIR}/.session`]: bound, [`${DIR}/process.json`]: process }
  mock.env(on, { HOME: '/h' })
  on('session.id', async () => ({ value: 'S1' }))
  on('fs.list', async (_$, e) => ({ value: e.path === ACTIVE ? [{ name: 'p1', kind: 'dir', size: 0, mtimeMs: 0, isLink: false }] : [] }))
  on('fs.exists', async (_$, e) => ({ value: e.path in all }))
  on('fs.read', async (_$, e) => ({ value: all[e.path] }))
  on('prompt.submit', async () => ({ drop: 'test' }))
  on('tool.call', async () => ({ result: 'done', text: 'done', ...(failTool ? { isError: true } : {}) }) as never)
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

// Bash
test('log owed: an ordinary Bash command passes', async ($, on) => {
  world(on); await owe($)
  expect((await bash($, 'ls -la')).deny).toBeUndefined()
})
test('log owed: a command that changes the process is refused', async ($, on) => {
  world(on); await owe($)
  expect((await bash($, 'python3 /x/process_manager.py update-step-status --step-id s1')).deny).toContain('not yet logged')
})
test('log owed: write-pending --delete passes', async ($, on) => {
  world(on); await owe($)
  expect((await bash($, 'python3 /x/process_manager.py write-pending --process-dir /p --delete')).deny).toBeUndefined()
})
test('the log command succeeds: the log is no longer owed, and Write passes', async ($, on) => {
  world(on); await owe($)
  expect((await bash($, LOG)).deny).toBeUndefined()
  expect((await call($, 'Write')).deny).toBeUndefined()
})
test('the log command fails: the log is still owed', async ($, on) => {
  world(on, { failTool: true }); await owe($)
  await bash($, LOG)
  expect((await call($, 'Write')).deny).toContain('not yet logged')
})
test('a fake mention of the log command does not clear it', async ($, on) => {
  world(on); await owe($)
  await bash($, 'echo process_manager.py log-interaction > x')
  expect((await call($, 'Write')).deny).toContain('not yet logged')
})
test('a new prompt owes a log again after the agent logged', async ($, on) => {
  world(on); await owe($)
  await bash($, LOG)
  await owe($)
  expect((await call($, 'Write')).deny).toContain('not yet logged')
})
