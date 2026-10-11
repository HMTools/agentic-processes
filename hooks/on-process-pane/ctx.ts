import type { FileSystem, ManagerPorts } from '../infra/ports/ports'
import type { Started, boundView, stepDetail } from '../infra/process-pane/process-pane'
import type { TemplatePorts } from '../infra/templates/templates'
import type { richKit } from './rich-ui'
import type { readViews } from './on-process-pane'

// What a screen gets from the pane: the element makers, the small drawing helpers, and a few closures over `$`.
// A screen never receives `$` itself: mods cannot share a function that takes `$` across files.
export interface Ctx {
  e: any
  Box: any; Text: any; Button: any; Input: any; Svg: any; Client: any
  line: (text: string, props?: Record<string, unknown>) => unknown
  narrow: boolean
  rich: boolean
  picture: (source: string, alt: string, width: number, height: number) => unknown
  k: ReturnType<typeof richKit> | undefined
  toggle: (key: string, label: string, active: boolean, onPress: () => void) => unknown
  tabRow: (buttons: unknown[], right?: unknown[]) => unknown
  nav: (key: string, label: string, onPress: () => void) => unknown
  card: (key: string, children: unknown[], hot?: boolean) => unknown
  redraw: () => void
  cwd: string
  bound: Awaited<ReturnType<typeof boundView>> | undefined
  detail: Awaited<ReturnType<typeof stepDetail>> | undefined
  views: Awaited<ReturnType<typeof readViews>> | undefined
  files: FileSystem
  ports: () => ManagerPorts
  store: { set(key: string, value: unknown): unknown }
  templateJob: (job: (ports: TemplatePorts) => Promise<string | void>) => Promise<void>
  handOff: (started: Started) => Promise<void>
  openInViewer: (path: string, surface: string) => Promise<string>
  refresh: () => Promise<void>
  resume: (dir: string, note?: string) => Promise<void> // bind the process again and hand it to the agent, with one extra line
}
