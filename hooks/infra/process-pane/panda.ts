// The surfer panda of the pane header (Desktop only): a 16 by 14 pixel picture, drawn as an SVG with one square for each pixel.
// Each letter of a grid is a color: K black, W white, B board, Y stripe, V water, H the headband, . nothing.

export type Pose = 'surfing' | 'arms-up' | 'waving' | 'water'

const GRIDS: Record<Pose, string[]> = {
  surfing: [
    '..KK........KK..',
    '.KKKWWWWWWWWKKK.',
    '..HHHHHHHHHHHH..',
    '..WKKKWWWWKKKW..',
    '..WKWKWWWWKWKW..',
    '..WWWWWKKWWWWW..',
    '...WWWWWWWWWW...',
    '..KKKKWWWWKKKK..',
    '...KK.WWWW.KK...',
    '....KWWWWWWK....',
    '.....KK....KK...',
    '.BBBBYYYYYYBBBB.',
    '..BBBBBBBBBBBB..',
    'VVVV..VVVV..VVVV',
  ],
  'arms-up': [
    '..KK........KK..',
    '.KKKWWWWWWWWKKK.',
    '..HHHHHHHHHHHH..',
    'KKWKKKWWWWKKKWKK',
    'KKWKWKWWWWKWKWKK',
    'KKWWWWWKKWWWWWKK',
    'KK.WWWWWWWWWW.KK',
    'KK..KKWWWWKK..KK',
    '....KWWWWWWK....',
    '....KWWWWWWK....',
    '.....KK....KK...',
    '.BBBBYYYYYYBBBB.',
    '..BBBBBBBBBBBB..',
    'VVVV..VVVV..VVVV',
  ],
  waving: [
    '..KK........KK..',
    '.KKKWWWWWWWWKKK.',
    '..HHHHHHHHHHHH..',
    '..WKKKWWWWKKKWKK',
    '..WKWKWWWWKWKWKK',
    '..WWWWWKKWWWWWKK',
    '...WWWWWWWWWW.KK',
    '....KKWWWWKK..KK',
    '...KKKWWWWKKK...',
    '....KWWWWWWK....',
    '.....KK....KK...',
    '.BBBBYYYYYYBBBB.',
    '..BBBBBBBBBBBB..',
    'VVVV..VVVV..VVVV',
  ],
  water: [
    '..KK........KK..',
    '.KKKWWWWWWWWKKK.',
    '..HHHHHHHHHHHH..',
    'KKWKKKWWWWKKKWKK',
    'KKWKWKWWWWKWKWKK',
    'KKWWWWWKKWWWWWKK',
    'KK.WWWWKKWWWW.KK',
    'KK..KKWWWWKK..KK',
    '....KWWWWWWK....',
    '....KWWWWWWK....',
    'VVVVKWWWWWWKVVVV',
    'VV.VVVVVVVVVV.VV',
    'VV.BBYYBB.VVVVVV',
    'VVVV..VVVV..VVVV',
  ],
}
const HEADBAND: Record<Pose, string> = { surfing: '#3fbf7f', 'arms-up': '#4d8dff', waving: '#f2b13d', water: '#e5534b' }
const COLORS: Record<string, string> = { K: '#23232b', W: '#f6f5ef', B: '#35b6ff', Y: '#ffd24a', V: '#2f6fe0' }

export const PANDA_SIZE = { width: 40, height: 35 }

export function pandaSvg(pose: Pose): { source: string; width: number; height: number } {
  const rects = GRIDS[pose].flatMap((row, y) => [...row].map((c, x) => c === '.' ? '' : `<rect x="${x}" y="${y}" width="1" height="1" fill="${c === 'H' ? HEADBAND[pose] : COLORS[c]}"/>`)).join('')
  return { ...PANDA_SIZE, source: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 14" width="${PANDA_SIZE.width}" height="${PANDA_SIZE.height}" shape-rendering="crispEdges"><rect width="16" height="14" rx="2" fill="#9aa6cc"/>${rects}</svg>` }
}

// The panda reacts to the notice at the top: arms up for a result, in the water for an error, else surfing. The notice clears itself, so the panda goes back.
export function poseOf(kind: 'info' | 'success' | 'error', message: string): Pose {
  if (!message) return 'surfing'
  return kind === 'success' ? 'arms-up' : kind === 'error' ? 'water' : 'surfing'
}
