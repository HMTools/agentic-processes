import type { FileSystem } from '../ports/ports'

// The one line under the prompt: where the process is. It reads process.json, so it never differs from the files.
// An empty text clears the line: the folder has moved (the process finished) or the process is not running.
export async function stepLine(files: FileSystem, dir: string): Promise<string> {
  let process: any
  try { process = JSON.parse(await files.read(`${dir}/process.json`)) } catch { return '' }
  if (process.status !== 'running') return ''
  const steps: any[] = process.steps ?? []
  const active = process.currentState?.activeStep
  const index = Math.max(0, steps.findIndex(s => s.id === active?.id))
  const step = steps[index]
  if (!step) return ''
  const parts = [`Step ${index + 1} of ${steps.length}`, active?.name ?? step.name]
  if (step.status === 'awaiting_approval') parts.push('waits for you')
  else if (active?.totalSubsteps && active.currentSubstep) parts.push(`part ${active.currentSubstep.number} of ${active.totalSubsteps}`)
  return parts.join(' · ')
}
