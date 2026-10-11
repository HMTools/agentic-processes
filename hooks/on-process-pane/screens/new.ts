import { missingFields, startProcess } from '../../infra/process-pane/process-pane'
import { FAVORITES, groupRows, lastUsedNames, matches, mergeTemplates, templateDetail } from '../../infra/process-pane/template-views'
import type { TemplateRow } from '../../infra/process-pane/template-views'
import { ago } from '../../infra/process-pane/activity'
import { CATEGORY_KEYS, HEX, PALETTE, categoryIndex, flowGrid } from '../../infra/process-pane/rich'
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
  const install = (r: TemplateRow) => {
    const label = st.busy === `install-${r.key}` ? 'Installing…' : r.state === 'update' ? 'Update' : 'Install'
    const press = () => templateJob(ports => installTemplate(ports, r.entry!), `install-${r.key}`)
    return k ? k.action(`tpl-install-${r.key}`, label, press) : Button({ key: `tpl-install-${r.key}`, label, onPress: press })
  }
  const start = (r: TemplateRow) => {
    const press = () => { st.chosen = r.template; st.values = r.template!.fields[0] && st.firstArg ? { [r.template!.fields[0].name]: st.firstArg } : {}; st.purposeOpen = false; st.message = ''; redraw() }
    return k ? k.action(`start-${r.key}`, 'Start', press, 'go') : Button({ key: `start-${r.key}`, label: 'Start', variant: 'primary', onPress: press })
  }
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
    const pick = (value: string | undefined) => () => { st.category = value; redraw() }
    const chip = (id: string, label: string, value: string | undefined, hex?: string) => (k && hex ? k.colorChip(id, label, st.category === value, hex, pick(value)) : toggle(id, label, st.category === value, pick(value)))
    const colorOf = (category: string) => PALETTE.categories[categoryIndex(category, cats)]
    const shownRows = matches(allRows, st.query, st.category, st.favorites)
    const parts = groupRows(shownRows, st.favorites, lastUsedNames(st.processes), !st.category)
    const open = (r: TemplateRow) => () => { st.detailKey = r.key; st.tdTab = 'overview'; st.tdStep = undefined; st.message = '' }
    // One template: its name without the category, "update available" only when it matters, two lines of purpose, its buttons.
    const item = (r: TemplateRow, edge?: string) => (k ? (key: string, children: unknown[]) => k.card(key, children, { edge: edge ?? colorOf(r.category) }) : card)(`tcard-${r.key}`, [
      Box({ flexDirection: 'row', columnGap: 1, children: [
        star(r.key, `fav-${r.key}`), line(r.title, { bold: true }),
        ...(r.state === 'update' ? [k ? k.pill('update available', HEX.waiting) : line('update available', { dimColor: true })] : []),
      ] }),
      ...(r.steps != null ? [line(`${r.steps} steps`, { dimColor: true })] : []),
      ...(narrow || !r.purpose ? [] : [line(r.purpose.length > 170 ? `${r.purpose.slice(0, 169)}…` : r.purpose, { dimColor: true })]),
      Box({ flexDirection: 'row', columnGap: 1, children: [
        ...(r.template ? [start(r)] : []), ...(r.entry && r.state !== 'installed' ? [install(r)] : []),
        k ? k.action(`template-${r.key}`, 'Details', () => { open(r)(); redraw() }) : Button({ key: `template-${r.key}`, label: 'Details', variant: 'secondary', onPress: () => { open(r)(); redraw() } }),
      ] }),
    ])
    // A group title in its color: a hex on Desktop, a theme word in the terminal.
    const header = (title: string, hex: string, key: string) => (k ? k.heading(title, hex) : line(title, { bold: true, color: key }))
    const section = (title: string, rows: TemplateRow[], hex: string, key: string, category?: string) => rows.length ? [header(title, hex, key), ...(k ? [k.stack(rows.map(r => item(r, hex)))] : rows.map(r => item(r)))] : []
    const missingOpen = st.showMissing || !!st.query
    const synced = Math.max(0, ...st.markets.map(m => (m.lastSynced ? Date.parse(m.lastSynced) : 0) || 0))
    const sources = st.markets.filter(m => m.enabled).length
    return [
      ...(st.processes.length ? [] : [line('Pick a template. Claude runs it and stops for your approval at gates.', { dimColor: true })]), // a hint for a first run
      Input({ key: 'search', label: 'Search', placeholder: 'name, category or purpose', value: st.query, onInput: (text: string) => { st.query = text; redraw() }, onSubmit: (text: string) => { st.query = text; redraw() } }),
      ...(st.query ? [Button({ key: 'search-clear', label: '× Clear the search', plain: true, dimColor: true, onPress: () => { st.query = ''; redraw() } })] : []),
      Box({ flexDirection: 'row', columnGap: narrow ? 1 : 2, flexWrap: 'wrap', children: [
        chip('cat-all', 'All', undefined), chip('cat-fav', `★ Favorites${st.favorites.size ? ` ·${st.favorites.size}` : ''}`, FAVORITES, PALETTE.favorites), ...cats.map(c => chip(`cat-${c}`, `${c}${narrow ? '' : ` ·${allRows.filter(r => r.category === c).length}`}`, c, colorOf(c))),
      ] }),
      // One line: how many match, how old the list is, and the buttons that were at the end of the list.
      Box({ flexDirection: 'row', columnGap: 2, flexWrap: 'wrap', children: [
        line(`${st.query || st.category ? `${shownRows.length} of ${allRows.length}` : allRows.length} templates${st.markets.length ? `  ·  ${sources} source${sources === 1 ? '' : 's'}${synced ? `  ·  synced ${ago(synced, Date.now())}` : ''}` : ''}`, { dimColor: true }),
        Button({ key: 'tpl-refresh', label: st.busy === 'refresh' ? 'Refreshing…' : '↻ Refresh', plain: true, onPress: () => templateJob(async ports => { const lines = await refreshMarketplaces(ports); noteRefresh(lines); return lines.join('\n') }, 'refresh') }),
        Button({ key: 'mk-open', label: 'Marketplaces', plain: true, onPress: () => { st.tab = 'templates'; st.message = ''; redraw() } }),
      ] }),
      line(' '),
      ...(shownRows.length ? [
        ...section('★ Favorites', parts.favorites, PALETTE.favorites, 'warning'), ...section('Last used', parts.last, PALETTE.last, 'suggestion'),
        ...parts.groups.flatMap(g => section(st.category === FAVORITES ? '★ Favorites' : g.category, g.rows, st.category === FAVORITES ? PALETTE.favorites : colorOf(g.category), st.category === FAVORITES ? 'warning' : CATEGORY_KEYS[categoryIndex(g.category, cats)])),
        ...(parts.missing.length ? [
          Button({ key: 'fold-missing', label: `${missingOpen ? '▾' : '▸'} Not installed ·${parts.missing.length}`, plain: true, onPress: () => { st.showMissing = !st.showMissing; redraw() } }),
          ...(missingOpen ? (k ? [k.stack(parts.missing.map(r => item(r)))] : parts.missing.map(r => item(r))) : []),
        ] : []),
      ] : [line(st.category === FAVORITES && !st.favorites.size ? 'No favorite yet. Press ☆ next to a template.' : allRows.length ? 'No template matches. Clear the search or press All.' : (st.markets.length ? 'No template yet. Press Refresh to read the marketplaces.' : 'No marketplace yet. Press Marketplaces, then Add marketplace, to get templates.'), { dimColor: true })]),
    ]
  }
}

