import { missingFields, startProcess } from '../../infra/process-pane/process-pane'
import { FAVORITES, groupRows, lastUsedNames, matches, mergeTemplates, templateDetail } from '../../infra/process-pane/template-views'
import type { TemplateRow } from '../../infra/process-pane/template-views'
import { ago } from '../../infra/process-pane/activity'
import { HEX, flowGrid } from '../../infra/process-pane/rich'
import { installTemplate, refreshMarketplaces, removeTemplate } from '../../infra/templates/templates'
import { askAgain, noteRefresh, say, st } from '../pane-state'
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
      ...(d ? [line(`${row.category}  ·  ${row.entry ? `from ${row.entry.marketplace}  ·  ` : ''}${d.steps.length} steps${d.steps.some(s => s.approval) ? `  ·  ${d.steps.filter(s => s.approval).length} ask${d.steps.filter(s => s.approval).length === 1 ? 's' : ''} for approval` : ''}`, { dimColor: true }), line(d.steps.map(s => `${s.number}. ${s.name}${s.approval ? ' 🔒' : ''}`).join('  ›  '))] : []),
      tabRow([tdTabButton('overview', 'Overview'), tdTabButton('steps', narrow ? 'Steps' : `Steps${d ? ` ·${d.steps.length}` : ''}`), tdTabButton('flow', narrow ? 'Flow' : 'Memory flow'), tdTabButton('raw', 'Raw')]),
      line(' '),
      ...(st.tdTab === 'overview' ? overview : st.tdTab === 'steps' ? stepsBody : st.tdTab === 'flow' ? flowBody : rawBody),
    ])]
  } else {
    const cats = [...new Set(allRows.map(r => r.category))].sort()
    const chip = (id: string, label: string, value: string | undefined) => toggle(id, label, st.category === value, () => { st.category = value; redraw() })
    const shownRows = matches(allRows, st.query, st.category, st.favorites)
    const parts = groupRows(shownRows, st.favorites, lastUsedNames(st.processes), !st.category)
    const open = (r: TemplateRow) => () => { st.detailKey = r.key; st.tdTab = 'overview'; st.tdStep = undefined; st.message = '' }
    // One template: its name without the category, "update available" only when it matters, two lines of purpose, its buttons.
    const item = (r: TemplateRow) => (k ? k.card : card)(`tcard-${r.key}`, [
      Box({ flexDirection: 'row', columnGap: 1, children: [
        star(r.key, `fav-${r.key}`), line(r.title, { bold: true }),
        ...(r.state === 'update' ? [k ? k.pill('update available', HEX.waiting) : line('update available', { dimColor: true })] : []),
      ] }),
      ...(r.steps != null ? [line(`${r.steps} steps`, { dimColor: true })] : []),
      ...(narrow || !r.purpose ? [] : [line(r.purpose.length > 170 ? `${r.purpose.slice(0, 169)}…` : r.purpose, { dimColor: true })]),
      Box({ flexDirection: 'row', columnGap: 1, children: [
        ...(r.template ? [start(r)] : []), ...(r.entry && r.state !== 'installed' ? [install(r)] : []),
        Button({ key: `template-${r.key}`, label: 'Details', variant: 'secondary', onPress: () => { open(r)(); redraw() } }),
      ] }),
    ])
    const header = (title: string) => line(title, { bold: true, dimColor: true })
    const section = (title: string, rows: TemplateRow[]) => rows.length ? [header(title), ...(k ? [k.stack(rows.map(item))] : rows.map(item))] : []
    const missingOpen = st.showMissing || !!st.query
    const synced = Math.max(0, ...st.markets.map(m => (m.lastSynced ? Date.parse(m.lastSynced) : 0) || 0))
    const sources = st.markets.filter(m => m.enabled).length
    return [
      ...(st.processes.length ? [] : [line('Pick a template. Claude runs it and stops for your approval at gates.', { dimColor: true })]), // a hint for a first run
      Input({ key: 'search', label: 'Search', placeholder: 'name, category or purpose', value: st.query, onInput: (text: string) => { st.query = text; redraw() }, onSubmit: (text: string) => { st.query = text; redraw() } }),
      ...(st.query ? [Button({ key: 'search-clear', label: '× Clear the search', plain: true, dimColor: true, onPress: () => { st.query = ''; redraw() } })] : []),
      Box({ flexDirection: 'row', columnGap: narrow ? 1 : 2, flexWrap: 'wrap', children: [
        chip('cat-all', 'All', undefined), chip('cat-fav', `★ Favorites${st.favorites.size ? ` ·${st.favorites.size}` : ''}`, FAVORITES), ...cats.map(c => chip(`cat-${c}`, `${c}${narrow ? '' : ` ·${allRows.filter(r => r.category === c).length}`}`, c)),
      ] }),
      // One line: how many match, how old the list is, and the buttons that were at the end of the list.
      Box({ flexDirection: 'row', columnGap: 2, flexWrap: 'wrap', children: [
        line(`${st.query || st.category ? `${shownRows.length} of ${allRows.length}` : allRows.length} templates${st.markets.length ? `  ·  ${sources} source${sources === 1 ? '' : 's'}${synced ? `  ·  synced ${ago(synced, Date.now())}` : ''}` : ''}`, { dimColor: true }),
        Button({ key: 'tpl-refresh', label: st.busy === 'refresh' ? 'Refreshing…' : '↻ Refresh', plain: true, onPress: () => templateJob(async ports => { const lines = await refreshMarketplaces(ports); noteRefresh(lines); return lines.join('\n') }, 'refresh') }),
        Button({ key: 'mk-open', label: 'Marketplaces', plain: true, onPress: () => { st.tab = 'templates'; st.message = ''; redraw() } }),
      ] }),
      line(' '),
      ...(shownRows.length ? [
        ...section('★ Favorites', parts.favorites), ...section('Last used', parts.last),
        ...parts.groups.flatMap(g => section(st.category === FAVORITES ? '★ Favorites' : g.category, g.rows)),
        ...(parts.missing.length ? [
          Button({ key: 'fold-missing', label: `${missingOpen ? '▾' : '▸'} Not installed ·${parts.missing.length}`, plain: true, onPress: () => { st.showMissing = !st.showMissing; redraw() } }),
          ...(missingOpen ? (k ? [k.stack(parts.missing.map(item))] : parts.missing.map(item)) : []),
        ] : []),
      ] : [line(st.category === FAVORITES && !st.favorites.size ? 'No favorite yet. Press ☆ next to a template.' : allRows.length ? 'No template matches. Clear the search or press All.' : (st.markets.length ? 'No template yet. Press Refresh to read the marketplaces.' : 'No marketplace yet. Press Marketplaces, then Add marketplace, to get templates.'), { dimColor: true })]),
    ]
  }
}

