import { test, expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

const ACTIVE = '/h/.claude/agentic-processes/active'
const DIR = `${ACTIVE}/p1`

const proc = (status: string, steps: unknown[]) => JSON.stringify({ status, steps })
const step = (number: number, status: string) => ({ number, id: `s${number}`, name: `Step ${number} name`, status })
const json = `${DIR}/process.json`

// fake ~/.claude/agentic-processes: one process folder bound to session S1; returns the prompts submitted
function world(on: On, files: Record<string, string>, agents: { type: string; status: string }[] = []) {
  const submitted: string[] = []
  mock.env(on, { HOME: '/h' })
  const all = { [`${DIR}/.session`]: 'S1', ...files }
  on('session.id', async () => ({ value: 'S1' }))
  on('fs.list', async ($, e) => ({ value: e.path === ACTIVE ? [{ name: 'p1', kind: 'dir', size: 0, mtimeMs: 0, isLink: false }] : [] }))
  on('fs.exists', async ($, e) => ({ value: e.path in all }))
  on('fs.read', async ($, e) => { if (!(e.path in all)) throw new Error('missing'); return { value: all[e.path] } })
  on('agent.list', async () => ({ value: agents as never }))
  on('prompt.submit', async (_$, e) => { submitted.push(e.text); return { drop: 'test' } })
  on('turn.complete', async () => ({ text: '' }))
  return submitted
}
const end = ($: any, extra = {}) =>
  $.turn.complete({ answer: 'ok', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer', ...extra })

test('no process for this session: no re-prompt', async ($, on) => {
  const sent = world(on, { [json]: proc('running', [step(1, 'pending')]), [`${DIR}/.session`]: 'other' })
  await end($)
  expect(sent).toEqual([])
})
test('approval waits: no re-prompt', async ($, on) => {
  const sent = world(on, { [json]: proc('running', [step(1, 'pending')]), [`${DIR}/pending-interaction.json`]: '{}' })
  await end($)
  expect(sent).toEqual([])
})
test('process not running: no re-prompt', async ($, on) => {
  const sent = world(on, { [json]: proc('paused', [step(1, 'pending')]) })
  await end($)
  expect(sent).toEqual([])
})
test('all steps completed: no re-prompt', async ($, on) => {
  const sent = world(on, { [json]: proc('running', [step(1, 'completed')]) })
  await end($)
  expect(sent).toEqual([])
})
test('pending step: re-prompt names the step', async ($, on) => {
  const sent = world(on, { [json]: proc('running', [step(1, 'completed'), step(2, 'pending')]) })
  await end($)
  expect(sent.length).toBe(1)
  expect(sent[0]).toContain('Step 2 — "Step 2 name" (ID: s2)')
})
test('step running, no step-executor alive: re-prompt says lost', async ($, on) => {
  const sent = world(on, { [json]: proc('running', [step(1, 'in_progress')]) })
  await end($)
  expect(sent[0]).toContain('no step-executor is running')
})
test('step running, step-executor alive: re-prompt says wait', async ($, on) => {
  const sent = world(on, { [json]: proc('running', [step(1, 'in_progress')]) }, [{ type: 'agentic-processes:step-executor', status: 'running' }])
  await end($)
  expect(sent[0]).toContain('still in progress')
})
test('a subagent turn is ignored', async ($, on) => {
  const sent = world(on, { [json]: proc('running', [step(1, 'pending')]) })
  await end($, { agentId: 'a1' })
  expect(sent).toEqual([])
})
test('a user interrupt is not re-prompted', async ($, on) => {
  const sent = world(on, { [json]: proc('running', [step(1, 'pending')]) })
  await end($, { isAborted: true, reason: 'aborted' })
  expect(sent).toEqual([])
})

test('re-prompts at most 3 times in a row for the same step', async ($, on) => {
  const sent = world(on, { [json]: proc('running', [step(1, 'pending')]) })
  for (let i = 0; i < 5; i++) await end($)
  expect(sent.length).toBe(3)
})
test('a prompt from the user starts the count again', async ($, on) => {
  const sent = world(on, { [json]: proc('running', [step(1, 'pending')]) })
  for (let i = 0; i < 4; i++) await end($)
  await $.prompt.submit({ text: 'continue' })
  await end($)
  expect(sent.filter(t => t.startsWith('Process has')).length).toBe(4)
})

// approval checkpoint rule
const approvalStep = (extra = {}) => ({ ...step(1, 'in_progress'), approvalRequired: true, ...extra })
test('approval step, no checkpoint: re-prompt asks for it, before the pending rule', async ($, on) => {
  const sent = world(on, { [json]: proc('running', [approvalStep(), step(2, 'pending')]) })
  await end($)
  expect(sent[0]).toContain('Approval checkpoint required — step "Step 1 name"')
  expect(sent[0]).toContain('write-pending')
})
test('approval step with a view: text lists the data schema', async ($, on) => {
  const view = { name: 'V', operationIds: ['approve'], mockData: { approve: { note: 'x' } } }
  const sent = world(on, { [json]: proc('running', [approvalStep({ view })]) })
  await end($)
  expect(sent[0]).toContain('resolves to view "V"')
  expect(sent[0]).toContain('"approve": data must include: ["note"]')
})
test('approval step, step-executor alive: wait text', async ($, on) => {
  const sent = world(on, { [json]: proc('running', [approvalStep()]) }, [{ type: 'agentic-processes:step-executor', status: 'running' }])
  await end($)
  expect(sent[0]).toContain('still in progress')
})
test('approval step with a checkpoint file: no re-prompt', async ($, on) => {
  const sent = world(on, { [json]: proc('running', [approvalStep()]), [`${DIR}/pending-interaction.json`]: '{}' })
  await end($)
  expect(sent).toEqual([])
})
