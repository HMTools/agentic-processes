import { test, expect } from 'claude-code/testing'
import { raiseLogOwed, isLogOwed, clearLogOwed, LOG_TOOL, LOG_GATED_TOOLS } from './log-owed'
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
test('the log tool and the tools that change the process are named', () => {
  expect(LOG_TOOL).toBe('mcp__agentic-processes__log_interaction')
  expect(LOG_GATED_TOOLS).toContain('mcp__agentic-processes__update_step_status')
  expect(LOG_GATED_TOOLS).not.toContain(LOG_TOOL)
  expect(LOG_GATED_TOOLS).not.toContain('mcp__agentic-processes__list_findings')
})
