import { findAgenticProcessDir, readAgenticProcess, hasApprovalCheckpoint, hasAgenticProcessInstance } from '../agentic-process-repository/agentic-process-repository'
import { runsProcessManager } from '../log-owed/log-owed'
import type { FileSystem } from '../ports/ports'

// While an approval checkpoint waits for the user (`pending-interaction.json` exists), the agent may only read,
// look things up, and resolve the checkpoint with `process_manager.py`. Calls from a subagent wait too.

const READ_TOOLS = ['Read', 'Glob', 'Grep', 'LS', 'WebFetch', 'WebSearch']
const WRITE_TOOLS = ['Write', 'Edit', 'MultiEdit']

export type ToolCall = { tool: string; command?: string; file_path?: string }

// The refusal text, or undefined when the call may go on.
export async function findPendingBlock(files: FileSystem, sessionId: string, call: ToolCall): Promise<string | undefined> {
  if (READ_TOOLS.includes(call.tool)) return
  const agenticProcessDir = await findAgenticProcessDir(files, sessionId)
  if (!hasAgenticProcessInstance(agenticProcessDir) || !(await hasApprovalCheckpoint(files, agenticProcessDir))) return
  if (call.tool === 'Bash' && runsProcessManager('[a-z][a-z-]*').test(call.command ?? '')) return
  // process-approve writes this empty file before it calls approve-step.
  if (WRITE_TOOLS.includes(call.tool) && call.file_path === `${agenticProcessDir}/.approve-token`) return
  const stepId = (await readAgenticProcess(files, agenticProcessDir))?.currentState?.activeStep?.id
  return pendingText(agenticProcessDir, stepId)
}

// The script path is not known to a mod, so the text names the skill.
export const pendingText = (agenticProcessDir: string, stepId = '<active step id>') =>
  'Approval checkpoint active — most tools are blocked until you resolve the pending interaction.\n\n' +
  `The user has already responded. Process their response now.\nProcess dir: ${agenticProcessDir}\nStep ID: ${stepId}\n\n` +
  'Steps to resolve (process-state-update skill):\n' +
  `  1. Read ${agenticProcessDir}/pending-interaction.json to see what options were presented\n` +
  '  2. Process the user\'s response and determine their choice\n' +
  '  3. `write-pending --delete` to remove the pending interaction\n' +
  '  4. `update-step-status` for the step, based on the user\'s choice\n\n' +
  'Allowed while the checkpoint is active: Read, Glob, Grep, WebFetch, WebSearch and process_manager.py commands.\n' +
  'After deleting pending-interaction.json, all tools are unblocked.'
