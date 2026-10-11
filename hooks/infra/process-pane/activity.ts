import type { Kind } from './status-look'

// How long ago a running process wrote its log. A long tool call writes no log, so the words say "no log", never "stalled".
// Only a running process gets a note: a process that waits for the user or is paused has nothing to write.
export const NO_LOG_MINUTES = 10

export type Activity = { text: string; quiet: boolean }

export function activityOf(kind: Kind, lastLogMs: number | undefined, now: number): Activity | undefined {
  if (kind !== 'running' || lastLogMs === undefined) return undefined
  const minutes = Math.max(0, Math.floor((now - lastLogMs) / 60_000))
  if (minutes >= NO_LOG_MINUTES) return { text: `no log for ${minutes} min`, quiet: true }
  return { text: minutes < 1 ? 'last log just now' : `last log ${minutes} min ago`, quiet: false }
}
