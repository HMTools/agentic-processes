import { deleteProcess, inFolder, resumeProcess } from '../../infra/process-pane/process-pane'
import type { ProcessInfo } from '../../infra/process-pane/process-pane'
import { LOOK, needsUser, symbolOf } from '../../infra/process-pane/status-look'
import { HEX, progressBar } from '../../infra/process-pane/rich'
import { activityOf, ago } from '../../infra/process-pane/activity'
import { stateWord } from '../../infra/process-pane/band'
import { askAgain, say, st } from '../pane-state'
import type { Ctx } from '../ctx'

export async function continueScreen(c: Ctx): Promise<unknown[]> {
  const { Box, Button, card, cwd, handOff, k, line, narrow, picture, redraw, refresh, rich, toggle, ports, store } = c
  const processCard = (p: ProcessInfo, i: number) => {
    const look = LOOK[p.kind]
    const now = Date.now()
    const activity = activityOf(p.kind, p.lastLogMs, now)
    // What it is, where it is, why it needs you, and how long ago it changed.
    const where = `${p.template ? `${p.template}  ·  ` : ''}step ${p.step} of ${p.total}${p.stepName ? `  ·  ${p.stepName}` : ''}`
    const why = `${stateWord(p)}${p.updatedMs !== undefined ? `  ·  ${ago(p.updatedMs, now)}` : ''}`
    const view = () => { st.view = 'process'; st.shown = p.dir; st.openStep = undefined; st.section = 'steps'; st.message = ''; redraw() } // read only: the session keeps its own process
    const activityLine = activity ? [line(activity.text, activity.quiet ? { color: 'warning' } : { dimColor: true })] : []
    const filled = p.kind === 'done' ? 20 : Math.round(((p.step - 1) / Math.max(1, p.total)) * 20)
    const resume = async () => handOff(await resumeProcess(ports(), p.dir))
    // Delete moves the folder to deleted/ and asks twice. The process this session works on stays.
    const deletePress = async () => {
      if (p.dir === st.boundDir) { say('error', 'This session works on that process. Close it first.'); redraw(); return }
      if (st.sure !== p.dir) { askAgain(p.dir); say('info', ''); redraw(); return }
      st.sure = undefined
      try { say('success', `Moved to ${await deleteProcess(ports(), p.dir)}`) } catch (error) { say('error', error instanceof Error ? error.message : String(error)) }
      await refresh()
    }
    if (k) {
      return k.card(`card-${i}`, [
        Box({ flexDirection: 'row', columnGap: 1, children: [line(p.name, { bold: true }), k.kindPill(p.kind)] }),
        line(where, { dimColor: true }),
        line(why, { dimColor: true }),
        ...activityLine,
        ...(narrow ? [] : [picture(progressBar(p.kind === 'done' ? p.total : p.step - 1, p.total, p.kind, 240), `step ${p.step} of ${p.total}`, 240, 8)]),
        Box({ flexDirection: 'row', columnGap: 1, children: [
          k.action(`process-${i}`, 'Resume', resume, 'go'),
          Button({ key: `view-${i}`, label: 'View', variant: 'secondary', onPress: view }),
          Button({ key: `del-${i}`, label: st.sure === p.dir ? 'Sure?' : 'Delete', variant: 'secondary', onPress: deletePress }),
        ] }),
      ], { hot: needsUser(p.kind), edge: HEX[p.kind] })
    }
    return card(`card-${i}`, [
      Box({
        flexDirection: 'row', columnGap: 1,
        children: [
          line(symbolOf(p.kind, false), { color: look.color, bold: true }),
          Button({ key: `process-${i}`, plain: true, label: p.name, onPress: resume }),
          Button({ key: `view-${i}`, plain: true, label: 'View', dimColor: true, onPress: view }),
          line(look.word, { color: look.color }),
          Button({ key: `del-${i}`, label: st.sure === p.dir ? 'Sure?' : 'Delete', plain: true, dimColor: st.sure !== p.dir, onPress: deletePress }),
        ],
      }),
      line(narrow ? `step ${p.step}/${p.total}` : where, { dimColor: true }),
      ...(narrow ? [] : [line(why, { dimColor: true })]),
      ...activityLine,
      ...(narrow ? [] : [rich ? picture(progressBar(p.kind === 'done' ? p.total : p.step - 1, p.total, p.kind, 240), `step ${p.step} of ${p.total}`, 240, 8) : line('█'.repeat(filled).padEnd(20, '░'), { color: look.color })]),
    ], needsUser(p.kind))
  }

  const here = inFolder(st.processes, cwd, st.allFolders)
  const FILTERS = [['all', 'All', () => true], ['needs', 'Needs me', (p: ProcessInfo) => needsUser(p.kind)], ['running', 'Running', (p: ProcessInfo) => p.kind === 'running'],
    ['done', 'Done', (p: ProcessInfo) => p.kind === 'done'], ['failed', 'Failed', (p: ProcessInfo) => p.kind === 'failed']] as const
  const filter = FILTERS.find(f => f[0] === st.filter) ?? FILTERS[0]
  const visible = here.filter(filter[2])
  const chips = Box({ flexDirection: 'row', columnGap: 1, flexWrap: 'wrap', children: FILTERS.map(([id, label, test]) => {
    const n = here.filter(test).length
    return toggle(`flt-${id}`, `${label}${n && id !== 'all' && !narrow ? ` ·${n}` : ''}`, st.filter === id, () => { st.filter = id; redraw() })
  }) })
  const setFolders = (all: boolean) => async () => { st.allFolders = all; await store.set('allFolders', all); redraw() }
  const folderSwitch = Box({
    flexDirection: 'row', columnGap: 2,
    children: [
      toggle('folder-here', 'This folder', !st.allFolders, setFolders(false)),
      toggle('folder-all', 'All folders', st.allFolders, setFolders(true)),
    ],
  })
  return [
    folderSwitch,
    ...(here.length > 1 || st.filter !== 'all' ? [chips] : []),
    ...(visible.length
      ? (k ? [k.stack(visible.map(processCard))] : visible.map(processCard))
      : here.length ? [line('No process matches this filter. Press All.', { dimColor: true })]
      : [line(st.allFolders || !st.processes.length ? 'No process is running. Start one on the New tab.' : 'No process in this folder. Press All folders to see every process.', { dimColor: true })]),
  ]
}
