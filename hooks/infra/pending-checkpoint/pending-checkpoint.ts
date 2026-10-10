import { findAgenticProcessDir, readAgenticProcess, hasAgenticProcessInstance } from '../agentic-process-repository/agentic-process-repository'
import { hasOpenGate } from '../approval-gate/approval-gate'
import type { FileSystem, GateStore, SessionLinks } from '../ports/ports'

// While an approval gate is open, the agent can research: read, look things up, use MCP tools and start subagents.
// A write, an edit or a Bash command waits for the user's click. The process tools are MCP tools, so logging still works.
// A subagent's own calls follow the same rule.

const RESEARCH_TOOLS = ['Read', 'Glob', 'Grep', 'LS', 'WebFetch', 'WebSearch', 'Agent', 'Task']

export type ToolCall = { tool: string; command?: string; file_path?: string }

// The refusal text, or undefined when the call may go on.
export async function findPendingBlock(files: FileSystem, links: SessionLinks, gates: GateStore, sessionId: string, call: ToolCall): Promise<string | undefined> {
  if (RESEARCH_TOOLS.includes(call.tool) || call.tool.startsWith('mcp__')) return
  const agenticProcessDir = await findAgenticProcessDir(files, links, sessionId)
  if (!hasAgenticProcessInstance(agenticProcessDir) || !(await hasOpenGate(gates, sessionId))) return
  const stepId = (await readAgenticProcess(files, agenticProcessDir))?.currentState?.activeStep?.id
  return pendingText(agenticProcessDir, stepId)
}

export const pendingText = (agenticProcessDir: string, stepId = '<active step id>') =>
  'Approval needed — use the approval dialog. Only the user can approve, with a click.\n\n' +
  `Process dir: ${agenticProcessDir}\nStep ID: ${stepId}\n\n` +
  'Allowed until the user answers: Read, Glob, Grep, WebFetch, WebSearch, MCP tools and subagents for research.\n' +
  'A write, an edit or a Bash command is refused. The user has the dialog open, or it opens again with their next prompt.'
