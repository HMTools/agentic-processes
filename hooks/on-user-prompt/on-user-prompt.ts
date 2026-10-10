import type { Register } from 'claude-code'
import { raiseLogOwed } from '../infra/log-owed/log-owed'
import { isPromptFromPlugin } from '../infra/mod-events/mod-events'
import type { FileSystem, Gate, GateStore } from '../infra/ports/ports'
import { startCountingAgain } from '../on-agent-stopping/on-agent-stopping'
import { reopenPanel } from '../infra/approval-gate/approval-gate'
import { ensureProcessTools } from '../infra/process-manager/tools'
import { findAgenticProcessDir, hasAgenticProcessInstance } from '../infra/agentic-process-repository/agentic-process-repository'

// The one hook on prompts (a plugin cannot have two without a matcher). A prompt that the plugin sends
// itself, as a re-prompt, changes nothing. A prompt from anywhere else:
//  - starts the turn-end re-prompt count again;
//  - in a session that has a process, makes the agent owe a log entry (read by the turn-end hook and the edit hook);
//  - while an approval gate is open, opens the approval dialog again;
//  - in a session that has a process, lists the process tools (a resumed process, or one that was bound later).

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
  on('prompt.submit', async ($, e, next) => {
    if (!isPromptFromPlugin(e)) {
      startCountingAgain()
      const sessionId = await $.session.id()
      await raiseLogOwed(filesOf($), sessionId)
      if (hasAgenticProcessInstance(await findAgenticProcessDir(filesOf($), sessionId))) await ensureProcessTools(spec => $.tool.register(spec), sessionId).catch(() => {})
      await reopenPanel(filesOf($), (path, text) => $.fs.write(path, text), gatesOf($), (q, options) => $.ui.ask(q, options), text => $.prompt.submit({ text }), sessionId)
    }
    return next(e)
  })
}