export async function formScreen(c: Ctx): Promise<unknown[]> {
  const { Box, Button, Input, card, files, handOff, k, line, narrow, ports, redraw } = c
  const template = st.chosen!
  const create = async () => handOff(await startProcess(ports(), template, st.values), `Started ${template.name}`)
  const missing = missingFields(template, st.values)
  const d = await templateDetail(files, template.path)
  const asks = d ? d.steps.filter(s => s.approval).length : 0
  const purpose = d?.purpose ?? ''
  // The header: name, category, the purpose (cut at 170 characters until Show more), a row for each step ("asks you" on an approval step).
  const long = purpose.length > 170
  const headBody = [
    Box({ flexDirection: 'row', columnGap: 1, children: [line(template.name, { bold: true }), ...(k ? [k.pill(template.category, HEX.waiting)] : [line(`(${template.category})`, { dimColor: true })])] }),
    ...(purpose ? [line(long && !st.purposeOpen ? `${purpose.slice(0, 169)}…` : purpose, { dimColor: true })] : []),
    ...(long ? [Button({ key: 'purpose-more', label: st.purposeOpen ? 'Show less' : 'Show more', plain: true, onPress: () => { st.purposeOpen = !st.purposeOpen; redraw() } })] : []),
    ...(d ? d.steps.map(s => Box({ key: `step-${s.number}`, flexDirection: 'row', columnGap: 1, children: [line(String(s.number), { bold: true }), line(s.name), ...(s.approval ? [k ? k.pill('asks you 🔒', HEX.waiting) : line('🔒 asks you', { color: 'warning' })] : [])] })) : []),
  ]
  const heading = (title: string, hex: string, key: string) => (k ? k.heading(title, hex) : line(title, { bold: true, color: key }))
  // A field: the label with a star (or "optional"), the hint, then the input at full width. Enter in the field creates.
  const field = (f: (typeof template.fields)[number], i: number) => Box({ key: `fld-${f.name}`, flexDirection: 'column', children: [
    Box({ flexDirection: 'row', columnGap: 1, children: [line(f.name, { bold: true }), f.required ? line('*', { color: 'warning' }) : line('optional', { dimColor: true })] }),
    ...(f.description && !narrow ? [line(f.description, { dimColor: true })] : []),
    Input({
      key: `field-${f.name}`, placeholder: f.example ? `e.g. ${f.example}` : f.description,
      value: st.values[f.name] ?? '', ...(i === 0 ? { autoFocus: true } : {}),
      onInput: (text: string) => { const was = missingFields(template, st.values).length; st.values[f.name] = text; if (missingFields(template, st.values).length !== was) redraw() }, // redraw only when the hint changes
      submitLabel: 'Enter ↵', onSubmit: async (text: string) => { st.values[f.name] = text; await create() },
    }),
  ] })
  const fields = template.fields.map(field)
  // Above Create: what is left, or "ready".
  const hint = missing.length ? line(`${missing.length} field${missing.length === 1 ? '' : 's'} left: ${missing.join(', ')}`, { color: 'warning' }) : line('ready', { color: 'success' })
  const actions = Box({
    flexDirection: 'column', children: [hint, Box({
      flexDirection: 'row', columnGap: 3,
      children: [
        k ? k.action('create', 'Create', create, 'go') : Button({ key: 'create', label: 'Create', dimColor: missing.length > 0, onPress: create }), // a press with a field empty still says what is missing
        Button({ key: 'back', label: 'Back', plain: true, onPress: () => { st.chosen = undefined; st.purposeOpen = false; st.message = ''; redraw() } }),
      ],
    })],
  })
  const blocks = [
    heading('What runs', '#9aa3b8', 'inactive'), k ? k.card('form-head', headBody) : card('form-head', headBody),
    heading('What you give', PALETTE.favorites, 'warning'), ...(k ? [k.stack(fields)] : fields), actions,
  ]
  return k ? [k.stack(blocks)] : blocks.flatMap(b => [b, line(' ')])
}
