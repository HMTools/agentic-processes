import type { FileSystem, ManagerPorts } from '../ports/ports'
import { bindSession } from '../process-manager/bind-session'
import { createProcess } from '../process-manager/create-process'
import { slash } from '../process-manager/move'
import type { Doc } from '../process-manager/process-files'
import { needsUser, stepKind } from './status-look'
import type { Kind } from './status-look'

// What the process pane shows and does: the templates to start from, the processes to resume,
// and the message that hands a bound process to the agent. The pane itself is in ../../on-process-pane.

export type TemplateInfo = {
  path: string; name: string; category: string; title: string; purpose: string; stepCount: number
  fields: { name: string; required: boolean; example: string; description: string }[]
}
export type ProcessInfo = { dir: string; name: string; step: number; total: number; updated: string; kind: Kind; folders: string[] }

const rootOf = async (files: FileSystem) => {
  const home = await files.home()
  return home ? `${slash(home)}/.claude/agentic-processes` : undefined
}
const list = (files: FileSystem, path: string) => files.list(path).catch(() => [])
const readDoc = async (files: FileSystem, path: string): Promise<Doc | undefined> => {
  try { return JSON.parse(await files.read(path)) } catch { /* unreadable: leave it out */ }
}

// Every `templates/processes/<category>/<name>/<name>.json` of type template, with its fields: required first.
export async function listTemplates(files: FileSystem): Promise<TemplateInfo[]> {
  const root = await rootOf(files)
  if (!root) return []
  const found: TemplateInfo[] = []
  for (const category of (await list(files, `${root}/templates/processes`)).filter(e => e.kind === 'dir')) {
    for (const entry of (await list(files, `${root}/templates/processes/${category.name}`)).filter(e => e.kind === 'dir')) {
      const path = `${root}/templates/processes/${category.name}/${entry.name}/${entry.name}.json`
      const data = await readDoc(files, path)
      if (data?.type !== 'template') continue
      const { required = [], optional = [], definitions = {} } = data.parameters ?? {}
      const field = (name: string, isRequired: boolean) => ({ name, required: isRequired, example: definitions[name]?.example ?? '', description: definitions[name]?.description ?? '' })
      found.push({ path, name: data.name ?? entry.name, category: category.name, title: data.metadata?.title ?? data.name ?? entry.name, purpose: data.metadata?.purposeAndUsage ?? '', stepCount: (data.steps ?? []).length, fields: [...required.map((n: string) => field(n, true)), ...optional.map((n: string) => field(n, false))] })
    }
  }
  return found.sort((a, b) => `${a.category}/${a.name}`.localeCompare(`${b.category}/${b.name}`))
}

// The first step that is not done is the one to do next.
const isDone = (step: Doc) => step.status === 'completed' || step.status === 'skipped'
const nextStep = (process: Doc): Doc | undefined => (process.steps ?? []).find((s: Doc) => !isDone(s))

// What state the whole process is in: a failed or paused process, then a step that waits, then done, else running.
export function processKind(process: Doc): Kind {
  const steps: Doc[] = process.steps ?? []
  if (process.status === 'failed') return 'failed'
  if (process.status === 'paused') return 'paused'
  if (steps.some(s => s.status === 'awaiting_approval')) return 'waiting'
  if (steps.length && steps.every(isDone)) return 'done'
  return 'running'
}

// Every process in `active/`, the newest change first.
export async function listProcesses(files: FileSystem): Promise<ProcessInfo[]> {
  const root = await rootOf(files)
  if (!root) return []
  const found: (ProcessInfo & { sort: string })[] = []
  for (const entry of (await list(files, `${root}/active`)).filter(e => e.kind === 'dir')) {
    const dir = `${root}/active/${entry.name}`
    const process = await readDoc(files, `${dir}/process.json`)
    if (!process) continue
    const steps: Doc[] = process.steps ?? []
    const next = nextStep(process)
    const updated: string = process.metadata?.lastUpdated ?? ''
    const folders: string[] = process.metadata?.projectPaths ?? (process.metadata?.projectPath ? [process.metadata.projectPath] : [])
    found.push({ dir, name: process.name ?? entry.name, step: next ? steps.indexOf(next) + 1 : steps.length, total: steps.length, updated: updated.slice(0, 16).replace('T', ' '), kind: processKind(process), folders, sort: updated })
  }
  return found.sort((a, b) => b.sort.localeCompare(a.sort)).map(({ sort, ...info }) => info)
}

const trimSlash = (path: string) => path.replace(/\/+$/, '')

