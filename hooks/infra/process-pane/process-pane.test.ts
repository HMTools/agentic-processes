import { test, expect } from 'claude-code/testing'
import { ACTIVE, processFile, step, world } from '../process-manager/fake-world'
import { boundView, dirNameFor, handoff, inFolder, listProcesses, listTemplates, resumeProcess, startProcess, waitingCount } from './process-pane'

const T = '/h/.claude/agentic-processes/templates/processes/dev/bug'
const template = {
  type: 'template', name: 'bug', id: 'tid', category: 'dev',
  parameters: { required: ['workItemId'], optional: ['repo'], definitions: { workItemId: { description: 'the item', example: '1345467' } } },
  steps: [{ name: 'Design', stepRef: 'r1' }],
}
const disk = () => ({
  [`${T}/bug.json`]: template,
  [`${T}/design/design.json`]: { type: 'step', id: 'r1' },
  '/h/.claude/agentic-processes/templates/processes/dev/notes/notes.json': { type: 'other' },
  '/plugin/framework-steps/x/x.json': { type: 'other' },
})

test('templates come with their fields, required first, and a file that is no template is left out', async () => {
  const [t, ...rest] = await listTemplates(world(disk()).ports.files)
  expect(rest).toEqual([])
  expect(t).toMatchObject({ category: 'dev', name: 'bug', path: `${T}/bug.json` })
  expect(t.fields).toEqual([
    { name: 'workItemId', required: true, example: '1345467', description: 'the item' },
    { name: 'repo', required: false, example: '', description: '' },
  ])
})
test('no templates folder gives an empty list', async () => {
  expect(await listTemplates(world().ports.files)).toEqual([])
})

test('processes list the next step and the newest change first', async () => {
  const done = step({ id: 'a', number: 0, status: 'completed' })
  const todo = step({ id: 'b', number: 1, status: 'pending' })
  const w = world({
    [`${ACTIVE}/old/process.json`]: processFile({ name: 'Old', metadata: { lastUpdated: '2026-01-01T10:00:00Z' } }, [done, todo]),
    [`${ACTIVE}/new/process.json`]: processFile({ name: 'New', metadata: { lastUpdated: '2026-02-01T10:00:00Z' } }, [todo]),
  })
  expect(await listProcesses(w.ports.files)).toEqual([
    { dir: `${ACTIVE}/new`, name: 'New', step: 1, total: 1, updated: '2026-02-01 10:00', kind: 'running', folders: [] },
    { dir: `${ACTIVE}/old`, name: 'Old', step: 2, total: 2, updated: '2026-01-01 10:00', kind: 'running', folders: [] },
  ])
})

test('a process is waiting, failed, paused or done by its steps and its status', async () => {
  const waits = step({ id: 'a', number: 0, status: 'awaiting_approval' })
  const done = step({ id: 'b', number: 1, status: 'completed' })
  const w = world({
    [`${ACTIVE}/w/process.json`]: processFile({ name: 'W', metadata: { lastUpdated: '4' } }, [waits]),
    [`${ACTIVE}/f/process.json`]: processFile({ name: 'F', status: 'failed', metadata: { lastUpdated: '3' } }, [done]),
    [`${ACTIVE}/p/process.json`]: processFile({ name: 'P', status: 'paused', metadata: { lastUpdated: '2' } }, [done]),
    [`${ACTIVE}/d/process.json`]: processFile({ name: 'D', metadata: { lastUpdated: '1' } }, [done]),
  })
  const list = await listProcesses(w.ports.files)
  expect(list.map(p => p.kind)).toEqual(['waiting', 'failed', 'paused', 'done'])
  expect(waitingCount(list)).toBe(3)
})

