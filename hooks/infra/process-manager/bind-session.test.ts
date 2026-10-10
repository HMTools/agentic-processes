import { test, expect } from 'claude-code/testing'
import { bindSession } from './bind-session'
import { DIR, world } from './fake-world'

const PROCESS = { [`${DIR}/process.json`]: {} }

test('a process with no .session gets the session id', async () => {
  const w = world(PROCESS)
  expect((await bindSession(w.ports, DIR)).status).toBe('ok')
  expect(w.disk[`${DIR}/.session`]).toBe('S1')
})
test('an old id from an ended session is replaced', async () => {
  const w = world({ ...PROCESS, [`${DIR}/.session`]: 'old\n' })
  await bindSession(w.ports, DIR)
  expect(w.disk[`${DIR}/.session`]).toBe('S1')
})
test('the same id again changes nothing', async () => {
  const w = world({ ...PROCESS, [`${DIR}/.session`]: 'S1\n' })
  expect(await bindSession(w.ports, DIR)).toEqual({ status: 'ok', files_written: [] })
  expect(w.disk[`${DIR}/.session`]).toBe('S1\n')
})
test('a folder outside active/ is refused', async () => {
  const w = world({ '/h/other/p1/process.json': {} })
  await expect(bindSession(w.ports, '/h/other/p1')).rejects.toThrow('Not a folder in active/')
})
test('a folder with no process.json is refused', async () => {
  const w = world({ [`${DIR}/log.json`]: {} })
  await expect(bindSession(w.ports, DIR)).rejects.toThrow('No process.json')
})
