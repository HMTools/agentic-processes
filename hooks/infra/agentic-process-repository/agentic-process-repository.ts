import type { AgenticProcess } from '../agentic-process-types/agentic-process-types'
import type { FileSystem } from '../ports/ports'

// Reads the agentic-processes folders under ~/.claude/agentic-processes/active.

export async function findAgenticProcessDir(files: FileSystem, sessionId: string): Promise<string | undefined> {
  const activeDir = `${await files.home()}/.claude/agentic-processes/active`
  try {
    for (const entry of await files.list(activeDir)) {
      if (entry.kind !== 'dir') continue
      const agenticProcessDir = `${activeDir}/${entry.name}`
      if (await isBoundToSession(files, agenticProcessDir, sessionId)) return agenticProcessDir
    }
  } catch { /* no active folder */ }
}

async function isBoundToSession(files: FileSystem, agenticProcessDir: string, sessionId: string): Promise<boolean> {
  const sessionFile = `${agenticProcessDir}/.session`
  return (await files.exists(sessionFile)) && (await files.read(sessionFile)).trim() === sessionId
}

export async function readAgenticProcess(files: FileSystem, agenticProcessDir: string): Promise<AgenticProcess | undefined> {
  try { return JSON.parse(await files.read(`${agenticProcessDir}/process.json`)) } catch { /* unreadable: leave the agent alone */ }
}

// The agent already asked the user to approve, reject or change something.
export const hasApprovalCheckpoint = (files: FileSystem, agenticProcessDir: string): Promise<boolean> =>
  files.exists(`${agenticProcessDir}/pending-interaction.json`)

export const hasAgenticProcessInstance = (agenticProcessDir: string | undefined): agenticProcessDir is string => agenticProcessDir !== undefined
export const isProcessRunning = (agenticProcess: AgenticProcess | undefined): agenticProcess is AgenticProcess => agenticProcess?.status === 'running'