test('the Continue list shows this folder, or all folders; a process with no folder shows only in All', async () => {
  const todo = step({ id: 'a', number: 0 })
  const w = world({
    [`${ACTIVE}/here/process.json`]: processFile({ name: 'Here', metadata: { lastUpdated: '3', projectPaths: ['/work/'] } }, [todo]),
    [`${ACTIVE}/there/process.json`]: processFile({ name: 'There', metadata: { lastUpdated: '2', projectPaths: ['/other'] } }, [todo]),
    [`${ACTIVE}/none/process.json`]: processFile({ name: 'None', metadata: { lastUpdated: '1' } }, [todo]),
  })
  const list = await listProcesses(w.ports.files)
  expect(inFolder(list, '/work', false).map(p => p.name)).toEqual(['Here'])
  expect(inFolder(list, '/work', true).map(p => p.name)).toEqual(['Here', 'There', 'None'])
})

test('the bound view lists every step with its look', async () => {
  const w = world({ [`${ACTIVE}/p1/process.json`]: processFile({ name: 'Invoice' }, [
    step({ id: 'a', number: 1, name: 'Read', status: 'completed' }),
    step({ id: 'b', number: 2, name: 'Approve', status: 'awaiting_approval' }),
    step({ id: 'c', number: 3, name: 'Send', status: 'pending' }),
  ]) })
  expect(await boundView(w.ports.files, `${ACTIVE}/p1`)).toEqual({
    name: 'Invoice', step: 2, total: 3, kind: 'waiting',
    steps: [{ number: '1', name: 'Read', kind: 'done' }, { number: '2', name: 'Approve', kind: 'waiting' }, { number: '3', name: 'Send', kind: 'pending' }],
  })
  expect(await boundView(w.ports.files, `${ACTIVE}/gone`)).toBeUndefined()
})

test('the message names the next step and carries the step ids', () => {
  const text = handoff('resume', '/d', processFile({ parameters: { a: '1' } }, [step({ id: 'a', number: 0, status: 'completed' }), step({ id: 'b', number: 1, name: 'Build' })]))
  expect(text).toContain('I resumed the process "P"')
  expect(text).toContain('✓ 0. Design (completed) id=a')
  expect(text).toContain('→ 1. Build (pending) id=b')
  expect(text).toContain('Next: step 1 "Build".')
  expect(text).toContain('process-run skill')
})

test('a folder name has the slug, the date and the time', () => {
  expect(dirNameFor('Fix a Bug!', '2026-03-04T05:06:07.000Z')).toBe('fix-a-bug-20260304-050607')
})

test('start refuses while a required field is empty, and writes nothing', async () => {
  const w = world(disk())
  const [t] = await listTemplates(w.ports.files)
  expect(await startProcess(w.ports, t, { workItemId: '  ' })).toEqual({ error: 'Fill in: workItemId' })
  expect(w.links.S1).toBeUndefined()
})
test('start creates the process, binds the session and returns the message', async () => {
  const w = world(disk())
  const [t] = await listTemplates(w.ports.files)
  const started = await startProcess(w.ports, t, { workItemId: ' 7 ', repo: '' })
  expect(started).toMatchObject({ text: expect.stringContaining('I started the process "bug"') })
  const [dir] = w.links.S1
  expect(dir).toMatch(/\/active\/bug-\d{8}-\d{6}$/)
  expect(w.json(`${dir}/process.json`).parameters).toEqual({ workItemId: '7' })
})
test('start answers with the error of the tool', async () => {
  const w = world({ ...disk(), [`${T}/design/design.json`]: { type: 'other' } })
  const [t] = await listTemplates(w.ports.files)
  expect(await startProcess(w.ports, t, { workItemId: '7' })).toMatchObject({ error: expect.stringContaining('Step definition UUID not found') })
})

test('resume binds the session and returns the message', async () => {
  const w = world({ [`${ACTIVE}/p1/process.json`]: processFile() })
  expect(await resumeProcess(w.ports, `${ACTIVE}/p1`)).toMatchObject({ text: expect.stringContaining('Next: step 0 "Design"') })
  expect(w.links.S1).toEqual([`${ACTIVE}/p1`])
})
test('resume of a folder outside active/ answers with an error', async () => {
  const w = world({ '/h/x/process.json': {} })
  expect(await resumeProcess(w.ports, '/h/x')).toEqual({ error: 'Not a folder in active/: /h/x' })
})
