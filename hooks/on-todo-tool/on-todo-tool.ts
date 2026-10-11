import type { Register } from 'claude-code'
import { findAgenticProcessDir, readAgenticProcess, hasAgenticProcessInstance, isProcessRunning, sessionKey } from '../infra/agentic-process-repository/agentic-process-repository'
import type { FileSystem, SessionLinks } from '../infra/ports/ports'

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
const linksOf = ($: any): SessionLinks => ({
  get: async sessionId => ((await $.store.get(sessionKey(sessionId))) as string[] | undefined) ?? [],
})


// A guard that blocks or re-prompts the agent says so in a toast: the user then knows why Claude changed course. One toast in 30 seconds for the same text.
let lastToast = ''
let lastToastMs = 0
async function say($: any, text: string): Promise<void> {
  const now = Date.now()
  if (text === lastToast && now - lastToastMs < 30_000) return
  lastToast = text
  lastToastMs = now
  try { await $.ui.toast(text) } catch { /* a surface that cannot show a toast */ }
}

export const register: Register = on => {
  on('tool.call', { tool: TODO_TOOLS }, async ($, e, next) => {
    if (e.agentId) return next(e)
    const files = filesOf($)
    const agenticProcessDir = await findAgenticProcessDir(files, linksOf($), await $.session.id())
    if (!hasAgenticProcessInstance(agenticProcessDir)) return next(e)
    if (!isProcessRunning(await readAgenticProcess(files, agenticProcessDir))) return next(e)
    await say($, 'Process: todo tools are off while a process runs.')
    return { deny: TEXT }
  })
}
