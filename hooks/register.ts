import type { Register } from 'claude-code'
import { register as onAgentStopping } from './on-agent-stopping/on-agent-stopping'

export const register: Register = (on, options) => {
  onAgentStopping(on, options)
}
