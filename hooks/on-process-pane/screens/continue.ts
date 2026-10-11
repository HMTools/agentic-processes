import { deleteProcess, inFolder, resumeProcess } from '../../infra/process-pane/process-pane'
import type { ProcessInfo } from '../../infra/process-pane/process-pane'
import { LOOK, needsUser, symbolOf } from '../../infra/process-pane/status-look'
import { progressBar } from '../../infra/process-pane/rich'
import { st } from '../pane-state'
import type { Ctx } from '../ctx'

export async function continueScreen(c: Ctx): Promise<unknown[]> {
  const { Box, Button, card, cwd, handOff, k, line, narrow, picture, redraw, refresh, rich, toggle, ports, store } = c
  const processCard = (p: ProcessInfo, i: number) => {
    const look = LOOK[p.kind]
    const filled = p.kind === 'done' ? 20 : Math.round(((p.step - 1) / Math.max(1, p.total)) * 20)
    const resume = async () => handOff(await resumeProcess(ports(), p.dir))
    // Delete moves the folder to deleted/ and asks twice. The process this session works on stays.
    const deletePress = async () => {
      if (p.dir === st.boundDir) { st.message = 'This session works on that process. Close it first.'; redraw(); return }
      if (st.sure !== p.dir) { st.sure = p.dir; st.message = ''; redraw(); return }
      st.sure = undefined
      try { st.message = `Moved to ${await deleteProcess(ports(), p.dir)}` } catch (error) { st.message = error instanceof Error ? error.message : String(error) }
      await refresh()
    }
    if (k) {
      return k.card(`card-${i}`, [
        Box({ flexDirection: 'row', columnGap: 1, children: [line(p.name, { bold: true }), k.kindPill(p.kind)] }),
        line(`step ${p.step} of ${p.total}  ·  ${p.updated}`, { dimColor: true }),
        ...(narrow ? [] : [picture(progressBar(p.kind === 'done' ? p.total : p.step - 1, p.total, p.kind, 240), `step ${p.step} of ${p.total}`, 240, 8)]),
        Box({ flexDirection: 'row', columnGap: 1, children: [
          Button({ key: `process-${i}`, label: 'Resume', variant: 'primary', onPress: resume }),
          Button({ key: `del-${i}`, label: st.sure === p.dir ? 'Sure?' : 'Delete', variant: 'secondary', onPress: deletePress }),
        ] }),
      ], { hot: needsUser(p.kind) })
    }
    return card(`card-${i}`, [
      Box({
        flexDirection: 'row', columnGap: 1,
        children: [
          line(symbolOf(p.kind, false), { color: look.color, bold: true }),
          Button({ key: `process-${i}`, plain: true, label: p.name, onPress: resume }),
          line(look.word, { color: look.color }),
          Button({ key: `del-${i}`, label: st.sure === p.dir ? 'Sure?' : 'Delete', plain: true, dimColor: st.sure !== p.dir, onPress: deletePress }),
        ],
      }),
      line(narrow ? `step ${p.step}/${p.total}` : `step ${p.step} of ${p.total}  ·  ${p.updated}`, { dimColor: true }),
      ...(narrow ? [] : [rich ? picture(progressBar(p.kind === 'done' ? p.total : p.step - 1, p.total, p.kind, 240), `step ${p.step} of ${p.total}`, 240, 8) : line('█'.repeat(filled).padEnd(20, '░'), { color: look.color })]),
    ], needsUser(p.kind))
  }

  const visible = inFolder(st.processes, cwd, st.allFolders)
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
    ...(visible.length
      ? (k ? [k.stack(visible.map(processCard))] : visible.map(processCard))
      : [line(st.allFolders || !st.processes.length ? 'No process is running. Start one on the New tab.' : 'No process in this folder. Press All folders to see every process.', { dimColor: true })]),
  ]
}
