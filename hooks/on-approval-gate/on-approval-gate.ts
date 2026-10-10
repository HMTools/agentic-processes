import type { Register } from 'claude-code'
import { findAgenticProcessDir, readAgenticProcess, sessionKey } from '../infra/agentic-process-repository/agentic-process-repository'
import { askGate, findApprovalStep, isHandEdit, HAND_EDIT_TEXT, REQUEST_APPROVAL_TOOL } from '../infra/approval-gate/approval-gate'
import type { Ask, FileSystem, FileWriter, Gate, GateStore, SessionLinks } from '../infra/ports/ports'

// The user approves a step with a click. The agent asks with the tool `request_approval` (listed by on-process-tools); the call waits for the answer.
// Only this mod writes `approved` in process.json. The agent cannot edit that file by hand.
// A fault in the hand-edit check refuses the call. A fault elsewhere approves nothing.

const FULL_TOOL = `mcp__agentic-processes__${REQUEST_APPROVAL_TOOL.name}`

const filesOf = ($: any): FileSystem => ({
  home: async () => (await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE')), // Windows has no HOME in every shell
  list: path => $.fs.list(path),
  exists: path => $.fs.exists(path),
  read: path => $.fs.read(path),
})
const linksOf = ($: any): SessionLinks => ({
  get: async sessionId => ((await $.store.get(sessionKey(sessionId))) as string[] | undefined) ?? [],
})
const writerOf = ($: any): FileWriter => (path, text) => $.fs.write(path, text)
const askOf = ($: any): Ask => (question, options) => $.ui.ask(question, options)
const gatesOf = ($: any): GateStore => ({
  get: async sessionId => ((await $.store.get(`gate:${sessionId}`)) as Gate | undefined) ?? undefined,
  set: (sessionId, gate) => $.store.set(`gate:${sessionId}`, gate),
  clear: sessionId => $.store.delete(`gate:${sessionId}`),
})

const reply = (text: string) => ({ result: { content: [{ type: 'text', text }], isError: false } }) as never

export const register: Register = on => {
  on('tool.call', { tool: FULL_TOOL }, async ($, e) => {
    const sessionId = await $.session.id()
    const files = filesOf($)
    const dir = await findAgenticProcessDir(files, linksOf($), sessionId)
    if (!dir) return reply('No process is bound to this session.')
    const step = findApprovalStep(await readAgenticProcess(files, dir))
    if (!step?.id) return reply('No step is waiting for approval.')
    const gates = gatesOf($)
    const gate = { dir, stepId: step.id }
    await gates.set(sessionId, gate)
    return reply((await askGate(files, writerOf($), gates, askOf($), sessionId, gate)) ?? 'The approval dialog is already open. Wait for the user.')
  })

  on('tool.call', { tool: ['Write', 'Edit', 'MultiEdit', 'Bash'] }, ($, e, next) =>
    isHandEdit(e as any) ? { deny: HAND_EDIT_TEXT } : next(e),
  ).catch(($, e, next) => (next.called ? next(e) : { deny: HAND_EDIT_TEXT }))
}
