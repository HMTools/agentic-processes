import type { Register } from 'claude-code'
import { raiseLogOwed } from '../infra/log-owed/log-owed'
import { isPromptFromPlugin } from '../infra/mod-events/mod-events'
import type { FileSystem } from '../infra/ports/ports'
import { startCountingAgain } from '../on-agent-stopping/on-agent-stopping'

// The one hook on prompts (a plugin cannot have two without a matcher). A prompt that the plugin sends
// itself, as a re-prompt, changes nothing. A prompt from anywhere else:
//  - starts the turn-end re-prompt count again;
//  - in a session that has a process, makes the agent owe a log entry (read by the turn-end hook and the edit hook).

const filesOf = ($: any): FileSystem => ({
  home: () => $.env.get('HOME'),
  list: path => $.fs.list(path),
  exists: path => $.fs.exists(path),
  read: path => $.fs.read(path),
})

export const register: Register = on => {
  on('prompt.submit', async ($, e, next) => {
    if (!isPromptFromPlugin(e)) {
      startCountingAgain()
      await raiseLogOwed(filesOf($), await $.session.id())
    }
    return next(e)
  })
}
