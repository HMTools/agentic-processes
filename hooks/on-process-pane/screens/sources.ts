import { addMarketplace, refreshMarketplaces, removeMarketplace, toggleMarketplace, updateMarketplace } from '../../infra/templates/templates'
import type { MarketplaceFields } from '../../infra/templates/templates'
import { ago } from '../../infra/process-pane/activity'
import { askAgain, noteRefresh, st } from '../pane-state'
import type { Ctx } from '../ctx'

export async function sourcesScreen(c: Ctx): Promise<unknown[]> {
  const { Box, Button, Input, line, nav, ports, redraw, templateJob } = c
  const now = Date.now()
  // Each source: whether it is on, how many templates it gives, when it was read last, and the last error of a refresh.
  const marketplaces = st.markets.flatMap((m, i) => [Box({
    key: `mk-${i}`, flexDirection: 'row', columnGap: 2,
    children: [
      line(`${m.name}  ·  ${m.enabled ? 'on' : 'off'}  ·  ${m.cached ? `${st.entries.filter(e => e.marketplace === m.name).length} templates${m.lastSynced ? `  ·  synced ${ago(Date.parse(m.lastSynced), now)}` : ''}  ·  priority ${m.priority}` : 'not refreshed'}`, { dimColor: !m.enabled }),
      Button({ key: `mk-toggle-${i}`, label: m.enabled ? 'Off' : 'On', plain: true, onPress: () => templateJob(ports => toggleMarketplace(ports, m.name)) }),
      Button({ key: `mk-edit-${i}`, label: 'Edit', plain: true, onPress: () => { st.form = { original: m.name, values: { name: m.name, url: m.url, branch: m.branch, priority: String(m.priority) } }; st.message = ''; redraw() } }),
      // Remove deletes the cache: the first press asks, the second removes.
      Button({ key: `mk-remove-${i}`, label: st.sure === m.name ? 'Sure?' : 'Remove', plain: true, onPress: () => { if (st.sure === m.name) return templateJob(ports => removeMarketplace(ports, m.name)); askAgain(m.name); redraw() } }),
    ],
  }), ...(st.sourceErrors[m.name] ? [line(`  ✕ ${st.sourceErrors[m.name]}`, { color: 'error' })] : [])])
  const fields: [keyof MarketplaceFields, string][] = [['name', 'name *'], ['url', 'git address *'], ['branch', 'branch (main)'], ['priority', 'priority (100)']]
  const editor = st.form && [
    line(st.form.original ? `Edit ${st.form.original}` : 'Add a marketplace', { bold: true }),
    ...fields.map(([key, label], i) => Input({
      key: `mk-field-${key}`, label, value: st.form!.values[key], ...(i === 0 ? { autoFocus: true } : {}),
      onInput: (text: string) => { st.form!.values[key] = text },
      submitLabel: 'save', onSubmit: async (text: string) => { st.form!.values[key] = text; await save() },
    })),
    Box({ flexDirection: 'row', columnGap: 3, children: [
      Button({ key: 'mk-save', label: 'Save', onPress: save }),
      Button({ key: 'mk-cancel', label: 'Cancel', plain: true, onPress: () => { st.form = undefined; st.message = ''; redraw() } }),
    ] }),
  ]
  async function save() {
    const f = st.form!
    await templateJob(async ports => { await (f.original ? updateMarketplace(ports, f.original, f.values) : addMarketplace(ports, f.values)); st.form = undefined })
  }
  return editor ?? [
    line('Sources of templates', { bold: true }),
    ...(st.markets.length ? [] : [line('No source yet. Press Add marketplace and give a git address.', { dimColor: true })]),
    ...marketplaces,
    Button({ key: 'mk-add', label: 'Add marketplace', plain: true, onPress: () => { st.form = { values: { name: '', url: '', branch: '', priority: '' } }; st.message = ''; redraw() } }),
    line(' '),
    Box({ flexDirection: 'row', columnGap: 3, children: [
      Button({ key: 'tpl-refresh', label: st.busy === 'refresh' ? 'Refreshing…' : 'Refresh', onPress: () => templateJob(async ports => { const lines = await refreshMarketplaces(ports); noteRefresh(lines); return lines.join('\n') }, 'refresh') }),
      nav('mk-back', 'Back to templates', () => { st.tab = 'new'; st.message = ''; redraw() }),
    ] }),
  ]
}
