import type { Register } from 'claude-code'
import type { Step, StepView } from '../infra/agentic-process-types/agentic-process-types'
import { findAgenticProcessDir, readAgenticProcess, hasApprovalCheckpoint, hasAgenticProcessInstance, isProcessRunning } from '../infra/agentic-process-repository/agentic-process-repository'
import { isStepExecutorRunning } from '../infra/step-executors/step-executors'
import { findLogOwed } from '../infra/log-first/log-first'
import { createRepromptLimiter } from '../infra/reprompt-limiter/reprompt-limiter'
import { isMainAgentAnswer } from '../infra/mod-events/mod-events'
import type { FileSystem, ListAgents } from '../infra/ports/ports'

// When the main agent ends a turn while its process still has work, send it a prompt that starts a new turn.
// Read top to bottom: the mods API, the entry point, the rules, the texts. Shared code is in ../infra.

// TODO(mods-migration, H01): this re-prompts after a turn ends because a user-installed mod's
// `classic.Stop` hook is skipped by the built-in guard (`sec-default`, "classic.Stop bypassed by
// cc-plugin-sec-default (tier user)"). Once this plugin is on the organization's mods whitelist
// (managed `appendPlugins`), replace this with `on('classic.Stop')` returning `{ block: reason }`
// (a real stop veto).

// TODO: when the mod has a settings UI, make MAX_REPROMPTS configurable (or "retry until it succeeds").
// That also covers an open Q&A session, which makes `write-pending` fail until it is archived.
const MAX_REPROMPTS = 3
const repromptLimiter = createRepromptLimiter() // this feature's own count

type Prompt = { key: string; text: string } // key = step id + state; the re-prompt limit counts per key

// ── The mods API, as the infra functions need it ────────────────────────────

const filesOf = ($: any): FileSystem => ({
  home: () => $.env.get('HOME'),
  list: path => $.fs.list(path),
  exists: path => $.fs.exists(path),
  read: path => $.fs.read(path),
})
const agentsOf = ($: any): ListAgents => () => $.agent.list()

// Not awaited: the new turn only starts once the current one has ended.
const startNewTurn = ($: any, text: string) => { void $.prompt.submit({ text }) }

// The user's own prompt starts the count again (called by the prompt hook in ../on-user-prompt).
export const startCountingAgain = () => repromptLimiter.reset()

// ── Entry point ─────────────────────────────────────────────────────────────

export const register: Register = on => {
  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (!isMainAgentAnswer(e)) return result

    const prompt = await promptToContinue($, await $.session.id())
    if (!prompt) { repromptLimiter.reset(); return result }
    const timesInARow = repromptLimiter.record(prompt.key)
    if (timesInARow <= MAX_REPROMPTS) startNewTurn($, prompt.text)
    return result
  })
}

// ── The rules ───────────────────────────────────────────────────────────────

// What the agent must do next, or undefined when it may stop.
async function promptToContinue($: any, sessionId: string): Promise<Prompt | undefined> {
  const files = filesOf($)

  // The user's last prompt has no log entry yet. Even at an approval checkpoint the agent must log it first.
  const logOwed = await findLogOwed(files, sessionId)
  if (logOwed) return logOwed

  const agenticProcessDir = await findAgenticProcessDir(files, sessionId)
  if (!hasAgenticProcessInstance(agenticProcessDir)) return
  if (await hasApprovalCheckpoint(files, agenticProcessDir)) return

  const agenticProcess = await readAgenticProcess(files, agenticProcessDir)
  if (!isProcessRunning(agenticProcess)) return

  const runningStep = agenticProcess.steps?.find(s => s.status === 'in_progress')
  const pendingStep = agenticProcess.steps?.find(s => s.status === 'pending')

  // An approval step is in progress: its checkpoint must exist before the agent stops,
  // and no later step may start while the user has not approved this one.
  if (runningStep?.approvalRequired) return promptForRunningStep($, runningStep, agenticProcessDir)

  // No approval is open and a step has not started: the agent must delegate it, not stop.
  if (pendingStep) return startNextStepPrompt(pendingStep, agenticProcessDir)

  // A normal step is in progress: wait for its executor, or re-delegate the step if the executor is gone.
  if (runningStep) return promptForRunningStep($, runningStep, agenticProcessDir)
}

