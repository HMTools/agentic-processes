import type { ManagerPorts } from '../ports/ports'
import { fail, ok } from './process-files'
import type { Result } from './process-files'

// Links the session to a process: the folder goes on the session's list in the mod store.
// A resumed session has a new id, so it starts a new list. A child is bound after its parent and answers first.

export async function bindSession(ports: ManagerPorts, processDir: string): Promise<Result> {
  if (!/\/active\/[^/]+$/.test(processDir)) fail(`Not a folder in active/: ${processDir}`)
  if (!(await ports.files.exists(`${processDir}/process.json`))) fail(`No process.json in ${processDir}`)
  await ports.links.add(await ports.sessionId(), processDir)
  return ok()
}
