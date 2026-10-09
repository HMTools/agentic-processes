import type { Register } from 'claude-code'
import { findPendingBlock } from '../infra/pending-checkpoint/pending-checkpoint'
import type { FileSystem } from '../infra/ports/ports'

// While an approval checkpoint waits for the user, every tool call is refused except the ones that read or resolve it.
// No tool filter: MCP tools and subagent calls pass through here too. A fault in the check lets the call pass.

const filesOf = ($: any): FileSystem => ({
  home: () => $.env.get('HOME'),
  list: path => $.fs.list(path),
  exists: path => $.fs.exists(path),
  read: path => $.fs.read(path),
})

export const register: Register = on => {
  on('tool.call', async ($, e, next) => {
    const text = await findPendingBlock(filesOf($), await $.session.id(), e as any)
    return text ? { deny: text } : next(e)
  })
}