// Wait for the step's executor. With no executor, an approval step needs its checkpoint and any other step is lost.
async function promptForRunningStep($: any, step: Step, agenticProcessDir: string): Promise<Prompt> {
  if (await isStepExecutorRunning(agentsOf($))) return waitForExecutorPrompt(step, agenticProcessDir)
  return step.approvalRequired ? approvalCheckpointPrompt(step, agenticProcessDir) : lostStepPrompt(step, agenticProcessDir)
}

// ── The texts ───────────────────────────────────────────────────────────────

const describeStep = (s: Step) => `Step ${s.number} — "${s.name}" (ID: ${s.id})`

function waitForExecutorPrompt(step: Step, agenticProcessDir: string): Prompt {
  return {
    key: `${step.id}:waiting`,
    text: `${describeStep(step)} is still in progress — do not stop yet.\nProcess dir: ${agenticProcessDir}\n\n` +
      'Wait for its step-executor subagent to finish.',
  }
}

function lostStepPrompt(step: Step, agenticProcessDir: string): Prompt {
  return {
    key: `${step.id}:lost`,
    text: `${describeStep(step)} is in_progress but no step-executor is running — it likely crashed or was lost.\nProcess dir: ${agenticProcessDir}\n\n` +
      'Re-delegate the step via step-executor-delegation, or mark it failed.',
  }
}

function startNextStepPrompt(step: Step, agenticProcessDir: string): Prompt {
  return {
    key: `${step.id}:pending`,
    text: `Process has remaining steps — do not stop yet.\n\nNext step to execute: ${describeStep(step)}\nProcess dir: ${agenticProcessDir}\n\n` +
      'Continue by delegating the next step to the step-executor subagent.\n' +
      'Only stop at approval checkpoints (after creating pending-interaction.json via process_manager.py write-pending) or after all steps are complete.',
  }
}

type CheckpointOption = { id: string; label: string; isDefault?: boolean; data?: unknown }
const CHECKPOINT_OPTIONS: CheckpointOption[] = [
  { id: 'approve', label: 'Approve', isDefault: true },
  { id: 'reject', label: 'Reject' },
  { id: 'modify', label: 'Request Changes' },
]

function approvalCheckpointPrompt(step: Step, agenticProcessDir: string): Prompt {
  const text = step.view ? approvalTextWithView(step, step.view, agenticProcessDir) : plainApprovalText(step, agenticProcessDir)
  return { key: `${step.id}:approval`, text }
}

function plainApprovalText(step: Step, agenticProcessDir: string): string {
  return `Approval checkpoint required — step "${step.name}" has approvalRequired: true but no pending-interaction.json exists.\n\n` +
    'Before stopping, you must:\n  1. Present your deliverables to the user\n' +
    `  2. ${howToCreateCheckpoint(agenticProcessDir, CHECKPOINT_OPTIONS)}`
}

// The view says which options must carry a `data` object, and what keys it needs.
function approvalTextWithView(step: Step, view: StepView, agenticProcessDir: string): string {
  const operationIds = view.operationIds ?? []
  const dataFor = (id: string) => view.mockData?.[id] ?? {}
  const schema = operationIds.map(id => `  - "${id}": data must include: ${JSON.stringify(Object.keys(dataFor(id)))}`).join('\n')
  const options = CHECKPOINT_OPTIONS.map(o => (operationIds.includes(o.id) ? { ...o, data: dataFor(o.id) } : o))
  return `Approval checkpoint required — step "${step.name}" resolves to view "${view.name}". ` +
    'Its pending-interaction.json options must each include a matching `data` object.\n\n' +
    `Required schema (derived from this view's mockData):\n${schema}\n\n${howToCreateCheckpoint(agenticProcessDir, options)}`
}

function howToCreateCheckpoint(agenticProcessDir: string, options: CheckpointOption[]): string {
  return 'Create the checkpoint with the process-state-update skill: `write-pending`\n' +
    `  --process-dir "${agenticProcessDir}"\n  --options '${JSON.stringify(options)}'\n\n` +
    'After creating the checkpoint, stopping is allowed.'
}
