import { test, expect } from 'claude-code/testing'
import { DIR, processFile, world } from './fake-world'
import { PROCESS_TOOLS, TOOL_PREFIX, ensureProcessTools, runTool } from './tools'

test('15 tools, one for each command of the old script, with a unique name and a schema', () => {
  expect(PROCESS_TOOLS.length).toBe(15)
  expect(new Set(PROCESS_TOOLS.map(t => t.name)).size).toBe(15)
  for (const t of PROCESS_TOOLS) {
    expect(t.inputSchema.type).toBe('object')
    expect(t.description.length).toBeGreaterThan(10)
    for (const key of t.inputSchema.required) expect(Object.keys(t.inputSchema.properties)).toContain(key)
  }
  expect(PROCESS_TOOLS.map(t => t.name)).toContain('log_interaction')
  expect(TOOL_PREFIX).toBe('mcp__agentic-processes__')
})
test('a tool runs and answers as the script did', async () => {
  const w = world({ [`${DIR}/process.json`]: processFile() })
  expect(await runTool(w.ports, 'update_step_status', { processDir: DIR, stepId: 's1', status: 'in_progress' })).toEqual({ status: 'ok', files_written: ['process.json'] })
})
test('a missing input and a value outside an enum are errors that name the problem', async () => {
  const w = world({ [`${DIR}/process.json`]: processFile() })
  expect(await runTool(w.ports, 'update_step_status', { processDir: DIR })).toEqual({ status: 'error', message: 'Missing input for update_step_status: stepId, status' })
  expect((await runTool(w.ports, 'update_step_status', { processDir: DIR, stepId: 's1', status: 'nope' })).message).toContain('Invalid status "nope"')
})
test('a rule that fails is an error answer, not a throw', async () => {
  const w = world({ [`${DIR}/process.json`]: processFile() })
  expect((await runTool(w.ports, 'update_step_status', { processDir: DIR, stepId: 'zzz', status: 'completed' }))).toEqual({ status: 'error', message: 'Step zzz not found' })
})
test('a path with backslashes works, as on Windows', async () => {
  const w = world({ [`${DIR}/process.json`]: processFile() })
  const result = await runTool(w.ports, 'update_step_status', { processDir: DIR.replace(/\//g, '\\'), stepId: 's1', status: 'in_progress' })
  expect(result.status).toBe('ok')
})
test('an unknown tool is an error', async () => {
  expect((await runTool(world().ports, 'nope', {})).status).toBe('error')
})
test('the tools are listed once for each session, behind tool search, with the approval tool', async () => {
  const listed: any[] = []
  const register = async (spec: any) => { listed.push(spec) }
  await ensureProcessTools(register, 'S-lazy')
  await ensureProcessTools(register, 'S-lazy')
  expect(listed.length).toBe(16)
  expect(listed.every(s => s.isDeferred)).toBe(true)
  expect(listed.map(s => s.name)).toContain('request_approval')
  await ensureProcessTools(register, 'S-other')
  expect(listed.length).toBe(32)
})
test('a failed registration is tried again next time', async () => {
  let fails = true
  const register = async () => { if (fails) throw new Error('not bound yet') }
  await expect(ensureProcessTools(register, 'S-retry')).rejects.toThrow('not bound yet')
  fails = false
  await ensureProcessTools(register, 'S-retry')
})