export async function formScreen(c: Ctx): Promise<unknown[]> {
  const { Box, Button, Input, handOff, line, narrow, ports, redraw } = c
  const template = st.chosen!
  const create = async () => handOff(await startProcess(ports(), template, st.values), `Started ${template.name}`)
  const missing = missingFields(template, st.values)
  return [
    line(`${template.category} / ${template.name}`, { bold: true }),
    ...template.fields.flatMap((f, i) => [Input({
      key: `field-${f.name}`, label: f.required ? `${f.name} *` : f.name, placeholder: f.example ? `e.g. ${f.example}` : f.description,
      value: st.values[f.name] ?? '', ...(i === 0 ? { autoFocus: true } : {}),
      onInput: (text: string) => { st.values[f.name] = text },
      submitLabel: 'create', onSubmit: async (text: string) => { st.values[f.name] = text; await create() }, // Enter in a field creates
    }), ...(f.description && !narrow ? [line(`  ${f.description}`, { dimColor: true })] : [])]),
    Box({
      flexDirection: 'row', columnGap: 3,
      children: [
        Button({ key: 'create', label: 'Create', dimColor: missing.length > 0, onPress: create }), // dim until the required fields are filled; a press still says what is missing
        Button({ key: 'back', label: 'Back', plain: true, onPress: () => { st.chosen = undefined; st.message = ''; redraw() } }),
      ],
    }),
  ]
}
