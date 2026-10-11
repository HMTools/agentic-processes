import type { StepRow } from '../../infra/process-pane/process-pane'
import { LOOK, needsUser, symbolOf } from '../../infra/process-pane/status-look'
import { nodeSegment, ring, titleText } from '../../infra/process-pane/rich'
import { activityOf } from '../../infra/process-pane/activity'
import { say, st } from '../pane-state'
import type { Ctx } from '../ctx'

export async function boundScreen(c: Ctx): Promise<unknown> {
  const { resume, gate, approve, requestChanges, close } = c
  const { Box, Button, Input, Client, card, detail, e, files, k, line, narrow, nav, openInViewer, picture, redraw, rich, tabRow, toggle, views } = c
  const bound = c.bound!
  const own = bound.dir === st.boundDir // View opens another process read only: it has no buttons that act on the session
  // A process is bound to the session: the pane shows that one process, or the detail of one of its steps.
  const look = LOOK[bound.kind]
  const kindWord = (kind: keyof typeof LOOK) => line(LOOK[kind].word, { color: LOOK[kind].color })
  const goTo = (dir: string | undefined) => () => { st.shown = dir; st.openStep = undefined; st.section = 'steps'; redraw() }
  if (detail) {
    const at = bound.steps.findIndex(s => s.id === detail.id)
    const move = (by: number) => () => { st.openStep = bound.steps[at + by]?.id; redraw() }
    const block = (title: string, items: string[]) => items.length ? [line(title, { bold: true }), ...items.map(item => line(`  ${item}`))] : []
    const tabButton = (name: typeof st.detailTab, label: string) => toggle(`dtab-${name}`, label, st.detailTab === name, () => { st.detailTab = name; redraw() })
    const parts = st.detailTab === 'definition'
      ? [...block('Produces', detail.produces), ...block('Substeps', detail.substeps), ...block('Reads memory', detail.reads), ...block('Writes memory', detail.writes)]
      : [...block('Actions', detail.actions), ...block('Reasoning', detail.reasoning), ...block('Decisions', detail.decisions), ...block('Files', detail.files),
         ...block('Produced', detail.produced.map(([k, v]) => `${k}: ${v}`)), ...block('Notes', detail.notes), ...block('Problems', detail.problems)]
    return card('step-detail', [
      Box({ flexDirection: 'row', columnGap: 1, children: k ? [line(`${detail.number}. ${detail.name}`, { bold: true }), k.kindPill(detail.kind)] : [line(symbolOf(detail.kind, false), { color: LOOK[detail.kind].color, bold: true }), line(`${detail.number}. ${detail.name}`, { bold: true }), kindWord(detail.kind)] }),
      tabRow([tabButton('definition', 'Definition'), tabButton('execution', 'Execution')]),
      line(' '),
      ...(parts.length ? parts : [line(st.detailTab === 'definition' ? 'This step has no definition.' : 'Nothing recorded yet.', { dimColor: true })]),
      line(' '),
      Box({ flexDirection: 'row', columnGap: 3, children: [
        nav('back-steps', st.section === 'logs' ? 'Back to logs' : 'Back to steps', () => { st.openStep = undefined; redraw() }),
        ...(at > 0 ? [nav('step-prev', `‹ ${bound.steps[at - 1].number}`, move(-1))] : []),
        ...(at >= 0 && at < bound.steps.length - 1 ? [nav('step-next', `${bound.steps[at + 1].number} ›`, move(1))] : []),
      ] }),
    ], needsUser(detail.kind))
  }
  const stepRows = (s: StepRow, i: number) => [
    Box({ key: `row-${s.id}`, flexDirection: 'row', columnGap: 1, children: [
      rich ? picture(nodeSegment(s.kind, { first: i === 0, last: i === bound.steps.length - 1, height: 22 }), LOOK[s.kind].word, 24, 22) : line(symbolOf(s.kind, false), { color: LOOK[s.kind].color, bold: s.active }),
      Button({ key: `step-${s.id}`, label: `${s.number}. ${s.name}`, plain: true, onPress: () => { st.openStep = s.id; redraw() } }),
      ...(needsUser(s.kind) ? [kindWord(s.kind)] : []),
    ] }),
    ...(narrow ? [] : s.substeps.map(sub => line(`    ${sub.active ? '◀' : '·'} ${sub.number} ${sub.name}`, { dimColor: !sub.active, ...(sub.active ? { color: look.color } : {}) }))),
    ...(narrow ? [] : s.children.map((c, n) => Box({ key: `child-${s.id}-${n}`, flexDirection: 'row', columnGap: 1, children: [
      line('  └', { dimColor: true }), line(symbolOf(c.kind, false), { color: LOOK[c.kind].color }),
      Button({ key: `sub-${s.id}-${n}`, label: c.name, plain: true, onPress: goTo(c.dir) }), kindWord(c.kind),
    ] }))),
  ]
  // Desktop: a card for each step, with its substeps as chips and a sub-process under it in a dashed card.
  const stepCards = (s: StepRow, i: number) => {
    const activeSub = s.substeps.find(x => x.active)?.number ?? 0
    return [
      k!.card(`scard-${s.id}`, [
        Box({ flexDirection: 'row', columnGap: 1, children: [
          picture(nodeSegment(s.kind, { first: true, last: true, height: 22 }), LOOK[s.kind].word, 24, 22),
          Button({ key: `step-${s.id}`, label: `${s.number}. ${s.name}`, plain: true, dimColor: s.kind === 'done' || s.kind === 'pending', onPress: () => { st.openStep = s.id; redraw() } }),
          s.kind === 'pending' || s.kind === 'done' ? line(LOOK[s.kind].word, { dimColor: true }) : k!.kindPill(s.kind),
        ] }),
        ...(narrow || !s.substeps.length ? [] : [k!.wrap(s.substeps.map(sub => k!.chip(`${sub.number} ${sub.name}`, sub.active ? 'active' : sub.number < activeSub ? 'done' : 'idle')))]),
      ], { hot: needsUser(s.kind), active: s.active }),
      ...(narrow ? [] : s.children.map((c, n) => Box({ key: `child-${s.id}-${n}`, marginLeft: 3, flexDirection: 'column', children: [
        k!.card(`ccard-${s.id}-${n}`, [Box({ flexDirection: 'row', columnGap: 1, children: [line('↳', { dimColor: true }), Button({ key: `sub-${s.id}-${n}`, label: c.name, plain: true, onPress: goTo(c.dir) }), k!.kindPill(c.kind)] })], { dashed: true }),
      ] }))),
    ]
  }
  // Desktop: the steps as a graph the user can move. The terminal and the toggle's other side keep the timeline.
  const node = (id: string, label: string, kind: keyof typeof LOOK, sub: string, go: 'step' | 'open', target: string) =>
    ({ id, label, sub, symbol: symbolOf(kind, false), color: LOOK[kind].color, hot: needsUser(kind), go, target })
  const graphButtons = [
    toggle('mode-graph', 'Graph', st.graphOn, () => { st.graphOn = true; redraw() }),
    toggle('mode-list', 'Timeline', !st.graphOn, () => { st.graphOn = false; redraw() }),
  ]
  const graph = Client && e.surface === 'desktop' && st.graphOn ? Client({
    key: 'graph', module: '../graph-view.ts', width: '100%', height: 22,
    props: {
      ...(bound.parent ? { parent: node('parent', bound.parent.name, 'running', 'parent process', 'open', bound.parent.dir) } : {}),
      rows: bound.steps.map(s => ({
        active: s.active,
        step: node(s.id, `${s.number}. ${s.name}`, s.kind, `${LOOK[s.kind].word}${s.substeps.length ? ` · substep ${s.substeps.find(x => x.active)?.number ?? '-'} of ${s.substeps.length}` : ''}`, 'step', s.id),
        children: s.children.map((c, n) => node(`${s.id}-${n}`, c.name, c.kind, `sub-process · ${LOOK[c.kind].word}`, 'open', c.dir)),
      })),
    },
  }) : undefined
  // The four tabs of a bound process. A count on a tab says how much is inside.
  const v = views!
  const outputs = v.rows.filter(r => r.output)
  const topicCount = st.section === 'memory' ? v.mem.topics.length : v.counts.topics
  const fileCount = st.section === 'files' ? outputs.length : v.counts.files
  const sec = (name: typeof st.section, label: string, short: string, count = 0) =>
    toggle(`sec-${name}`, `${narrow ? short : label}${count && !narrow ? ` ·${count}` : ''}`, st.section === name, () => { st.section = name; st.message = ''; redraw() })
  const sectionTabs = tabRow([
    sec('steps', 'Steps', 'Steps'), sec('memory', 'Memory', 'Mem', topicCount), sec('logs', 'Logs', 'Logs'), sec('files', 'Files', 'Files', fileCount),
  ], Client && e.surface === 'desktop' && st.section === 'steps' ? graphButtons : []) // Graph and Timeline sit at the right of the same row
  const none = (text: string) => line(text, { dimColor: true })
  const sub = (name: typeof st.memTab, label: string) => toggle(`mem-${name}`, label, st.memTab === name, () => { st.memTab = name; redraw() })
  const toLine = (items: string[]) => items.join(', ') || '-'
  const topicRows = (t: (typeof v.mem.topics)[number]) => [
    Button({ key: `topic-${t.topic}`, label: `${st.openTopic === t.topic ? '▾' : '▸'} ${t.topic}`, plain: true, onPress: () => { st.openTopic = st.openTopic === t.topic ? undefined : t.topic; redraw() } }),
    ...(st.openTopic === t.topic ? t.entries.flatMap(en => [
      line(`  step ${en.step} ${en.stepName}`, { bold: true }),
      ...en.values.map(([key, val]) => line(`    ${key}: ${val}`)),
      ...en.decisions.map(d => line(`    decision: ${d}`)), ...en.files.map(f => line(`    file: ${f}`)), ...en.notes.map(n => line(`    note: ${n}`)),
    ]) : []),
  ]
  const diffColor = (l: string) => (l[0] === '+' ? 'success' : l[0] === '-' ? 'error' : 'warning')
  const memoryBody = [
    tabRow([sub('flow', 'Flow'), sub('topics', 'Topics'), sub('history', 'History'), sub('diffs', 'Diffs')]),
    line(' '),
    ...(!v.mem.topics.length ? [none('No memory yet. A step writes memory when it runs.')]
      : st.memTab === 'flow' ? v.mem.topics.map(t => line(`${t.topic}  ·  written by ${toLine(t.writtenBy)}  ·  read by ${toLine(t.readBy)}`))
      : st.memTab === 'topics' ? (k ? [k.stack(v.mem.topics.map(t => k.card(`tcard-${t.topic}`, topicRows(t))))] : v.mem.topics.flatMap(topicRows))
      : st.memTab === 'history' ? (v.mem.history.length ? v.mem.history.map(en => line(`${en.updated.slice(0, 16).replace('T', ' ')}  ${en.topic}  step ${en.step}  ·  ${en.values.length} values`)) : [none('No entries yet.')])
      : (v.mem.diffs.length ? v.mem.diffs.flatMap(d => [line(`${d.topic}: step ${d.from} → step ${d.to}`, { bold: true }), ...d.lines.map(l => line(`  ${l}`, { color: diffColor(l) }))]) : [none('No topic has two entries that differ.')])),
  ]
  const clock = (t?: string) => (t ? t.slice(11, 16) || t.slice(0, 16) : '')
  const logRows = (r: (typeof v.logs)[number]) => [
    Box({ key: `logrow-${r.id}`, flexDirection: 'row', columnGap: 1, children: [
      ...(k ? [k.kindPill(r.kind)] : [line(symbolOf(r.kind, false), { color: LOOK[r.kind].color })]),
      Button({ key: `log-${r.id}`, label: `${r.number}. ${r.name}`, plain: true, onPress: () => { st.openStep = r.id; st.detailTab = 'execution'; redraw() } }),
      ...(clock(r.started) ? [line(`${clock(r.started)}${r.completed ? ` – ${clock(r.completed)}` : ''}`, { dimColor: true })] : []),
    ] }),
    ...(narrow ? [] : r.actions.slice(0, 2).map(a => line(`    ${a}`, { dimColor: true }))),
    ...(narrow ? [] : r.problems.slice(0, 2).map(p => line(`    problem: ${p}`, { color: 'error' }))),
  ]
  const logsBody = v.logs.length ? (k ? [k.stack(v.logs.map(r => k.card(`logcard-${r.id}`, logRows(r))))] : v.logs.flatMap(logRows)) : [none('No log yet. The agent writes one for each step it finishes.')]
  const fileRow = (r: (typeof v.rows)[number], i: number) => (k ? (x: unknown) => k.card(`filecard-${i}`, [x]) : (x: unknown) => x)(Box({ key: `filerow-${i}`, flexDirection: 'row', columnGap: 2, children: [
    r.openable ? Button({ key: `file-${r.path}`, label: r.name, plain: true, onPress: async () => { say('error', await openInViewer(r.path, e.surface)); redraw() } }) : line(r.name, { dimColor: true }),
    ...(r.step ? [line(`step ${r.step}`, { dimColor: true })] : []),
  ] }))
  const framework = v.rows.filter(r => !r.output)
  // A file never opens inside the pane: a press hands it to the viewer (see openInViewer).
  const filesBody = [
    ...(outputs.length ? outputs.map(fileRow) : [none('No output file yet. A step lists its files when it finishes.')]),
    ...(framework.length ? [Button({ key: 'fw-toggle', label: `${st.showFramework ? '▾' : '▸'} Framework files (${framework.length})`, plain: true, dimColor: true, onPress: () => { st.showFramework = !st.showFramework; redraw() } })] : []),
    ...(st.showFramework ? framework.map(fileRow) : []),
  ]
  const stepsBody = graph ? [graph] : [...(k ? [k.stack(bound.steps.flatMap(stepCards))] : bound.steps.flatMap(stepRows))]
  const title = titleText(bound.name)
  // The approval step: while it runs, a line says approval comes after it; when the agent asked and no dialog is open, the pane has the buttons.
  const next = gate ? bound.steps[bound.steps.findIndex(s => s.id === gate.stepId) + 1] : undefined
  const gateCard = !gate || !own ? [] : gate.state === 'working'
    ? [line(`Step ${gate.number} "${gate.name}" needs your approval when it is done.`, { dimColor: true })]
    : [card('gate', [
      Box({ flexDirection: 'row', columnGap: 1, children: [line(`Step ${gate.number} "${gate.name}" needs your approval`, { bold: true }), ...(k ? [k.kindPill('waiting')] : [])] }),
      ...(gate.output ? [line(gate.output, { dimColor: true })] : []),
      ...(gate.state === 'dialog'
        ? [line('Claude asked in a dialog. Answer the dialog that is open.', { dimColor: true })]
        : [
          line(`Approve: ${next ? `runs step ${next.number} "${next.name}"` : 'the process ends'}. Request changes: step ${gate.number} runs again.`, { dimColor: true }),
          Box({ flexDirection: 'row', columnGap: 1, children: [
            Button({ key: 'gate-approve', label: 'Approve', ...(k ? { variant: 'primary' } : {}), onPress: () => approve(gate.stepId) }),
            Button({ key: 'gate-changes', label: st.changing ? 'Cancel' : 'Request changes', ...(k ? { variant: 'secondary' } : { plain: true }), onPress: () => { st.changing = !st.changing; st.reason = ''; redraw() } }),
          ] }),
          ...(st.changing ? [
            Input({ key: 'gate-reason', label: 'What should change?', value: st.reason, autoFocus: true, onInput: (text: string) => { st.reason = text }, submitLabel: 'send', onSubmit: async (text: string) => { st.reason = text; if (text.trim()) await requestChanges(gate.stepId, text) } }),
            Button({ key: 'gate-send', label: 'Send changes', dimColor: !st.reason.trim(), plain: true, onPress: () => (st.reason.trim() ? requestChanges(gate.stepId, st.reason) : undefined) }),
          ] : []),
        ]),
    ], gate.state === 'ready')]
  const activity = activityOf(bound.kind, st.processes.find(p => p.dir === bound.dir)?.lastLogMs, Date.now())
  const activityLine = activity ? [line(activity.text, activity.quiet ? { color: 'warning' } : { dimColor: true })] : []
  // A failed or paused process says why it stopped, and has one button to go on. The button hands the agent the process again, with one extra line.
  const attention = bound.attention
  const attentionCard = attention ? [card('attention', [
    Box({ flexDirection: 'row', columnGap: 1, children: [line(bound.kind === 'failed' ? `Step ${attention.number} failed` : 'The process is paused', { bold: true }), ...(k ? [k.kindPill(bound.kind)] : [])] }),
    line(attention.reason || (bound.kind === 'failed' ? 'The log holds no error text.' : `It stopped at step ${attention.number} "${attention.name}".`), { dimColor: true }),
    ...(!own ? [line('Resume it from the list to go on.', { dimColor: true })] : [Button({ key: 'retry', label: bound.kind === 'failed' ? 'Retry step' : 'Resume', ...(k ? { variant: 'primary' } : {}),
      onPress: () => resume(bound.dir, bound.kind === 'failed' ? `The user pressed Retry on step ${attention.number} "${attention.name}". Run that step again.` : 'The user pressed Resume on a paused process.') })]),
  ], true)] : []
  return card('bound', [
    ...(bound.parent ? [nav('parent', `↑ ${bound.parent.name}`, goTo(bound.parent.dir))] : []),
    ...(rich
      ? [Box({ flexDirection: 'row', columnGap: 2, children: [
        picture(ring(bound.step, bound.total, bound.kind), `Step ${bound.step} of ${bound.total}`, 44, 44),
        Box({ flexDirection: 'column', children: [
          Box({ flexDirection: 'row', columnGap: 1, children: [picture(title.source, bound.name, title.width, title.height), k!.kindPill(bound.kind)] }),
          line(`Step ${bound.step} of ${bound.total}${bound.steps[bound.step - 1] ? `  ·  ${bound.steps[bound.step - 1].name}` : ''}`, { dimColor: true }),
          ...activityLine,
        ] }),
      ] })]
      : [Box({ flexDirection: 'row', columnGap: 1, children: [line(symbolOf(bound.kind, false), { color: look.color, bold: true }), line(bound.name, { bold: true }), line(look.word, { color: look.color })] }),
        line(`Step ${bound.step} of ${bound.total}`, { dimColor: true }), ...activityLine]),
    ...(own ? [] : [line('Viewing only. The session does not work on this process.', { dimColor: true })]),
    ...attentionCard,
    ...gateCard,
    sectionTabs,
    line(' '),
    ...(st.section === 'memory' ? memoryBody : st.section === 'logs' ? logsBody : st.section === 'files' ? filesBody : stepsBody),
    line(' '),
    Box({ flexDirection: 'row', columnGap: 3, children: [
      nav('back-list', k ? '← Back to list' : 'Back to list', () => { st.view = 'list'; st.tab = 'continue'; st.shown = st.boundDir; redraw() }),
      ...(own ? [Button({ key: 'close-process', label: 'Close process', ...(k ? { variant: 'secondary' } : { plain: true, dimColor: true }), onPress: close })] : []),
    ] }),
  ], needsUser(bound.kind))
}
