import type { Register } from 'claude-code'
import { findLogOwed } from '../infra/log-first/log-first'
import { clearLogOwed, isLogGatedCommand, isLogInteractionCommand } from '../infra/log-owed/log-owed'
import type { FileSystem } from '../infra/ports/ports'

// While the agent owes a log entry, it cannot edit files, start a subagent or change the process.
// Bash still works, so it can run `process_manager.py log-interaction`: when that succeeds, the log is no longer owed.
// A subagent's own calls pass.

const EDIT_TOOLS = ['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Agent', 'Task'] // Agent is the subagent tool; Task is its old name

const filesOf = ($: any): FileSystem => ({
  home: () => $.env.get('HOME'),
  list: path => $.fs.list(path),
  exists: path => $.fs.exists(path),
  read: path => $.fs.read(path),
})

export const register: Register = on => {
  on('tool.call', { tool: [...EDIT_TOOLS, 'Bash'] }, async ($, e, next) => {
    const sessionId = await $.session.id()
    if (e.tool === 'Bash') return handleBash($, e, next, sessionId)
    if (e.agentId) return next(e)
    const logOwed = await findLogOwed(filesOf($), sessionId)
    return logOwed ? { deny: logOwed.text } : next(e)
  })
}

async function handleBash($: any, e: any, next: any, sessionId: string) {
  const command: string = e.command ?? ''
  if (isLogInteractionCommand(command)) {
    const result = await next(e)
    if (!result.deny && !result.isError) clearLogOwed(sessionId)
    return result
  }
  if (e.agentId || !isLogGatedCommand(command)) return next(e)
  const logOwed = await findLogOwed(filesOf($), sessionId)
  return logOwed ? { deny: logOwed.text } : next(e)
}