// The Continue tab shows the processes of this session's folder, or all of them. A process with no folder shows only in All.
export const inFolder = (processes: ProcessInfo[], cwd: string, all: boolean) =>
  all ? processes : processes.filter(p => p.folders.some(f => trimSlash(f) === trimSlash(cwd)))

// The badge on the Continue tab: the processes that need the user.
export const waitingCount = (processes: ProcessInfo[]) => processes.filter(p => needsUser(p.kind)).length

export type SubstepRow = { number: number; name: string; active: boolean }
export type ChildRow = { name: string; kind: Kind; dir: string; returnsTo?: string }
export type StepRow = { id: string; number: string; name: string; kind: Kind; active: boolean; substeps: SubstepRow[]; children: ChildRow[] }
export type BoundView = { dir: string; name: string; step: number; total: number; kind: Kind; parent?: { name: string; dir: string }; steps: StepRow[] }

// A recorded sub-process status, as a symbol kind.
const childKind = (status: string): Kind => (status === 'completed' ? 'done' : status === 'failed' ? 'failed' : status === 'paused' ? 'paused' : 'running')

// What the pane shows for the one process bound to the session: its steps, the substeps of the active step, the sub-processes and the parent.
export async function boundView(files: FileSystem, dir: string): Promise<BoundView | undefined> {
  const process = await readDoc(files, `${dir}/process.json`)
  if (!process) return
  const steps: Doc[] = process.steps ?? []
  const next = nextStep(process)
  const active = process.currentState?.activeStep
  const children: Doc[] = process.subProcessState?.childProcesses ?? []
  const parent = process.subProcessState?.parentProcess
  return {
    dir,
    name: process.name ?? dir.split('/').pop() ?? dir,
    step: next ? steps.indexOf(next) + 1 : steps.length,
    total: steps.length,
    kind: processKind(process),
    ...(parent?.processPath ? { parent: { name: parent.name ?? parent.processPath, dir: parent.processPath } } : {}),
    steps: steps.map((s, i) => {
      const isActive = !!active && s.id === active.id && !isDone(s)
      const defined: Doc[] = s.stepDefinition?.substeps ?? []
      return {
        id: s.id ?? String(i + 1),
        number: String(s.number ?? i + 1),
        name: s.name ?? s.id ?? `Step ${i + 1}`,
        kind: stepKind(s.status),
        active: isActive,
        substeps: isActive ? defined.map((d, n) => ({ number: d.number ?? n + 1, name: d.name ?? `Substep ${n + 1}`, active: active.currentSubstep?.number === (d.number ?? n + 1) })) : [],
        children: children
          .filter(c => c.spawnedAtStep === s.id || c.spawnedAtStep === Number(s.number))
          .map(c => ({ name: c.name ?? c.id, kind: childKind(c.status), dir: c.processPath, ...(c.syncPoint ? { returnsTo: String(c.syncPoint) } : {}) })),
      }
    }),
  }
}

export type StepDetail = {
  id: string; number: string; name: string; kind: Kind
  produces: string[]; substeps: string[]; reads: string[]; writes: string[]
  actions: string[]; reasoning: string[]; decisions: string[]; files: string[]; problems: string[]; notes: string[]
  produced: [string, string][] // what the step put in memory
}
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.map(x => (typeof x === 'string' ? x : JSON.stringify(x))) : typeof v === 'string' && v ? [v] : [])
const topics = (v: unknown): string[] => strings(v).map(t => t.replace(/\.json$/, ''))

// The detail of one step: its definition and what it did (memory topics and the log). Empty lists are not drawn.
export async function stepDetail(files: FileSystem, dir: string, stepId: string): Promise<StepDetail | undefined> {
  const process = await readDoc(files, `${dir}/process.json`)
  const steps: Doc[] = process?.steps ?? []
  const at = steps.findIndex(s => s.id === stepId)
  if (at < 0) return
  const step = steps[at], def: Doc = step.stepDefinition ?? {}
  const log = (await readDoc(files, `${dir}/log.json`))?.steps?.[stepId] ?? {}
  const decisions = new Set<string>(), changed = new Set<string>(), notes: string[] = [], produced: [string, string][] = []
  for (const entry of await list(files, `${dir}/memory`)) {
    if (!entry.name.endsWith('.json')) continue
    const topic = (await readDoc(files, `${dir}/memory/${entry.name}`))?.entries?.[stepId]
    if (!topic) continue
    strings(topic.decisionsMade).forEach(d => decisions.add(d))
    strings(topic.filesModifiedCreated).forEach(f => changed.add(f))
    notes.push(...strings(topic.notes))
    for (const [k, v] of Object.entries(topic.informationProduced ?? {})) produced.push([k, typeof v === 'string' ? v : JSON.stringify(v)])
  }
  strings(log.decisionsMade).forEach(d => decisions.add(d))
  strings(log.filesModified).forEach(f => changed.add(f))
  return {
    id: stepId, number: String(step.number ?? at + 1), name: step.name ?? stepId, kind: stepKind(step.status),
    produces: strings(def.output?.description ?? def.output?.create),
    substeps: (def.substeps ?? []).map((d: Doc, n: number) => `${d.number ?? n + 1} ${d.name ?? ''}`.trim()),
    reads: topics(def.memoryFileUsage?.readFrom), writes: topics(def.memoryFileUsage?.writeTo),
    actions: strings(log.actionsTaken), reasoning: strings(log.agentReasoning), decisions: [...decisions], files: [...changed],
    problems: strings(log.problemsEncountered), notes, produced,
  }
}

