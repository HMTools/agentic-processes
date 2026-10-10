import type { AgenticProcess } from '../agentic-process-types/agentic-process-types'
import { slash } from '../process-manager/move'
import type { FileSystem } from '../ports/ports'

// Reads the agentic-processes folders under ~/.claude/agentic-processes/active.

export async function findAgenticProcessDir(files: FileSystem, sessionId: string): Promise<string | undefined> {
  const activeDir = `${slash(String(await files.home()))}/.claude/agentic-processes/active`
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

export const hasAgenticProcessInstance = (agenticProcessDir: string | undefined): agenticProcessDir is string => agenticProcessDir !== undefined
export const isProcessRunning = (agenticProcess: AgenticProcess | undefined): agenticProcess is AgenticProcess => agenticProcess?.status === 'running'
