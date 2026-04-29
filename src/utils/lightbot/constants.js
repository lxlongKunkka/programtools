// Lightbot 共享常量。从 LightbotGame.vue 抽出，零行为变化。

export const STORAGE_KEY = 'programtools-lightbot-progress-v5'
export const EDITOR_DRAFT_STORAGE_KEY = 'programtools-lightbot-editor-draft-v1'
export const EDITOR_GRID_SIZE = 6
export const TILE_WIDTH = 96
export const TILE_HEIGHT = 48
export const TILE_DEPTH = 22

export const DIRECTION_ORDER = ['forward', 'right', 'backward', 'left']

export const DIRECTION_LABELS = {
  forward: 'Facing east',
  right: 'Facing south',
  backward: 'Facing west',
  left: 'Facing north'
}

export const DIRECTION_VECTORS = {
  forward: { x: 1, y: 0 },
  right: { x: 0, y: 1 },
  backward: { x: -1, y: 0 },
  left: { x: 0, y: -1 }
}

export const SPEED_MAP = { 1: 560, 2: 420, 3: 300, 4: 200, 5: 130 }

export const PROCEDURE_KEYS = ['p1', 'p2']

export const PROCEDURE_META = {
  p1: { label: 'P1', title: 'PROC1', editorLabel: 'P1 Slots', commandLabel: 'Call P1' },
  p2: { label: 'P2', title: 'PROC2', editorLabel: 'P2 Slots', commandLabel: 'Call P2' }
}

export const CONDITION_TEST_META = {
  'green-floor': { label: 'If Green', shortLabel: 'GREEN', slotLabel: 'IF-G', description: '仅当脚下是绿色地板时执行下一条' },
  'red-floor': { label: 'If Red', shortLabel: 'RED', slotLabel: 'IF-R', description: '仅当脚下是红色地板时执行下一条' },
  'dark-target': { label: 'If Dark', shortLabel: 'DARK', slotLabel: 'IF-D', description: '仅当脚下是未点亮目标格时执行下一条' },
  'forward-clear': { label: 'If Clear', shortLabel: 'CLEAR', slotLabel: 'IF-C', description: '仅当前方存在可合法前进的平台时执行下一条' }
}

// 调色板里条件块的展示顺序与对应的 commandOptions flag。新增条件类型时只需在此追加一项。
export const CONDITION_PALETTE_SPECS = [
  { flag: 'ifGreen', id: 'if-green', label: 'If Green', shortLabel: 'If Green', test: 'green-floor' },
  { flag: 'ifRed', id: 'if-red', label: 'If Red', shortLabel: 'If Red', test: 'red-floor' },
  { flag: 'ifDark', id: 'if-dark', label: 'If Dark', shortLabel: 'If Dark', test: 'dark-target' },
  { flag: 'ifForwardClear', id: 'if-clear', label: 'If Clear', shortLabel: 'If Clear', test: 'forward-clear' }
]

export const BLOCK_SIZE = 1
export const BLOCK_HEIGHT = 0.5
export const BOARD_GAP = 0.04

export const MATERIAL_COLORS = {
  topNormal: '#565e68',
  topTarget: '#1e4d6f',
  topGreen: '#64b55f',
  topRed: '#cc6a59',
  topLit: '#fffd00',
  side: '#646a71',
  line: '#2e3438',
  player: '#38ff00',
  antenna: '#d8a8ff',
  eye: '#171c22',
  shadow: '#465666'
}

export const BASE_OPERATION_PALETTE = [
  { id: 'walk', label: 'Walk' },
  { id: 'light', label: 'Light' },
  { id: 'left', label: 'Turn left' },
  { id: 'right', label: 'Turn right' },
  { id: 'jump', label: 'Jump' },
  { id: 'p1', label: 'Call P1' },
  { id: 'p2', label: 'Call P2' },
  { id: 'repeat-2', label: 'Repeat x2', kind: 'repeat', count: 2 },
  { id: 'repeat-3', label: 'Repeat x3', kind: 'repeat', count: 3 },
  { id: 'repeat-4', label: 'Repeat x4', kind: 'repeat', count: 4 }
]

export const VALID_OPERATION_IDS = new Set(['walk', 'light', 'left', 'right', 'jump', ...PROCEDURE_KEYS])