// The message the agent reads first: the facts it used to collect by reading files.
export function handoff(kind: 'new' | 'resume', dir: string, process: Doc): string {
  const steps: Doc[] = process.steps ?? []
  const next = nextStep(process)
  const rows = steps.map(s => `  ${isDone(s) ? '✓' : s === next ? '→' : ' '} ${s.number}. ${s.name} (${s.status}) id=${s.id}`)
  return [
    `${kind === 'new' ? 'I started' : 'I resumed'} the process "${process.name}" from the process pane. It is bound to this session.`,
    `Folder: ${dir}`,
    `Parameters: ${JSON.stringify(process.parameters ?? {})}`,
    `Steps:\n${rows.join('\n')}`,
    next ? `Next: step ${next.number} "${next.name}".` : 'Every step is done.',
    'Use the process-run skill and carry on from the next step.',
  ].join('\n')
}

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'process'
// `<name>-<YYYYMMDD>-<HHmmss>`, as the folders always had.
export const dirNameFor = (name: string, nowIso: string) => {
  const digits = nowIso.replace(/\D/g, '')
  return `${slug(name)}-${digits.slice(0, 8)}-${digits.slice(8, 14)}`
}

export const missingFields = (template: TemplateInfo, values: Record<string, string>) =>
  template.fields.filter(f => f.required && !values[f.name]?.trim()).map(f => f.name)

export type Started = { text: string; dir: string } | { error: string }

// Create the files, bind the session, and return the message for the agent. The same code as the create_process tool.
export async function startProcess(ports: ManagerPorts, template: TemplateInfo, values: Record<string, string>): Promise<Started> {
  const missing = missingFields(template, values)
  if (missing.length) return { error: `Fill in: ${missing.join(', ')}` }
  const home = await ports.files.home()
  if (!home) return { error: 'No home folder found' }
  const params = Object.fromEntries(Object.entries(values).filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim()]))
  const dir = `${slash(home)}/.claude/agentic-processes/active/${dirNameFor(template.name, ports.now())}`
  try {
    await createProcess(ports, { processDir: dir, templatePath: template.path, params })
    await bindSession(ports, dir)
    return { text: handoff('new', dir, JSON.parse(await ports.files.read(`${dir}/process.json`))), dir }
  } catch (error) { return { error: error instanceof Error ? error.message : String(error) } }
}

export async function resumeProcess(ports: ManagerPorts, dir: string): Promise<Started> {
  try {
    await bindSession(ports, dir)
    return { text: handoff('resume', dir, JSON.parse(await ports.files.read(`${dir}/process.json`))), dir }
  } catch (error) { return { error: error instanceof Error ? error.message : String(error) } }
}

// Take a running process off the Continue list: its folder moves to `deleted/`, so the user can still get it back by hand.
// Only a folder straight under `active/` moves; the pane never removes files for good.
export async function deleteProcess(ports: ManagerPorts, dir: string): Promise<string> {
  const home = await ports.files.home()
  if (!home) throw new Error('No home folder found')
  const root = `${slash(home)}/.claude/agentic-processes`
  const clean = slash(dir).replace(/\/+$/, '')
  const name = clean.startsWith(`${root}/active/`) ? clean.slice(`${root}/active/`.length) : ''
  if (!name || name.includes('/') || name === '..') throw new Error('That is not a running process folder')
  let target = `${root}/deleted/${name}`
  if (await ports.files.exists(target)) target = `${target}-${ports.now().replace(/[^0-9]/g, '')}` // a name taken before: keep both
  await ports.move(clean, target)
  return target
}
