import type { Register } from 'claude-code'
import { findLogOwed } from '../infra/log-first/log-first'
import { LOG_GATED_TOOLS, LOG_TOOL, clearLogOwed } from '../infra/log-owed/log-owed'
import type { FileSystem } from '../infra/ports/ports'

// While the agent owes a log entry, it cannot edit files, start a subagent or change the process.
// The tool `log_interaction` still works: when it succeeds, the log is no longer owed.
// A subagent's own calls pass.

const EDIT_TOOLS = ['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Agent', 'Task'] // Agent is the subagent tool; Task is its old name

const filesOf = ($: any): FileSystem => ({
  home: async () => (await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE')), // Windows has no HOME in every shell
  list: path => $.fs.list(path),
  exists: path => $.fs.exists(path),
  read: path => $.fs.read(path),
})

export const register: Register = on => {
  on('tool.call', { tool: [...EDIT_TOOLS, LOG_TOOL, ...LOG_GATED_TOOLS] }, async ($, e, next) => {
    const sessionId = await $.session.id()
    if (e.tool === LOG_TOOL) {
      const result: any = await next(e)
      if (!result.deny && !result.isError && !result.result?.isError) clearLogOwed(sessionId)
      return result
    }
    if (e.agentId) return next(e)
    const logOwed = await findLogOwed(filesOf($), sessionId)
    return logOwed ? { deny: logOwed.text } : next(e)
  })
}
