import { test, expect } from 'claude-code/testing'
import { activityOf } from './activity'

const NOW = 1_000_000_000_000
const ago = (minutes: number) => NOW - minutes * 60_000

test('a running process says how long ago it wrote its log, and after 10 minutes says there is no log', () => {
  expect(activityOf('running', ago(0), NOW)).toEqual({ text: 'last log just now', quiet: false })
  expect(activityOf('running', ago(3), NOW)).toEqual({ text: 'last log 3 min ago', quiet: false })
  expect(activityOf('running', ago(9), NOW)).toEqual({ text: 'last log 9 min ago', quiet: false })
  expect(activityOf('running', ago(10), NOW)).toEqual({ text: 'no log for 10 min', quiet: true })
  expect(activityOf('running', ago(12), NOW)).toEqual({ text: 'no log for 12 min', quiet: true })
})
test('only a running process with a known time gets a note', () => {
  for (const kind of ['waiting', 'failed', 'paused', 'done', 'pending'] as const) expect(activityOf(kind, ago(30), NOW)).toBeUndefined()
  expect(activityOf('running', undefined, NOW)).toBeUndefined()
})
