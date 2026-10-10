import type { Register } from 'claude-code'
import { findPendingBlock } from '../infra/pending-checkpoint/pending-checkpoint'
import type { FileSystem, Gate, GateStore } from '../infra/ports/ports'

// While an approval gate waits for the user's click, every tool call is refused except research and the log entry.
// No tool filter: MCP tools and subagent calls pass through here too. A fault in the check lets the call pass.

const filesOf = ($: any): FileSystem => ({
  home: async () => (await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE')), // Windows has no HOME in every shell
  list: path => $.fs.list(path),
  exists: path => $.fs.exists(path),
  read: path => $.fs.read(path),
})
const gatesOf = ($: any): GateStore => ({
  get: async sessionId => ((await $.store.get(`gate:${sessionId}`)) as Gate | undefined) ?? undefined,
  set: (sessionId, gate) => $.store.set(`gate:${sessionId}`, gate),
  clear: sessionId => $.store.delete(`gate:${sessionId}`),
})

export const register: Register = on => {
  on('tool.call', async ($, e, next) => {
    const text = await findPendingBlock(filesOf($), gatesOf($), await $.session.id(), e as any)
    return text ? { deny: text } : next(e)
  })
}
