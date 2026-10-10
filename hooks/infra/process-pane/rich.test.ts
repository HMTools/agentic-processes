import { test, expect } from 'claude-code/testing'
import { esc, flowGrid, HEX, nodeSegment, progressBar, ring } from './rich'
import type { Kind } from './status-look'

const KINDS: Kind[] = ['waiting', 'running', 'done', 'failed', 'paused', 'pending']
const wellFormed = (s: string) => s.startsWith('<svg xmlns="http://www.w3.org/2000/svg"') && s.endsWith('</svg>') && !/<script|onload|onclick/i.test(s)

test('every picture is one svg document, with no script, and far under the 131072 limit', () => {
  for (const k of KINDS) {
    expect(wellFormed(nodeSegment(k))).toBe(true)
    expect(wellFormed(nodeSegment(k, { first: true, last: true }))).toBe(true)
    expect(wellFormed(progressBar(2, 6, k))).toBe(true)
    expect(wellFormed(ring(2, 6, k))).toBe(true)
  }
  expect(wellFormed(flowGrid(['a'], { a: ['W'] }, [1]))).toBe(true)
  expect(progressBar(10, 500, 'running').length).toBeLessThan(131072 / 2)
})

test('the node of a state has its color; waiting and running pulse; pending is hollow', () => {
  expect(nodeSegment('waiting')).toContain(HEX.waiting)
  expect(nodeSegment('waiting')).toContain('<animate')
  expect(nodeSegment('running')).toContain('<animate')
  expect(nodeSegment('done')).not.toContain('<animate')
  expect(nodeSegment('pending')).toContain('fill="#14161c"')
  expect(nodeSegment('failed')).toContain(HEX.failed)
  expect(nodeSegment('done', { first: true, last: true })).not.toContain('<line') // no line above the first or below the last
})

test('the bar has a tick for each step, and the ring a share of the circle', () => {
  expect((progressBar(2, 6, 'waiting').match(/<rect/g) ?? []).length).toBe(6)
  expect(progressBar(2, 6, 'waiting')).toContain(HEX.waiting) // the active tick
  expect(ring(4, 8, 'running')).toContain('4/8')
  expect(ring(8, 8, 'done')).toContain('✓')
})

test('flow grid: a badge where a step reads or writes, and a topic name cannot break the markup', () => {
  const g = flowGrid(['<b>&"x'], { '<b>&"x': ['W', '', 'R/W'] }, [1, 2, 3])
  expect(g).toContain('&lt;b&gt;&amp;&quot;x')
  expect(g).not.toContain('<b>')
  expect(g).toContain('R/W')
  expect(esc(`a'b`)).toBe('a&apos;b')
})
