import { test, expect } from 'claude-code/testing'
import { raiseLogOwed, isLogOwed, clearLogOwed, isLogInteractionCommand, isLogGatedCommand } from './log-owed'
import type { FileSystem } from '../ports/ports'

const ACTIVE = '/h/.claude/agentic-processes/active'
const disk = (boundTo: string): FileSystem => ({
  home: async () => '/h',
  list: async path => { if (path !== ACTIVE) throw new Error('no such folder'); return [{ name: 'a', kind: 'dir' }] },
  exists: async path => path === `${ACTIVE}/a/.session`,
  read: async () => boundTo,
})

test('a prompt in a session with a process owes a log, until it is cleared', async () => {
  clearLogOwed('S1')
  await raiseLogOwed(disk('S1'), 'S1')
  expect(isLogOwed('S1')).toBe(true)
  clearLogOwed('S1')
  expect(isLogOwed('S1')).toBe(false)
})
test('a prompt in a session with no process owes nothing', async () => {
  clearLogOwed('S1')
  await raiseLogOwed(disk('other'), 'S1')
  expect(isLogOwed('S1')).toBe(false)
})
test('one session does not owe for another', async () => {
  clearLogOwed('S1'); clearLogOwed('S2')
  await raiseLogOwed(disk('S1'), 'S1')
  expect(isLogOwed('S2')).toBe(false)
})
test('finds the log command', () => {
  expect(isLogInteractionCommand('python3 /x/scripts/process_manager.py log-interaction --process-dir /p')).toBe(true)
  expect(isLogInteractionCommand('cd /p && python3 /x/process_manager.py log-interaction --step-id s1')).toBe(true)
  expect(isLogInteractionCommand('echo process_manager.py log-interaction > x')).toBe(false)
  expect(isLogInteractionCommand('python3 process_manager.py update-step-status')).toBe(false)
})
test('finds the commands that change the process', () => {
  expect(isLogGatedCommand('python3 /x/process_manager.py update-step-status --step-id s1')).toBe(true)
  expect(isLogGatedCommand('python3 /x/process_manager.py write-pending --process-dir /p')).toBe(true)
  expect(isLogGatedCommand('python3 /x/process_manager.py write-pending --process-dir /p --delete')).toBe(false)
  expect(isLogGatedCommand('python3 /x/process_manager.py list-findings --process-dir /p')).toBe(false)
  expect(isLogGatedCommand('ls -la')).toBe(false)
})
