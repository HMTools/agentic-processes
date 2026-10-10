import type { AgenticProcess } from '../agentic-process-types/agentic-process-types'
import type { FileSystem, SessionLinks } from '../ports/ports'

// Finds the process of a session in the mod store, and reads its process.json.

export const sessionKey = (sessionId: string) => `session:${sessionId}`

// The newest folder the session bound that is still a process. A child is bound after its parent, so it answers first.
export async function findAgenticProcessDir(files: FileSystem, links: SessionLinks, sessionId: string): Promise<string | undefined> {
  for (const dir of [...(await links.get(sessionId))].reverse()) {
    if (await files.exists(`${dir}/process.json`)) return dir
  }
}

export async function readAgenticProcess(files: FileSystem, agenticProcessDir: string): Promise<AgenticProcess | undefined> {
  try { return JSON.parse(await files.read(`${agenticProcessDir}/process.json`)) } catch { /* unreadable: leave the agent alone */ }
}

export const hasAgenticProcessInstance = (agenticProcessDir: string | undefined): agenticProcessDir is string => agenticProcessDir !== undefined
export const isProcessRunning = (agenticProcess: AgenticProcess | undefined): agenticProcess is AgenticProcess => agenticProcess?.status === 'running'
