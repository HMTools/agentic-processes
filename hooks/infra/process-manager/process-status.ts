import type { ManagerPorts } from '../ports/ports'
import { slash } from './move'
import { PROCESS_STATUSES, fail, locked, ok, readJson, readProcess, stepName, writeJson } from './process-files'
import type { Doc, Result } from './process-files'

// A process lives in the folder of its status. A running or paused process is in `active/`.
const STATUS_FOLDER: Record<string, string> = { completed: 'completed', failed: 'failed', running: 'active', paused: 'active' }

export type ProcessStatusArgs = { processDir: string; status: string; summary?: string }

export const updateProcessStatus = (ports: ManagerPorts, a: ProcessStatusArgs): Promise<Result> => locked(a.processDir, async () => {
  if (!PROCESS_STATUSES.includes(a.status)) fail(`Invalid status "${a.status}". Valid: ${PROCESS_STATUSES.join(', ')}`)
  const process = await readProcess(ports, a.processDir)

  // A finished sub-process tells its parent what it did.
  const parentRef = process.subProcessState?.parentProcess
  if (a.status === 'completed' && parentRef) {
    if (!a.summary) {
      fail(
        `This process is a sub-process of '${parentRef.name}' (path: ${parentRef.processPath}). ` +
        'When completing a sub-process, you must provide a summary describing what was accomplished. ' +
        'The parent process needs this summary to continue.\n\n' +
        'Example: summary "Implemented feature X, created PR #123, all tests passing"',
      )
    }
    // Best effort: a parent that cannot be told must not stop the child from completing.
    try { await notifyParent(ports, process, parentRef, a.summary as string) } catch { /* parent not told */ }
  }

  process.status = a.status
  process.metadata.lastUpdated = ports.now()
  if (a.status === 'completed') process.metadata.completed = process.metadata.lastUpdated // the completion time: no step has to record it
  await writeJson(ports, `${a.processDir}/process.json`, process)

  const target = STATUS_FOLDER[a.status]
  const parts = slash(a.processDir).replace(/\/+$/, '').split('/')
  const name = parts.pop() as string
  const current = parts[parts.length - 1]
  if (!target || current === target) return ok('process.json')

  const targetParent = `${parts.slice(0, -1).join('/')}/${target}`
  const newDir = `${targetParent}/${name}`
  if (await ports.files.exists(newDir)) fail(`Cannot relocate: target directory already exists: ${newDir}`)
  // $.fs cannot move or delete, so the folder moves with the platform's own command.
  try { await ports.move(a.processDir, newDir) } catch (error) { fail(`Cannot relocate: ${error instanceof Error ? error.message : String(error)}`) }
  const moved = await readJson(ports, `${newDir}/process.json`)
  moved.metadata.processPath = newDir
  await writeJson(ports, `${newDir}/process.json`, moved)
  return { ...ok('process.json'), relocated_to: newDir }
})

async function notifyParent(ports: ManagerPorts, child: Doc, parentRef: Doc, summary: string): Promise<void> {
  await locked(parentRef.processPath, async () => {
    const parentPath = `${parentRef.processPath}/process.json`
    if (!(await ports.files.exists(parentPath))) return
    const parent = await readJson(ports, parentPath)
    const entry = parent.subProcessState?.childProcesses?.find((c: Doc) => c.id === child.id)
    if (parent.subProcessState) {
      if (entry) entry.status = 'completed'
      parent.metadata.lastUpdated = ports.now()
      await writeJson(ports, parentPath, parent)
    }
    // The summary goes into the parent's memory, under the step that started the child.
    const topicPath = `${parentRef.processPath}/memory/sub-processes.json`
    if (!(await ports.files.exists(`${parentRef.processPath}/memory`)) || !entry?.spawnedAtStep) return
    const now = ports.now()
    const topic: Doc = (await ports.files.exists(topicPath))
      ? await readJson(ports, topicPath)
      : { type: 'memory-topic-file', topic: 'sub-processes', lastUpdated: now, entries: {} }
    const spawn = entry.spawnedAtStep
    if (topic.entries[spawn]) {
      topic.entries[spawn].informationProduced = { ...topic.entries[spawn].informationProduced, [`childSummary_${child.id}`]: summary }
      topic.entries[spawn].updatedAt = now
    } else {
      topic.entries[spawn] = { stepName: stepName(parent, spawn), informationProduced: { [`childSummary_${child.id}`]: summary }, decisionsMade: [], filesModifiedCreated: [], updatedAt: now }
    }
    topic.lastUpdated = now
    await writeJson(ports, topicPath, topic)
  })
}

export type RegisterChildArgs = {
  processDir: string; childId: string; childName: string; childStatus: string
  spawnedAtStep: string; syncPoint: string; childProcessPath: string
}

export const registerChildProcess = (ports: ManagerPorts, a: RegisterChildArgs): Promise<Result> => locked(a.processDir, async () => {
  if (!PROCESS_STATUSES.includes(a.childStatus)) fail(`Invalid status "${a.childStatus}". Valid: ${PROCESS_STATUSES.join(', ')}`)
  const process = await readProcess(ports, a.processDir)
  const child = { id: a.childId, name: a.childName, status: a.childStatus, spawnedAtStep: a.spawnedAtStep, syncPoint: a.syncPoint, processPath: a.childProcessPath }
  if (!process.subProcessState) {
    process.subProcessState = { parentProcess: null, childProcesses: [child] }
  } else {
    const children: Doc[] = (process.subProcessState.childProcesses ??= [])
    const at = children.findIndex(c => c.id === child.id)
    if (at === -1) children.push(child)
    else children[at] = child
  }
  process.metadata.lastUpdated = ports.now()
  await writeJson(ports, `${a.processDir}/process.json`, process)
  return ok('process.json')
})

export type ChildStatusArgs = { processDir: string; childId: string; childStatus: string }

export const updateChildStatus = (ports: ManagerPorts, a: ChildStatusArgs): Promise<Result> => locked(a.processDir, async () => {
  if (!PROCESS_STATUSES.includes(a.childStatus)) fail(`Invalid status "${a.childStatus}". Valid: ${PROCESS_STATUSES.join(', ')}`)
  const process = await readProcess(ports, a.processDir)
  if (!process.subProcessState) fail('No subProcessState found on this process')
  const child = process.subProcessState.childProcesses?.find((c: Doc) => c.id === a.childId)
  if (!child) fail(`Child process ${a.childId} not found in subProcessState.childProcesses`)
  child.status = a.childStatus
  process.metadata.lastUpdated = ports.now()
  await writeJson(ports, `${a.processDir}/process.json`, process)
  return ok('process.json')
})
