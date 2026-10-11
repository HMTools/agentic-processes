import { startProcess } from '../../infra/process-pane/process-pane'
import { FAVORITES, matches, mergeTemplates, templateDetail } from '../../infra/process-pane/template-views'
import type { TemplateRow } from '../../infra/process-pane/template-views'
import { HEX, flowGrid } from '../../infra/process-pane/rich'
import { installTemplate, refreshMarketplaces, removeTemplate } from '../../infra/templates/templates'
import { askAgain, say, st } from '../pane-state'
import type { Ctx } from '../ctx'

export async function newScreen(c: Ctx): Promise<unknown[]> {
  const { Box, Button, Input, card, e, files, k, line, narrow, nav, openInViewer, picture, ports, redraw, rich, store, tabRow, templateJob, toggle } = c
  const allRows = mergeTemplates(st.templates, st.entries)
  const row = st.detailKey ? allRows.find(r => r.key === st.detailKey) : undefined
  const saveFavorites = async () => { await store.set('favorites', [...st.favorites]); redraw() }
  const toggleFavorite = (key: string) => () => { if (!st.favorites.delete(key)) st.favorites.add(key); return saveFavorites() }
  const star = (key: string, id: string) => Button({ key: id, label: st.favorites.has(key) ? '★' : '☆', plain: true, onPress: toggleFavorite(key) })
  const wordOf = { installed: 'installed', update: 'update available', available: 'not installed' } as const
  const install = (r: TemplateRow) => Button({ key: `tpl-install-${r.key}`, label: st.busy === `install-${r.key}` ? 'Installing…' : r.state === 'update' ? 'Update' : 'Install', onPress: () => templateJob(ports => installTemplate(ports, r.entry!), `install-${r.key}`) })
  const start = (r: TemplateRow) => Button({
    key: `start-${r.key}`, label: 'Start', variant: 'primary',
    onPress: () => { st.chosen = r.template; st.values = r.template!.fields[0] && st.firstArg ? { [r.template!.fields[0].name]: st.firstArg } : {}; st.message = ''; redraw() },
  })
  if (row) {
    // The detail of one template: purpose and parameters, the steps, the memory flow, and the file.
    const d = row.template ? await templateDetail(files, row.template.path) : undefined
    const tdTabButton = (name: typeof st.tdTab, label: string) => toggle(`td-${name}`, label, st.tdTab === name, () => { st.tdTab = name; redraw() })
    const param = (p: { name: string; required: boolean; description: string; example: string }) => line(`  ${p.name}${p.required ? ' *' : ''}   ${p.description}${p.example ? `   e.g. ${p.example}` : ''}`)
    const overview = !d ? [line(row.purpose || 'No description.'), line(' '), line('Install this template to see its steps.', { dimColor: true })] : [
      line('Purpose', { bold: true }), line(`  ${d.purpose || row.purpose || '-'}`),
      ...(d.parameters.some(p => p.required) ? [line('Needs', { bold: true }), ...d.parameters.filter(p => p.required).map(param)] : []),
      ...(d.parameters.some(p => !p.required) ? [line('Can take', { bold: true }), ...d.parameters.filter(p => !p.required).map(param)] : []),
    ]
    const stepsBody = !d ? [] : d.steps.flatMap(s => [
      Button({ key: `tdstep-${s.number}`, label: `${st.tdStep === s.number ? '▾' : '▸'} ${s.number}. ${s.name}${s.approval ? '   approval needed' : ''}`, plain: true, onPress: () => { st.tdStep = st.tdStep === s.number ? undefined : s.number; redraw() } }),
      ...(st.tdStep === s.number ? [
        ...(s.purpose ? [line(`     ${s.purpose}`, { dimColor: true })] : []),
        ...s.guidance.map(g => line(`     guidance: ${g}`)),
        ...(s.substeps.length ? [line(`     substeps: ${s.substeps.join(' · ')}`)] : []),
        ...(s.output ? [line(`     output: ${s.output}`)] : []),
        ...(s.reads.length ? [line(`     reads: ${s.reads.join(', ')}`)] : []), ...(s.writes.length ? [line(`     writes: ${s.writes.join(', ')}`)] : []),
      ] : []),
    ])
    const width = Math.max(5, ...(d?.flow.topics.map(t => t.length) ?? []))
    const flowBody = !d ? [] : d.flow.topics.length
      ? rich ? [picture(flowGrid(d.flow.topics, d.flow.cells, d.steps.map(s => s.number)), 'Which step reads and writes which memory topic', 150 + 44 * d.steps.length + 4, 26 + 28 * d.flow.topics.length), line('W writes · R reads · R/W both', { dimColor: true })] : [line(`${'topic'.padEnd(width)}  ${d.steps.map(s => String(s.number).padEnd(3)).join(' ')}`, { bold: true }),
        ...d.flow.topics.map(t => line(`${t.padEnd(width)}  ${d.flow.cells[t].map(c => (c || '·').padEnd(3)).join(' ')}`)),
        line('W writes · R reads · R/W both', { dimColor: true })]
      : [line('This template defines no memory topics.', { dimColor: true })]
    const rawBody = row.template
      ? [Button({ key: 'raw-open', label: 'Open file in the viewer', onPress: async () => { say('error', await openInViewer(row.template!.path, e.surface)); redraw() } }), line(narrow ? '' : (e.surface === 'desktop' ? 'The system opener opens the file.' : 'The editor (code) opens the file.'), { dimColor: true })]
      : [line('Install this template to open its file.', { dimColor: true })]
    return [card('tdetail', [
      Box({ flexDirection: 'row', columnGap: 3, children: [
        nav('td-back', 'Back', () => { st.detailKey = undefined; st.tdStep = undefined; st.message = ''; redraw() }),
        ...(row.template ? [start(row)] : []), ...(row.entry && row.state !== 'installed' ? [install(row)] : []),
        ...(row.state !== 'available' ? [Button({ key: `tpl-remove-${row.key}`, label: st.sure === `tpl:${row.key}` ? 'Sure?' : 'Remove', plain: true, onPress: () => { if (st.sure === `tpl:${row.key}`) return templateJob(ports => removeTemplate(ports, row)); askAgain(`tpl:${row.key}`); redraw() } })] : []),
      ] }),
      Box({ flexDirection: 'row', columnGap: 1, children: [star(row.key, 'td-fav'), line(`${row.category} / ${row.title}`, { bold: true }), line(wordOf[row.state], { dimColor: true })] }),
      tabRow([tdTabButton('overview', 'Overview'), tdTabButton('steps', narrow ? 'Steps' : `Steps${d ? ` ·${d.steps.length}` : ''}`), tdTabButton('flow', narrow ? 'Flow' : 'Memory flow'), tdTabButton('raw', 'Raw')]),
      line(' '),
      ...(st.tdTab === 'overview' ? overview : st.tdTab === 'steps' ? stepsBody : st.tdTab === 'flow' ? flowBody : rawBody),
    ])]
  } else {
    const cats = [...new Set(allRows.map(r => r.category))].sort()
    const chip = (id: string, label: string, value: string | undefined) => toggle(id, label, st.category === value, () => { st.category = value; redraw() })
    const shownRows = matches(allRows, st.query, st.category, st.favorites)
    const stateHex = { installed: HEX.running, update: HEX.waiting, available: HEX.pending } as const
    const richTemplate = (r: TemplateRow) => k!.card(`tcard-${r.key}`, [
      Box({ flexDirection: 'row', columnGap: 1, children: [star(r.key, `fav-${r.key}`), line(`${r.category} / ${r.title}`, { bold: true }), k!.pill(wordOf[r.state], stateHex[r.state])] }),
      ...(r.steps != null ? [line(`${r.steps} steps`, { dimColor: true })] : []),
      ...(narrow || !r.purpose ? [] : [line(r.purpose.length > 90 ? `${r.purpose.slice(0, 89)}…` : r.purpose, { dimColor: true })]),
      Box({ flexDirection: 'row', columnGap: 1, children: [
        ...(r.template ? [start(r)] : []), ...(r.entry && r.state !== 'installed' ? [install(r)] : []),
        Button({ key: `template-${r.key}`, label: 'Details', variant: 'secondary', onPress: () => { st.detailKey = r.key; st.tdTab = 'overview'; st.tdStep = undefined; st.message = ''; redraw() } }),
      ] }),
    ])
    return [
      ...(st.processes.length ? [] : [line('Pick a template. Claude runs it and stops for your approval at gates.', { dimColor: true })]), // a hint for a first run
      Input({ key: 'search', label: 'Search', placeholder: 'name, category or purpose', value: st.query, onInput: (text: string) => { st.query = text; redraw() }, onSubmit: (text: string) => { st.query = text; redraw() } }),
      Box({ flexDirection: 'row', columnGap: narrow ? 1 : 2, flexWrap: 'wrap', children: [
        chip('cat-all', 'All', undefined), chip('cat-fav', `★ Favorites${st.favorites.size ? ` ·${st.favorites.size}` : ''}`, FAVORITES), ...cats.map(c => chip(`cat-${c}`, c, c)),
      ] }),
      line(' '),
      ...(shownRows.length ? (k ? [k.stack(shownRows.map(richTemplate))] : shownRows.map(r => card(`tcard-${r.key}`, [
        Box({ flexDirection: 'row', columnGap: 1, children: [
          star(r.key, `fav-${r.key}`),
          Button({ key: `template-${r.key}`, plain: true, label: `${r.category} / ${r.title}`, onPress: () => { st.detailKey = r.key; st.tdTab = 'overview'; st.tdStep = undefined; st.message = ''; redraw() } }),
          line(`${r.steps != null && !narrow ? `${r.steps} steps  ·  ` : ''}${wordOf[r.state]}`, { dimColor: true }),
        ] }),
        ...(narrow || !r.purpose ? [] : [line(r.purpose.length > 90 ? `${r.purpose.slice(0, 89)}…` : r.purpose, { dimColor: true })]),
        Box({ flexDirection: 'row', columnGap: 2, children: [...(r.template ? [start(r)] : []), ...(r.entry && r.state !== 'installed' ? [install(r)] : [])] }),
      ]))) : [line(allRows.length ? 'No template matches. Clear the search or press All.' : (st.markets.length ? 'No template yet. Press Refresh to read the marketplaces.' : 'No marketplace yet. Press Marketplaces, then Add marketplace, to get templates.'), { dimColor: true })]),
      line(' '),
      Box({ flexDirection: 'row', columnGap: 3, children: [
        Button({ key: 'tpl-refresh', label: st.busy === 'refresh' ? 'Refreshing…' : 'Refresh', plain: true, onPress: () => templateJob(async ports => (await refreshMarketplaces(ports)).join('\n'), 'refresh') }),
        Button({ key: 'mk-open', label: 'Marketplaces', plain: true, onPress: () => { st.tab = 'templates'; st.message = ''; redraw() } }),
      ] }),
    ]
  }
}

export async function formScreen(c: Ctx): Promise<unknown[]> {
  const { Box, Button, Input, handOff, line, ports, redraw } = c
  const template = st.chosen!
  const create = async () => handOff(await startProcess(ports(), template, st.values))
  return [
    line(`${template.category} / ${template.name}`, { bold: true }),
    ...template.fields.map((f, i) => Input({
      key: `field-${f.name}`, label: f.required ? `${f.name} *` : f.name, placeholder: f.example ? `e.g. ${f.example}` : f.description,
      value: st.values[f.name] ?? '', ...(i === 0 ? { autoFocus: true } : {}),
      onInput: (text: string) => { st.values[f.name] = text },
      submitLabel: 'create', onSubmit: async (text: string) => { st.values[f.name] = text; await create() }, // Enter in a field creates
    })),
    Box({
      flexDirection: 'row', columnGap: 3,
      children: [
        Button({ key: 'create', label: 'Create', onPress: create }),
        Button({ key: 'back', label: 'Back', plain: true, onPress: () => { st.chosen = undefined; st.message = ''; redraw() } }),
      ],
    }),
  ]
}
