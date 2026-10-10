import type { ManagerPorts } from '../ports/ports'
import { fail, locked, ok, readJson, readProcess, stepName, writeJson } from './process-files'
import type { Doc, Result } from './process-files'

// A step may read and write only the topics its definition lists. An empty or old-format list means no limit.
async function validateTopicAccess(ports: ManagerPorts, dir: string, stepId: string, topic: string, access: 'readFrom' | 'writeTo'): Promise<void> {
  if (topic === '_cross-references') return
  const process = await readProcess(ports, dir)
  const allowed = process.steps.find((s: Doc) => s.id === stepId)?.stepDefinition?.memoryFileUsage?.[access]
  if (!Array.isArray(allowed) || allowed.length === 0) return
  if (allowed.includes(`${topic}.json`) || allowed.includes(topic)) return
  const label = access === 'writeTo' ? 'write to' : 'read from'
  fail(`Step "${stepName(process, stepId)}" is not allowed to ${label} topic "${topic}.json". Allowed ${access} topics: ${JSON.stringify(allowed)}`)
}

async function memoryDir(ports: ManagerPorts, dir: string): Promise<string> {
  if (!(await ports.files.exists(`${dir}/memory`))) fail(`memory/ directory not found in ${dir}`)
  return `${dir}/memory`
}

export type AddMemoryArgs = { processDir: string; stepId: string; topic: string; info?: Doc; decisions?: string[]; files?: string[] }

export const addMemoryEntry = (ports: ManagerPorts, a: AddMemoryArgs): Promise<Result> => locked(a.processDir, async () => {
  const memory = await memoryDir(ports, a.processDir)
  await validateTopicAccess(ports, a.processDir, a.stepId, a.topic, 'writeTo')
  const info = a.info ?? {}, decisions = a.decisions ?? [], files = a.files ?? []
  const now = ports.now()
  const topicPath = `${memory}/${a.topic}.json`
  const topic: Doc = (await ports.files.exists(topicPath))
    ? await readJson(ports, topicPath)
    : { type: 'memory-topic-file', topic: a.topic, lastUpdated: now, entries: {} }
  const existing = topic.entries[a.stepId]
  if (existing) {
    existing.informationProduced = { ...existing.informationProduced, ...info }
    existing.decisionsMade = [...(existing.decisionsMade ?? []), ...decisions]
    existing.filesModifiedCreated = [...(existing.filesModifiedCreated ?? []), ...files]
    existing.updatedAt = now
  } else {
    topic.entries[a.stepId] = {
      stepName: stepName(await readProcess(ports, a.processDir), a.stepId),
      informationProduced: info, decisionsMade: decisions, filesModifiedCreated: files, updatedAt: now,
    }
  }
  topic.lastUpdated = now
  await writeJson(ports, topicPath, topic)

  // The cross-reference file gathers the decisions and files of every topic.
  const xrefPath = `${memory}/_cross-references.json`
  const xref: Doc = (await ports.files.exists(xrefPath))
    ? await readJson(ports, xrefPath)
    : { type: 'memory-cross-references', keyDecisions: [], filesModified: [], filesCreated: [], custom: {} }
  xref.keyDecisions = [...(xref.keyDecisions ?? []), ...decisions]
  xref.filesModified = [...(xref.filesModified ?? []), ...files]
  await writeJson(ports, xrefPath, xref)
  return ok(`memory/${a.topic}.json`, 'memory/_cross-references.json')
})

export type ReadMemoryArgs = { processDir: string; stepId: string; topic: string }

export const readMemoryTopic = async (ports: ManagerPorts, a: ReadMemoryArgs): Promise<Result> => {
  const memory = await memoryDir(ports, a.processDir)
  await validateTopicAccess(ports, a.processDir, a.stepId, a.topic, 'readFrom')
  const path = `${memory}/${a.topic}.json`
  return { status: 'ok', topic: a.topic, data: (await ports.files.exists(path)) ? await readJson(ports, path) : null }
}
