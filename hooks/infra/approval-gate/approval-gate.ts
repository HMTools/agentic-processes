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
    await gates.set(sessionId, { ...gate, dialog: true }) // the pane shows its own buttons only while no dialog is open
    try { answer = await ask(questionFor(step, gate.dir), [APPROVE, CHANGES]) } catch {
      await gates.set(sessionId, { dir: gate.dir, stepId: gate.stepId })
      return 'The user did not answer. The gate stays open, and only the user can approve.'
    }
    await gates.clear(sessionId)
    if (answer !== APPROVE) {
      return changesText(step, answer === CHANGES ? '(no text given)' : answer)
    }
    await markApproved(files, write, gate)
    return approvedText(step)
  } finally { asking.delete(sessionId) }
}

const approvedText = (step: Step) => `The user approved step ${step.number} "${step.name}". Complete it with the tool update_step_status (status completed).`
const changesText = (step: Step, why: string) => `The user asked for changes to step ${step.number} "${step.name}": ${why}\nChange the step. When it is ready, call request_approval again.`

// Read the file again under the lock: a tool may have changed it while the user decided.
async function markApproved(files: FileSystem, write: FileWriter, gate: Gate): Promise<void> {
  await locked(gate.dir, async () => {
    const latest = await readAgenticProcess(files, gate.dir)
    const latestStep = latest?.steps?.find(s => s.id === gate.stepId)
    if (!latest || !latestStep) return
    latestStep.approved = true
    if (latest.metadata) latest.metadata.lastUpdated = new Date().toISOString()
    await write(`${gate.dir}/process.json`, JSON.stringify(latest, null, 2) + '\n')
  })
}

// ── The same answer from the pane ───────────────────────────────────────────

// What the gate card in the pane shows for the process bound to the session.
//   working: the step runs and the agent has not asked yet, so there is nothing to approve
//   dialog: the agent's question is on screen, so the user answers there
//   ready: the agent asked and no dialog is open (it was dismissed), so the pane has the buttons
export type PaneGate = { state: 'working' | 'dialog' | 'ready'; stepId: string; number: string; name: string; output: string }

export function gateForPane(agenticProcess: AgenticProcess | undefined, gate: Gate | undefined, dir: string): PaneGate | undefined {
  const step = findApprovalStep(agenticProcess)
  if (!step?.id) return
  const asked = gate !== undefined && gate.dir === dir && gate.stepId === step.id
  const output = step.stepDefinition?.output
  return {
    state: !asked ? 'working' : gate.dialog ? 'dialog' : 'ready', stepId: step.id, number: String(step.number), name: step.name ?? "",
    output: [output?.description, output?.artifacts?.length ? `Output: ${output.artifacts.join(', ')}` : ''].filter(Boolean).join(' · '),
  }
}

export type PaneAnswer = { text: string } | { error: string }

// The user presses Approve or Request changes in the pane. Everything is checked again now, not when the card was drawn:
// the step must still be the one that waits, the agent must have asked, and no dialog may be open.
async function answerFromPane(files: FileSystem, write: FileWriter, gates: GateStore, sessionId: string, dir: string, stepId: string, change: string | undefined): Promise<PaneAnswer> {
  const gate = await gates.get(sessionId)
  const now = gateForPane(await readAgenticProcess(files, dir), gate, dir)
  if (!now || now.stepId !== stepId) return { error: 'That step no longer waits for approval.' }
  if (now.state === 'dialog') return { error: 'Answer the dialog that is open.' }
  if (now.state === 'working') return { error: 'The agent has not asked for approval yet.' }
  const step = (await readAgenticProcess(files, dir))?.steps?.find(s => s.id === stepId)
  if (!step) return { error: 'That step no longer waits for approval.' }
  if (change === undefined) await markApproved(files, write, { dir, stepId })
  await gates.clear(sessionId)
  return { text: change === undefined ? approvedText(step) : changesText(step, change.trim() || '(no text given)') }
}
export const approveFromPane = (files: FileSystem, write: FileWriter, gates: GateStore, sessionId: string, dir: string, stepId: string) => answerFromPane(files, write, gates, sessionId, dir, stepId, undefined)
export const requestChangesFromPane = (files: FileSystem, write: FileWriter, gates: GateStore, sessionId: string, dir: string, stepId: string, reason: string) => answerFromPane(files, write, gates, sessionId, dir, stepId, reason)

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
