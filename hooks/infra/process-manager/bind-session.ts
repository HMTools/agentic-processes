import type { ManagerPorts } from '../ports/ports'
import { fail, ok } from './process-files'
import type { Result } from './process-files'

// Links the session to a process: the session id goes into `.session` in the process folder.
// A resumed session has a new id, so an old id is replaced.

export async function bindSession(ports: ManagerPorts, processDir: string): Promise<Result> {
  if (!/\/active\/[^/]+$/.test(processDir)) fail(`Not a folder in active/: ${processDir}`)
  if (!(await ports.files.exists(`${processDir}/process.json`))) fail(`No process.json in ${processDir}`)
  const sessionId = await ports.sessionId()
  const file = `${processDir}/.session`
  const current = (await ports.files.exists(file)) ? (await ports.files.read(file)).trim() : ''
  if (current === sessionId) return ok()
  await ports.write(file, sessionId)
  return ok('.session')
}
