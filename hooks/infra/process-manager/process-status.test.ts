import { test, expect } from 'claude-code/testing'
import { ACTIVE, DIR, processFile, world } from './fake-world'
import { registerChildProcess, updateChildStatus, updateProcessStatus } from './process-status'

test('a status that keeps the process in active/ moves nothing', async () => {
  const w = world({ [`${DIR}/process.json`]: processFile() })
  expect(await updateProcessStatus(w.ports, { processDir: DIR, status: 'paused' })).toEqual({ status: 'ok', files_written: ['process.json'] })
  expect(w.json(`${DIR}/process.json`).status).toBe('paused')
  expect(w.moved).toEqual([])
})
test('completed: the folder moves to completed/ and processPath follows', async () => {
  const w = world({ [`${DIR}/process.json`]: processFile(), [`${DIR}/log.json`]: {} })
  const result = await updateProcessStatus(w.ports, { processDir: DIR, status: 'completed' })
  const target = '/h/.claude/agentic-processes/completed/p1'
  expect(result.relocated_to).toBe(target)
  expect(w.moved).toEqual([[DIR, target]])
  expect(w.json(`${target}/process.json`).metadata.processPath).toBe(target)
  expect(w.disk[`${target}/log.json`]).toBeDefined()
  expect(w.disk[`${DIR}/process.json`]).toBeUndefined()
})
test('failed goes to failed/, and back to running goes to active/', async () => {
  const w = world({ [`${DIR}/process.json`]: processFile() })
  await updateProcessStatus(w.ports, { processDir: DIR, status: 'failed' })
  const failed = '/h/.claude/agentic-processes/failed/p1'
  expect(w.disk[`${failed}/process.json`]).toBeDefined()
  await updateProcessStatus(w.ports, { processDir: failed, status: 'running' })
  expect(w.disk[`${DIR}/process.json`]).toBeDefined()
})
test('a target folder that exists is an error', async () => {
  const w = world({ [`${DIR}/process.json`]: processFile(), '/h/.claude/agentic-processes/completed/p1/process.json': '{}' })
  await expect(updateProcessStatus(w.ports, { processDir: DIR, status: 'completed' })).rejects.toThrow('target directory already exists')
})
test('a move that fails is an error that says why, and the process file keeps the new status', async () => {
  const w = world({ [`${DIR}/process.json`]: processFile() }, { failMove: true })
  await expect(updateProcessStatus(w.ports, { processDir: DIR, status: 'completed' })).rejects.toThrow('Cannot relocate: disk is read-only')
})
test('an unknown status is an error', async () => {
  const w = world({ [`${DIR}/process.json`]: processFile() })
  await expect(updateProcessStatus(w.ports, { processDir: DIR, status: 'done' })).rejects.toThrow('Invalid status')
})

const PARENT = `${ACTIVE}/parent`
const child = { id: 'cid', name: 'Child', status: 'running', spawnedAtStep: 'ps1', syncPoint: 'ps2', processPath: DIR }
const family = () => world({
  [`${DIR}/process.json`]: processFile({ id: 'cid', subProcessState: { parentProcess: { id: 'pid', name: 'Parent', processPath: PARENT, returnToStep: 'ps2' }, childProcesses: [] } }),
  [`${PARENT}/process.json`]: processFile({ id: 'pid', subProcessState: { parentProcess: null, childProcesses: [child] } }, [{ id: 'ps1', name: 'Spawn step', status: 'in_progress' }]),
  [`${PARENT}/memory/_cross-references.json`]: {},
})
test('a sub-process cannot complete without a summary', async () => {
  const w = family()
  await expect(updateProcessStatus(w.ports, { processDir: DIR, status: 'completed' })).rejects.toThrow('must provide a summary')
  expect(w.json(`${DIR}/process.json`).status).toBe('running')
})
test('a finished sub-process tells its parent: child status and summary in the parent memory', async () => {
  const w = family()
  await updateProcessStatus(w.ports, { processDir: DIR, status: 'completed', summary: 'Built it' })
  expect(w.json(`${PARENT}/process.json`).subProcessState.childProcesses[0].status).toBe('completed')
  expect(w.json(`${PARENT}/memory/sub-processes.json`).entries.ps1).toMatchObject({ stepName: 'Spawn step', informationProduced: { childSummary_cid: 'Built it' } })
})
test('a parent that cannot be told does not stop the child from completing', async () => {
  const w = family()
  delete w.disk[`${PARENT}/process.json`]
  const result = await updateProcessStatus(w.ports, { processDir: DIR, status: 'completed', summary: 'Built it' })
  expect(result.status).toBe('ok')
})

test('register a child: first child, then the same child again replaces it', async () => {
  const w = world({ [`${DIR}/process.json`]: processFile() })
  const input = { processDir: DIR, childId: 'c1', childName: 'C', childStatus: 'running', spawnedAtStep: 's1', syncPoint: 's2', childProcessPath: '/c' }
  await registerChildProcess(w.ports, input)
  await registerChildProcess(w.ports, { ...input, childStatus: 'paused' })
  await registerChildProcess(w.ports, { ...input, childId: 'c2' })
  const state = w.json(`${DIR}/process.json`).subProcessState
  expect(state.parentProcess).toBeNull()
  expect(state.childProcesses.map((c: any) => [c.id, c.status])).toEqual([['c1', 'paused'], ['c2', 'running']])
})
test('update a child status; an unknown child or a process with no children is an error', async () => {
  const w = world({ [`${DIR}/process.json`]: processFile({ subProcessState: { parentProcess: null, childProcesses: [child] } }) })
  await updateChildStatus(w.ports, { processDir: DIR, childId: 'cid', childStatus: 'failed' })
  expect(w.json(`${DIR}/process.json`).subProcessState.childProcesses[0].status).toBe('failed')
  await expect(updateChildStatus(w.ports, { processDir: DIR, childId: 'zzz', childStatus: 'failed' })).rejects.toThrow('not found')
  const none = world({ [`${DIR}/process.json`]: processFile() })
  await expect(updateChildStatus(none.ports, { processDir: DIR, childId: 'cid', childStatus: 'failed' })).rejects.toThrow('No subProcessState')
})
