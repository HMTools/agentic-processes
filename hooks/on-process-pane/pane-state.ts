import type { ProcessInfo, TemplateInfo } from '../infra/process-pane/process-pane'
import type { CatalogEntry, MarketplaceFields, MarketplaceInfo } from '../infra/templates/templates'

export const PANE = 'process-pane'
export const COMMANDS = ['process', 'agentic-processes:process']
export const TABS = ['new', 'continue', 'templates'] as const
export const REFRESH_MS = 5000

// The pane keeps what it shows in this one object: a reload of the mod starts it again from the command.
export const st = {
  tab: 'new' as (typeof TABS)[number],
  view: 'list' as 'list' | 'process', // process: the pane shows the one process bound to the session
  boundDir: undefined as string | undefined,
  shown: undefined as string | undefined, // the process the pane draws: the bound one, or a sub-process or the parent the user opened
  openStep: undefined as string | undefined, // the step whose detail shows, if any
  detailTab: 'definition' as 'definition' | 'execution',
  favorites: new Set<string>(), // starred templates (`category/name`), kept in the store as `favorites`
  query: '', // the search words of the New tab
  category: undefined as string | undefined, // the chip: a category, the favorites, or all
  detailKey: undefined as string | undefined, // the template whose detail shows
  tdTab: 'overview' as 'overview' | 'steps' | 'flow' | 'raw',
  tdStep: undefined as number | undefined,
  section: 'steps' as 'steps' | 'memory' | 'logs' | 'files', // the tab of the bound process
  memTab: 'flow' as 'flow' | 'topics' | 'history' | 'diffs',
  openTopic: undefined as string | undefined,
  showFramework: false,
  graphOn: false, // Desktop: draw the steps as a graph (a Client, behind the Graph button) or as the timeline (default, with SVG nodes)
  allFolders: false, // Continue shows every folder; kept in the store as `allFolders`
  loaded: false,
  timer: undefined as { cancel(): void } | undefined,
  seen: new Set<string>(), // the processes that needed the user at the last look: a new one raises a toast
  primed: false,
  lastPrint: undefined as string | undefined, // the fingerprint of the process list at the last redraw
  lastViewPrint: '', // the same for what the open bound view reads
  debugClicks: false, // /process debug: a toast for each press and focus move
  lastDraw: Date.now(),
  entries: [] as CatalogEntry[],
  markets: [] as MarketplaceInfo[],
  form: undefined as { original?: string; values: MarketplaceFields } | undefined, // the Add or Edit form of a marketplace
  sure: undefined as string | undefined, // the marketplace whose Remove was pressed once
  templates: [] as TemplateInfo[],
  processes: [] as ProcessInfo[],
  chosen: undefined as TemplateInfo | undefined,
  values: {} as Record<string, string>,
  message: '',
  changing: false, // the gate card asks for the reason of a change request
  reason: '', // what the user typed there
  firstArg: '', // the text typed after the command: goes into the first field of the template that gets picked
}
