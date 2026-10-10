import type { Register } from 'claude-code'
import { register as onAgentStopping } from './on-agent-stopping/on-agent-stopping'
import { register as onUserPrompt } from './on-user-prompt/on-user-prompt'
import { register as onPendingCheckpoint } from './on-pending-checkpoint/on-pending-checkpoint'
import { register as onTodoTool } from './on-todo-tool/on-todo-tool'
import { register as onAgentEditing } from './on-agent-editing/on-agent-editing'

export const register: Register = (on, options) => {
  onAgentStopping(on, options)
  onUserPrompt(on, options)
  onPendingCheckpoint(on, options)
  onAgentEditing(on, options)
  onTodoTool(on, options)
}
