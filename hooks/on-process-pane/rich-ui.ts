import { LOOK } from '../infra/process-pane/status-look'
import type { Kind } from '../infra/process-pane/status-look'

// The Desktop look: cards, pills and chips made of the mod's own elements, so every part keeps its hover and press and follows the app theme.
// Colors are theme keys (success, warning, claude...), never fixed values. `inverse` swaps text and background, so a pill or an active chip is
// a block of the theme color in either theme. The terminal never calls this: it keeps its symbols and words (see on-process-pane).

export function richKit({ Box, Text, Button }: any) {
  // A status word on a block of its color.
  const pill = (text: string, color: string) => Text({ children: [` ${text} `], color, inverse: true, bold: true })
  const kindPill = (kind: Kind) => pill(LOOK[kind].word, LOOK[kind].color)
  // A small label: done in green, the active one on a block, the rest dim.
  const chip = (text: string, tone: 'done' | 'active' | 'idle') =>
    Text({ children: [tone === 'active' ? ` ${text} ` : tone === 'done' ? `✓ ${text}` : text], ...(tone === 'active' ? { color: 'warning', inverse: true } : tone === 'done' ? { color: 'success' } : { dimColor: true }) })
  // A card: a round border. A waiting step has a warning border, the active one the accent color, a sub-process a dashed border.
  const card = (key: string, children: unknown[], o: { hot?: boolean; active?: boolean; dashed?: boolean } = {}) => Box({
    key, flexDirection: 'column', borderStyle: o.dashed ? 'dashed' : 'round', borderColor: o.hot ? 'warning' : o.active ? 'claude' : 'inactive',
    paddingLeft: 1, paddingRight: 1, hover: { borderColor: 'claude' }, children,
  })
  // A row of buttons that act as one control: the open one is the primary button.
  const segmented = (buttons: unknown[]) => Box({ flexDirection: 'row', columnGap: 1, borderStyle: 'round', borderColor: 'inactive', paddingLeft: 1, paddingRight: 1, children: buttons })
  const tab = (key: string, label: string, active: boolean, onPress: () => void) => Button({ key, label, variant: active ? 'primary' : 'secondary', onPress })
  const stack = (children: unknown[]) => Box({ flexDirection: 'column', rowGap: 1, children })
  const wrap = (children: unknown[]) => Box({ flexDirection: 'row', flexWrap: 'wrap', columnGap: 1, children })
  return { pill, kindPill, chip, card, segmented, tab, stack, wrap }
}
