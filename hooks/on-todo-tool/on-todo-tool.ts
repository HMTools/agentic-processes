import type { Register } from 'claude-code'
import { findAgenticProcessDir, readAgenticProcess, hasAgenticProcessInstance, isProcessRunning } from '../infra/agentic-process-repository/agentic-process-repository'
import type { FileSystem } from '../infra/ports/ports'

// While a process runs, its steps are the task list: the agent cannot keep a second one (that can skip an approval gate).
// A subagent's own calls pass. A fault in the check lets the call pass.

const TODO_TOOLS = ['TaskCreate', 'TaskUpdate', 'TaskGet', 'TaskList', 'TodoWrite']
const TEXT = 'External todo tools are blocked during process execution — process steps are your task list'

const filesOf = ($: any): FileSystem => ({
  home: async () => (await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE')), // Windows has no HOME in every shell
  list: path => $.fs.list(path),
  exists: path => $.fs.exists(path),
  read: path => $.fs.read(path),
})

export const register: Register = on => {
  on('tool.call', { tool: TODO_TOOLS }, async ($, e, next) => {
    if (e.agentId) return next(e)
    const files = filesOf($)
    const agenticProcessDir = await findAgenticProcessDir(files, await $.session.id())
    if (!hasAgenticProcessInstance(agenticProcessDir)) return next(e)
    return isProcessRunning(await readAgenticProcess(files, agenticProcessDir)) ? { deny: TEXT } : next(e)
  })
}
