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
  path: string; name: string; category: string
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
      found.push({ path, name: data.name ?? entry.name, category: category.name, fields: [...required.map((n: string) => field(n, true)), ...optional.map((n: string) => field(n, false))] })
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

export type BoundView = { name: string; step: number; total: number; kind: Kind; steps: { number: string; name: string; kind: Kind }[] }

// What the pane shows for the one process bound to the session.
export async function boundView(files: FileSystem, dir: string): Promise<BoundView | undefined> {
  const process = await readDoc(files, `${dir}/process.json`)
  if (!process) return
  const steps: Doc[] = process.steps ?? []
  const next = nextStep(process)
  return {
    name: process.name ?? dir.split('/').pop() ?? dir,
    step: next ? steps.indexOf(next) + 1 : steps.length,
    total: steps.length,
    kind: processKind(process),
    steps: steps.map((s, i) => ({ number: String(s.number ?? i + 1), name: s.name ?? s.id ?? `Step ${i + 1}`, kind: stepKind(s.status) })),
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
