import { test, expect } from 'claude-code/testing'
import { APPROVE, CHANGES, askGate, findApprovalStep, hasOpenGate, isHandEdit, questionFor, reopenPanel } from './approval-gate'
import type { Ask, FileSystem, Gate, GateStore } from '../ports/ports'

const DIR = '/h/.claude/agentic-processes/active/p1'
const gate: Gate = { dir: DIR, stepId: 's1' }
const step = { id: 's1', number: 1, name: 'Design', status: 'in_progress', approvalRequired: true, stepDefinition: { output: { description: 'The design', artifacts: ['design.md'] } } }
const processJson = (extra = {}) => JSON.stringify({ status: 'running', metadata: { lastUpdated: 'then' }, steps: [{ ...step, ...extra }] })

// a fake disk with one process.json; writes land in `written`
function world(json = processJson()) {
  const written: Record<string, string> = {}
  const files: FileSystem = {
    home: async () => '/h', list: async () => [], exists: async p => p === `${DIR}/process.json`,
    read: async p => { if (p !== `${DIR}/process.json`) throw new Error('missing'); return json },
  }
  const write = async (path: string, text: string) => { written[path] = text }
  const gates = new Map<string, Gate>([['S1', gate]])
  const store: GateStore = {
    get: async id => gates.get(id), set: async (id, g) => { gates.set(id, g) }, clear: async id => { gates.delete(id) },
  }
  return { files, write, store, written }
}
const answers = (label: string): Ask => async () => label

test('the question names the step, its output and the folder', () => {
  const q = questionFor(step, DIR)
  expect(q).toContain('Approve step 1 "Design"?')
  expect(q).toContain('The design')
  expect(q).toContain('Output: design.md')
  expect(q).toContain(`Process dir: ${DIR}`)
})
test('the step to approve is the one in progress, not yet approved', () => {
  expect(findApprovalStep({ steps: [step] })?.id).toBe('s1')
  expect(findApprovalStep({ steps: [{ ...step, approved: true }] })).toBeUndefined()
  expect(findApprovalStep({ steps: [{ ...step, status: 'pending' }] })).toBeUndefined()
  expect(findApprovalStep({ steps: [{ ...step, approvalRequired: false }] })).toBeUndefined()
})

test('Approve: sets approved, keeps the other fields, closes the gate', async () => {
  const w = world()
  const text = await askGate(w.files, w.write, w.store, answers(APPROVE), 'S1', gate)
  expect(text).toContain('The user approved step 1')
  const saved = JSON.parse(w.written[`${DIR}/process.json`])
  expect(saved.steps[0].approved).toBe(true)
  expect(saved.steps[0].name).toBe('Design')
  expect(saved.metadata.lastUpdated).not.toBe('then')
  expect(await hasOpenGate(w.store, 'S1')).toBe(false)
})
test('Request changes with text: the agent reads the text, nothing is approved', async () => {
  const w = world()
  const text = await askGate(w.files, w.write, w.store, answers('use blue'), 'S1', gate)
  expect(text).toContain('use blue')
  expect(w.written).toEqual({})
  expect(await hasOpenGate(w.store, 'S1')).toBe(false)
})
test('Request changes with no text', async () => {
  const w = world()
  expect(await askGate(w.files, w.write, w.store, answers(CHANGES), 'S1', gate)).toContain('(no text given)')
  expect(w.written).toEqual({})
})
test('a dismissed dialog: nothing is approved and the gate stays open', async () => {
  const w = world()
  const text = await askGate(w.files, w.write, w.store, async () => { throw new Error('dismissed') }, 'S1', gate)
  expect(text).toContain('only the user can approve')
  expect(w.written).toEqual({})
  expect(await hasOpenGate(w.store, 'S1')).toBe(true)
})
test('a gate for a step that is gone is closed', async () => {
  const w = world(JSON.stringify({ steps: [] }))
  expect(await askGate(w.files, w.write, w.store, answers(APPROVE), 'S1', gate)).toContain('no longer in the process')
  expect(w.written).toEqual({})
  expect(await hasOpenGate(w.store, 'S1')).toBe(false)
})
test('one question at a time: the second asker gets nothing', async () => {
  const w = world()
  let release = () => {}
  const slow: Ask = () => new Promise(resolve => { release = () => resolve(APPROVE) })
  const first = askGate(w.files, w.write, w.store, slow, 'S1', gate)
  await new Promise(r => setTimeout(r, 0))
  expect(await askGate(w.files, w.write, w.store, answers(APPROVE), 'S1', gate)).toBeUndefined()
  release()
  expect(await first).toContain('approved')
})

