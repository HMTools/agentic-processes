import { listFindings, updateFindingStatus, writeFinding } from './findings'
import type { Tool } from './tools'

const FINDING_STATUSES = ['applied', 'rejected', 'deferred']
const tool = (name: string, description: string, properties: Record<string, unknown>, required: string[], run: Tool['run']): Tool =>
  ({ name, description, inputSchema: { type: 'object', properties, required }, run })

// The improvement findings tools, in their own file to keep tools.ts short.
export function findingsTools(processDir: unknown, str: (d: string) => unknown, list: (d: string) => unknown): Tool[] {
  return [
    tool('write_finding', 'Save one improvement finding of this process to the store that apply-improvements reads.', {
      processDir, category: str('Category'), title: str('Title'), what: str('What to change'), why: str('Why'), impact: str('Impact'),
      scope: list('Target file paths'),
    }, ['processDir', 'category', 'title', 'what', 'why', 'impact'], writeFinding),
    tool('list_findings', 'List improvement findings of every process, optionally for one status or one template.', {
      status: { type: 'string', enum: ['open', ...FINDING_STATUSES] }, templateId: str('Only this template'),
    }, [], listFindings),
    tool('update_finding_status', 'Record the outcome of a finding.', {
      processId: str('Process id'), findingId: str('Finding id'), status: { type: 'string', enum: FINDING_STATUSES },
      notes: str('Notes'), filesModified: list('Files modified'),
    }, ['processId', 'findingId', 'status'], updateFindingStatus),
  ]
}
