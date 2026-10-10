import type { AgenticProcess, Step } from '../agentic-process-types/agentic-process-types'
import { readAgenticProcess } from '../agentic-process-repository/agentic-process-repository'
import { slash } from '../process-manager/move'
import { locked } from '../process-manager/process-files'
import type { Ask, FileSystem, FileWriter, Gate, GateStore } from '../ports/ports'

// The approval gate. The agent asks, the user answers with a click, and only the mod writes `approved` in process.json.

// The tool the agent calls to ask the user. It is listed with the process tools (see ensureProcessTools).
export const REQUEST_APPROVAL_TOOL = {
  name: 'request_approval',
  description: 'Ask the user to approve the step that waits for approval. Call it when the step is done. ' +
    'It shows the user a dialog and waits for the click. The answer is the result. Only the user can approve.',
  inputSchema: { type: 'object', properties: {} } as Record<string, any>,
  isDeferred: true,
}

export const APPROVE = 'Approve'
export const CHANGES = 'Request changes'

export const hasOpenGate = async (gates: GateStore, sessionId: string) => (await gates.get(sessionId)) !== undefined

// The step the user has to approve now.
export const findApprovalStep = (agenticProcess: AgenticProcess | undefined): Step | undefined =>
  agenticProcess?.steps?.find(s => s.status === 'in_progress' && s.approvalRequired && !s.approved)

export function questionFor(step: Step, dir: string): string {
  const output = step.stepDefinition?.output
  const artifacts = output?.artifacts?.length ? `Output: ${output.artifacts.join(', ')}` : ''
  return [`Approve step ${step.number} "${step.name}"?`, output?.description, artifacts, `Process dir: ${dir}`].filter(Boolean).join('\n')
}

// Only one question for each session at a time.
const asking = new Set<string>()

// Asks the user and returns what the agent reads, or undefined when a question is already open for this session.
// An answer of Approve sets `approved`. A dismissed question leaves the gate open.
export async function askGate(files: FileSystem, write: FileWriter, gates: GateStore, ask: Ask, sessionId: string, gate: Gate): Promise<string | undefined> {
  if (asking.has(sessionId)) return
  asking.add(sessionId)
  try {
    const agenticProcess = await readAgenticProcess(files, gate.dir)
    const step = agenticProcess?.steps?.find(s => s.id === gate.stepId)
    if (!agenticProcess || !step) {
      await gates.clear(sessionId)
      return 'The gate named a step that is no longer in the process. The gate is closed.'
    }
    let answer: string
    try { answer = await ask(questionFor(step, gate.dir), [APPROVE, CHANGES]) } catch {
      return 'The user did not answer. The gate stays open, and only the user can approve.'
    }
    await gates.clear(sessionId)
    if (answer !== APPROVE) {
      const text = answer === CHANGES ? '(no text given)' : answer
      return `The user asked for changes to step ${step.number} "${step.name}": ${text}\nChange the step. When it is ready, call request_approval again.`
    }
    // Read the file again under the lock: a tool may have changed it while the user decided.
    await locked(gate.dir, async () => {
      const latest = await readAgenticProcess(files, gate.dir)
      const latestStep = latest?.steps?.find(s => s.id === gate.stepId)
      if (!latest || !latestStep) return
      latestStep.approved = true
      if (latest.metadata) latest.metadata.lastUpdated = new Date().toISOString()
      await write(`${gate.dir}/process.json`, JSON.stringify(latest, null, 2) + '\n')
    })
    return `The user approved step ${step.number} "${step.name}". Complete it with the tool update_step_status (status completed).`
  } finally { asking.delete(sessionId) }
}

// A prompt arrives while a gate is open: the dialog opens again. The prompt itself goes on.
// The answer reaches the agent as a prompt of its own. Not awaited: the dialog waits for the user.
export async function reopenPanel(files: FileSystem, write: FileWriter, gates: GateStore, ask: Ask, send: (text: string) => Promise<unknown>, sessionId: string): Promise<void> {
  const gate = await gates.get(sessionId)
  if (!gate) return
  askGate(files, write, gates, ask, sessionId, gate)
    .then(async text => { if (text && !(await hasOpenGate(gates, sessionId))) await send(text) }) // a dismissed dialog leaves the gate open and says nothing
    .catch(() => {})
}

// ── The agent must not write process files ──────────────────────────────────

// The process, log and memory files of a process folder, and the improvement findings. Only the process tools write them.
const STATE_FILE = /\.claude\/agentic-processes\/(?:(?:active|completed|failed)\/[^/]+\/(?:(?:process|log)\.json|memory\/[^/]+\.json)|improvement-findings\/.+\.json)$/
const STATE_NAME = /\b(?:process|log)\.json\b|agentic-processes[\\/]\S*memory[\\/]|improvement-findings/
// A guess: a command that names a state file and looks like a write. A script file that edits one passes.
const BASH_WRITE = /(?<![0-9&])>|\bsed\b.*\s-\S*i|\btee\b|\bpython3?\b|\bnode\b|\bperl\b|\bruby\b|\bjq\b|\bmv\b|\bcp\b|\bdd\b/

export type HandEditCall = { tool: string; command?: string; file_path?: string }

export function isHandEdit(call: HandEditCall): boolean {
  if (call.tool === 'Write' || call.tool === 'Edit' || call.tool === 'MultiEdit') return STATE_FILE.test(slash(call.file_path ?? ''))
  if (call.tool !== 'Bash') return false
  const command = call.command ?? ''
  return STATE_NAME.test(command) && BASH_WRITE.test(command)
}

export const HAND_EDIT_TEXT = 'Process files change only through the process tools (update_step_status, add_log_entry, add_memory_entry and the others). Do not edit them by hand. Only the user approves a step, with a click in the approval dialog.'
