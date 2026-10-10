import type { ManagerPorts } from '../ports/ports'
import { REQUEST_APPROVAL_TOOL } from '../approval-gate/approval-gate'
import { TOOL_PREFIX } from '../mod-events/mod-events'
import { createProcess } from './create-process'
import { findingsTools } from './findings-tools'
import { addLogEntry, logInteraction, updateLogObservations } from './log'
import { addMemoryEntry, readMemoryTopic } from './memory'
import { slash } from './move'
import { PROCESS_STATUSES, STEP_STATUSES, ToolError } from './process-files'
import type { Doc, Result } from './process-files'
import { registerChildProcess, updateChildStatus, updateProcessStatus } from './process-status'
import { updateActiveSubstep, updateCurrentState, updateStepStatus } from './step-status'

// The process tools. Each one is a command of the old Python script, with typed input
// and the same rules and the same answer: { status: 'ok', files_written } or { status: 'error', message }.

export type Tool = { name: string; description: string; inputSchema: Doc; run: (ports: ManagerPorts, args: any) => Promise<Result> }

const str = (description: string) => ({ type: 'string', description })
const num = (description: string) => ({ type: 'number', description })
const list = (description: string) => ({ type: 'array', items: { type: 'string' }, description })
const object = (description: string) => ({ type: 'object', description })
const processDir = str('Absolute path of the process folder')
const tool = (name: string, description: string, properties: Doc, required: string[], run: Tool['run']): Tool =>
  ({ name, description, inputSchema: { type: 'object', properties, required }, run })

export const PROCESS_TOOLS: Tool[] = [
  tool('create_process', 'Create the files of a new process from a template (process.json, log.json, memory/_cross-references.json).', {
    processDir, templatePath: str('Path to the template JSON'), name: str('Process name; defaults to the template name'),
    params: object('Parameters of the process'), projectPath: str('Absolute project path; defaults to the session folder'),
    parentProcessPath: str('Parent process folder, for a sub-process'), parentId: str('Parent process id'),
    parentName: str('Parent process name'), returnToStep: str('Step id in the parent to return to'),
  }, ['processDir', 'templatePath'], createProcess),
  tool('update_step_status', 'Change the status of a step. A step that needs approval cannot be completed before the user approved it.', {
    processDir, stepId: str('Step id'), status: { type: 'string', enum: STEP_STATUSES },
  }, ['processDir', 'stepId', 'status'], updateStepStatus),
  tool('update_current_state', 'Set the active step of the process, with a summary and optionally the active substep.', {
    processDir, stepId: str('Step id'), stepName: str('Step name'), summary: str('What the step does now'), details: str('More detail'),
    totalSubsteps: num('Number of substeps'), substepNumber: num('Active substep number'), substepName: str('Active substep name'),
  }, ['processDir', 'stepId', 'stepName', 'summary'], updateCurrentState),
  tool('update_active_substep', 'Change the active substep of the active step.', {
    processDir, substepNumber: num('Substep number'), substepName: str('Substep name'), summary: str('New action summary'),
  }, ['processDir', 'substepNumber', 'substepName'], updateActiveSubstep),
  tool('add_memory_entry', 'Add or update what a step produced in a memory topic file. A step can write only the topics its definition lists.', {
    processDir, stepId: str('Step id'), topic: str('Topic name, for example context'), info: object('Information produced'),
    decisions: list('Decisions made'), files: list('Files modified or created'),
  }, ['processDir', 'stepId', 'topic'], addMemoryEntry),
  tool('read_memory_topic', 'Read a memory topic file. A step can read only the topics its definition lists.', {
    processDir, stepId: str('Step id, for the access check'), topic: str('Topic name, or _cross-references'),
  }, ['processDir', 'stepId', 'topic'], readMemoryTopic),
  tool('add_log_entry', 'Add actions, reasoning, files, problems, decisions or notes to the log entry of a step.', {
    processDir, stepId: str('Step id'), actions: list('Actions taken'), reasoning: list('Agent reasoning'),
    filesModified: list('Files modified'), problems: list('Problems met'), decisions: list('Decisions made'),
    performanceNotes: list('Performance notes'),
  }, ['processDir', 'stepId'], addLogEntry),
  tool('log_interaction', "Log the user's request and the agent's answer in the log. Do this before anything else changes.", {
    processDir, stepId: str('Step id'), request: str("The user's request"), reason: str('Why the user asked'),
    response: str("The agent's response"), forImprovement: { type: 'boolean', description: 'The request points to an improvement of the process' },
    potentialImprovement: str('The improvement'),
  }, ['processDir', 'stepId', 'request', 'reason', 'response'], logInteraction),
  tool('update_process_status', 'Change the status of the process. Completing a sub-process needs a summary. A finished process moves to its status folder.', {
    processDir, status: { type: 'string', enum: PROCESS_STATUSES }, summary: str('What was done; needed to complete a sub-process'),
  }, ['processDir', 'status'], updateProcessStatus),
  tool('register_child_process', "Record a sub-process in the parent's process.json.", {
    processDir: str('Parent process folder'), childId: str('Child process id'), childName: str('Child process name'),
    childStatus: { type: 'string', enum: PROCESS_STATUSES }, spawnedAtStep: str('Step in the parent that started the child'),
    syncPoint: str('Step in the parent that waits for the child'), childProcessPath: str('Child process folder'),
  }, ['processDir', 'childId', 'childName', 'childStatus', 'spawnedAtStep', 'syncPoint', 'childProcessPath'], registerChildProcess),
  tool('update_child_status', "Change the status of a child in the parent's process.json.", {
    processDir: str('Parent process folder'), childId: str('Child process id'), childStatus: { type: 'string', enum: PROCESS_STATUSES },
  }, ['processDir', 'childId', 'childStatus'], updateChildStatus),
  tool('update_log_observations', 'Add patterns, user feedback, metrics or recommendations to the log of the whole process.', {
    processDir, patterns: list('Patterns detected'), feedback: list('User feedback'), metrics: object('Efficiency metrics'),
    recommendations: list('Recommendations for the future'),
  }, ['processDir'], updateLogObservations),
  ...findingsTools(processDir, str, list),
]

