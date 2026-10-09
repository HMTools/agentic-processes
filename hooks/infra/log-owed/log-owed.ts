import { findAgenticProcessDir, hasAgenticProcessInstance } from '../agentic-process-repository/agentic-process-repository'
import type { FileSystem } from '../ports/ports'

// "The agent owes a log entry for the user's last prompt": one bit for each session, held in memory.
// It is lost when the mods reload or the session is resumed. The hooks that use it share this module.

const owed = new Set<string>()

export const markLogOwed = (sessionId: string) => { owed.add(sessionId) }
export const clearLogOwed = (sessionId: string) => { owed.delete(sessionId) }
export const isLogOwed = (sessionId: string) => owed.has(sessionId)

// A prompt arrived in a session that has a process.
export async function raiseLogOwed(files: FileSystem, sessionId: string): Promise<void> {
  if (hasAgenticProcessInstance(await findAgenticProcessDir(files, sessionId))) markLogOwed(sessionId)
}

// ── What a Bash command does to the log ────────────────────────────────────

// A command of its own or one step of a chain; `echo process_manager.py log-interaction` does not count.
export const runsProcessManager = (subcommand: string) => new RegExp(`(?:^|&&|;|\\|\\|)\\s*(?:python3?\\s+)?\\S*process_manager\\.py\\s+${subcommand}\\b`)
export const isLogInteractionCommand = (command: string) => runsProcessManager('log-interaction').test(command)

// The commands that change the process. They wait for the log, as the Python check did before.
const LOG_GATED_COMMANDS = ['update-step-status', 'approve-step', 'update-current-state', 'update-active-substep', 'add-memory-entry', 'update-process-status', 'write-pending']
export function isLogGatedCommand(command: string): boolean {
  const gated = LOG_GATED_COMMANDS.find(c => runsProcessManager(c).test(command))
  return !!gated && !(gated === 'write-pending' && /--delete\b/.test(command))
}