test('a prompt with an open gate: the dialog opens and the answer is sent as a prompt', async () => {
  const w = world()
  const sent: string[] = []
  await reopenPanel(w.files, w.write, w.store, answers(APPROVE), async t => { sent.push(t) }, 'S1')
  await new Promise(r => setTimeout(r, 0))
  expect(sent[0]).toContain('The user approved step 1')
})
test('a prompt with an open gate and a dismissed dialog: nothing is sent', async () => {
  const w = world()
  const sent: string[] = []
  await reopenPanel(w.files, w.write, w.store, async () => { throw new Error('dismissed') }, async t => { sent.push(t) }, 'S1')
  await new Promise(r => setTimeout(r, 0))
  expect(sent).toEqual([])
  expect(await hasOpenGate(w.store, 'S1')).toBe(true)
})
test('a prompt with no gate: nothing happens', async () => {
  const w = world()
  await w.store.clear('S1')
  const sent: string[] = []
  await reopenPanel(w.files, w.write, w.store, answers(APPROVE), async t => { sent.push(t) }, 'S1')
  await new Promise(r => setTimeout(r, 0))
  expect(sent).toEqual([])
})

const P = '/h/.claude/agentic-processes/active/p1/process.json'
for (const tool of ['Write', 'Edit', 'MultiEdit']) {
  test(`hand edit: ${tool} on a process file is refused`, () => expect(isHandEdit({ tool, file_path: P })).toBe(true))
}
test('hand edit: a Write to another file passes', () => {
  expect(isHandEdit({ tool: 'Write', file_path: '/h/.claude/agentic-processes/active/p1/notes.md' })).toBe(false)
  expect(isHandEdit({ tool: 'Write', file_path: '/work/app/process.json' })).toBe(false)
})
for (const file of ['log.json', 'memory/context.json', 'memory/_cross-references.json']) {
  test(`hand edit: Write on ${file} is refused`, () => {
    expect(isHandEdit({ tool: 'Write', file_path: `/h/.claude/agentic-processes/active/p1/${file}` })).toBe(true)
    expect(isHandEdit({ tool: 'Edit', file_path: `/h/.claude/agentic-processes/completed/p1/${file}` })).toBe(true)
  })
}
test('hand edit: Windows paths, with backslashes, are refused too', () => {
  expect(isHandEdit({ tool: 'Write', file_path: 'C:\\Users\\me\\.claude\\agentic-processes\\active\\p1\\process.json' })).toBe(true)
  expect(isHandEdit({ tool: 'Edit', file_path: 'C:\\Users\\me\\.claude\\agentic-processes\\completed\\p1\\memory\\context.json' })).toBe(true)
  expect(isHandEdit({ tool: 'Write', file_path: 'C:\\Users\\me\\.claude\\agentic-processes\\active\\p1\\notes.md' })).toBe(false)
  expect(isHandEdit({ tool: 'Bash', command: 'sed -i s/a/b/ C:\\Users\\me\\.claude\\agentic-processes\\active\\p1\\memory\\context.json' })).toBe(true)
})
test('hand edit: Write on an improvement finding is refused', () => {
  expect(isHandEdit({ tool: 'Write', file_path: '/h/.claude/agentic-processes/improvement-findings/t1/p1.json' })).toBe(true)
})
test('hand edit: Bash that writes log.json is refused', () => {
  expect(isHandEdit({ tool: 'Bash', command: `echo '{}' > ${P.replace('process.json', 'log.json')}` })).toBe(true)
})
for (const command of [
  `sed -i 's/false/true/' ${P}`,
  `echo '{}' > ${P}`,
  `python3 -c "import json; open('${P}','w').write('{}')"`,
  `cat x | tee ${P}`,
  `jq '.a=1' ${P} > /tmp/x && mv /tmp/x ${P}`,
]) {
  test(`hand edit: Bash refused: ${command.slice(0, 40)}`, () => expect(isHandEdit({ tool: 'Bash', command })).toBe(true))
}
for (const command of [`cat ${P}`, `ls ${P} 2>/dev/null`, 'python3 /x/process_manager.py update-step-status --process-dir /p', 'git status']) {
  test(`hand edit: Bash passes: ${command.slice(0, 40)}`, () => expect(isHandEdit({ tool: 'Bash', command })).toBe(false))
}
test('hand edit: other tools pass', () => expect(isHandEdit({ tool: 'Read', file_path: P })).toBe(false))