export { TOOL_PREFIX }
export const toolNames = () => PROCESS_TOOLS.map(t => t.name)

// The input is checked against the schema: required fields, and the values of an enum.
function check(tool: Tool, args: Doc): void {
  const { properties, required } = tool.inputSchema
  const missing = (required as string[]).filter(k => args[k] === undefined || args[k] === null)
  if (missing.length) throw new ToolError(`Missing input for ${tool.name}: ${missing.join(', ')}`)
  for (const [key, spec] of Object.entries<any>(properties)) {
    if (args[key] !== undefined && spec.enum && !spec.enum.includes(args[key])) throw new ToolError(`Invalid ${key} "${args[key]}". Valid: ${spec.enum.join(', ')}`)
  }
}

// A path may come with backslashes on Windows. Every path in the tools uses `/`, which Windows takes as well.
const PATH_INPUTS = ['processDir', 'templatePath', 'projectPath', 'parentProcessPath', 'childProcessPath']
const withSlashes = (args: Doc): Doc => Object.fromEntries(Object.entries(args).map(([k, v]) => [k, PATH_INPUTS.includes(k) && typeof v === 'string' ? slash(v) : v]))

export async function runTool(ports: ManagerPorts, name: string, args: Doc): Promise<Result> {
  const tool = PROCESS_TOOLS.find(t => t.name === name)
  if (!tool) return { status: 'error', message: `Unknown process tool: ${name}` }
  try {
    const input = withSlashes(args ?? {})
    check(tool, input)
    return await tool.run(ports, input)
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : String(error) }
  }
}

// The tools are listed only when the user starts or resumes a process, so a session with no process pays nothing for them.
export type RegisterTool = (spec: { name: string; description: string; inputSchema: Doc; isDeferred: boolean }) => Promise<unknown>
const listed = new Set<string>()
export async function ensureProcessTools(register: RegisterTool, sessionId: string): Promise<void> {
  if (listed.has(sessionId)) return
  for (const t of PROCESS_TOOLS) await register({ name: t.name, description: t.description, inputSchema: t.inputSchema, isDeferred: true })
  await register(REQUEST_APPROVAL_TOOL)
  listed.add(sessionId)
}
