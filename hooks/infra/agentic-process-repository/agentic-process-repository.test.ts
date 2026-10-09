import { test, expect } from 'claude-code/testing'
import { findAgenticProcessDir, readAgenticProcess, hasApprovalCheckpoint } from './agentic-process-repository'
import type { FileSystem } from '../ports/ports'

const ACTIVE = '/h/.claude/agentic-processes/active'

// a fake disk: path → contents. A folder is any path that starts a longer one.
function disk(files: Record<string, string>): FileSystem {
  return {
    home: async () => '/h',
    list: async path => {
      const names = Object.keys(files).filter(f => f.startsWith(`${path}/`)).map(f => f.slice(path.length + 1).split('/')[0])
      if (!names.length) throw new Error('no such folder')
      return [...new Set(names)].map(name => ({ name, kind: 'dir' }))
    },
    exists: async path => path in files,
    read: async path => { if (!(path in files)) throw new Error('missing'); return files[path] },
  }
}

test('finds the process folder bound to the session', async () => {
  const files = disk({ [`${ACTIVE}/a/.session`]: 'S0', [`${ACTIVE}/b/.session`]: 'S1' })
  expect(await findAgenticProcessDir(files, 'S1')).toBe(`${ACTIVE}/b`)
})
test('no folder is bound to the session: nothing', async () => {
  expect(await findAgenticProcessDir(disk({ [`${ACTIVE}/a/.session`]: 'S0' }), 'S1')).toBeUndefined()
})
test('a folder with no .session file is skipped', async () => {
  expect(await findAgenticProcessDir(disk({ [`${ACTIVE}/a/process.json`]: '{}' }), 'S1')).toBeUndefined()
})
test('no active folder at all: nothing', async () => {
  expect(await findAgenticProcessDir(disk({}), 'S1')).toBeUndefined()
})
test('reads process.json', async () => {
  const files = disk({ '/p/process.json': '{"status":"running","steps":[]}' })
  expect(await readAgenticProcess(files, '/p')).toEqual({ status: 'running', steps: [] })
})
test('a process.json that is not valid JSON: nothing', async () => {
  expect(await readAgenticProcess(disk({ '/p/process.json': '{oops' }), '/p')).toBeUndefined()
})
test('the checkpoint exists only when pending-interaction.json exists', async () => {
  const files = disk({ '/p/pending-interaction.json': '{}' })
  expect(await hasApprovalCheckpoint(files, '/p')).toBe(true)
  expect(await hasApprovalCheckpoint(files, '/q')).toBe(false)
})
