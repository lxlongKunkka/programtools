import { create } from 'zustand'
import type { Direction, LevelConfig, TileConfig, Vec3 } from '../../domain/map/map.types'

export type EditorTool = 'path' | 'void' | 'coin' | 'obstacle' | 'trap' | 'robot' | 'height-up' | 'height-down'

type EditorMetadata = {
  id: string
  title: string
  teachingGoal: string
  maxMainBlocks?: number
  f1Enabled: boolean
  f2Enabled: boolean
  chapter?: LevelConfig['chapter']
}

type LevelEditorStore = {
  cols: number
  rows: number
  grid: TileConfig[][]
  robot: Vec3 & { direction: Direction }
  metadata: EditorMetadata
  selectedTool: EditorTool
  setSelectedTool: (tool: EditorTool) => void
  clickCell: (x: number, y: number) => void
  setRobotDirection: (dir: Direction) => void
  setMetadata: (updates: Partial<EditorMetadata>) => void
  setSize: (cols: number, rows: number) => void
  toLevelConfig: () => LevelConfig
  loadFromConfig: (cfg: LevelConfig) => void
  reset: () => void
}

function makeEmptyGrid(cols: number, rows: number): TileConfig[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ height: 0, kind: 'path' as const }))
  )
}

const DEFAULT_COLS = 6
const DEFAULT_ROWS = 3

function freshId() {
  return `custom-${Date.now().toString(36)}`
}

export const useLevelEditorStore = create<LevelEditorStore>((set, get) => ({
  cols: DEFAULT_COLS,
  rows: DEFAULT_ROWS,
  grid: makeEmptyGrid(DEFAULT_COLS, DEFAULT_ROWS),
  robot: { x: 0, y: 1, z: 0, direction: 'E' },
  metadata: { id: freshId(), title: '我的关卡', teachingGoal: '', f1Enabled: true, f2Enabled: false },
  selectedTool: 'path',

  setSelectedTool: (selectedTool) => set({ selectedTool }),

  clickCell: (x, y) => {
    const { grid, selectedTool, robot } = get()
    const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })))
    const cell = newGrid[y]?.[x]
    if (!cell) return

    if (selectedTool === 'robot') {
      if (cell.kind !== 'void') {
        set({ robot: { x, y, z: cell.height, direction: robot.direction } })
      }
      return
    }

    switch (selectedTool) {
      case 'path':        cell.kind = 'path'; break
      case 'void':        cell.kind = 'void'; break
      case 'coin':        cell.kind = cell.kind === 'coin' ? 'path' : 'coin'; break
      case 'obstacle':    cell.kind = cell.kind === 'obstacle' ? 'path' : 'obstacle'; break
      case 'trap':        cell.kind = cell.kind === 'trap' ? 'path' : 'trap'; break
      case 'height-up':   cell.height = Math.min(cell.height + 1, 4); break
      case 'height-down': cell.height = Math.max(cell.height - 1, 0); break
    }
    set({ grid: newGrid })
  },

  setRobotDirection: (direction) => {
    const { robot } = get()
    set({ robot: { ...robot, direction } })
  },

  setMetadata: (updates) => {
    const { metadata } = get()
    set({ metadata: { ...metadata, ...updates } })
  },

  setSize: (cols, rows) => {
    const { grid } = get()
    const newGrid = Array.from({ length: rows }, (_, y) =>
      Array.from({ length: cols }, (_, x) =>
        grid[y]?.[x] ?? { height: 0, kind: 'path' as const }
      )
    )
    set({ cols, rows, grid: newGrid })
  },

  toLevelConfig: () => {
    const { grid, robot, metadata } = get()
    const robotCell = grid[robot.y]?.[robot.x]
    const robotZ = robotCell ? robotCell.height : 0
    return {
      id: metadata.id,
      title: metadata.title.trim() || '自定义关卡',
      teachingGoal: metadata.teachingGoal.trim() || '自定义关卡',
      availableBlocks: [
        'forward', 'turnLeft', 'turnRight', 'jump', 'pickup',
        ...(metadata.f1Enabled ? ['f1Call'] : []),
        ...(metadata.f2Enabled ? ['f2Call'] : []),
        'repeat',
      ],
      grid,
      robot: { ...robot, z: robotZ },
      winCondition: { type: 'all-coins-collected' },
      ...(metadata.chapter ? { chapter: metadata.chapter } : {}),
      ...(metadata.maxMainBlocks ? { constraints: { maxMainBlocks: metadata.maxMainBlocks } } : {}),
    } satisfies LevelConfig
  },

  loadFromConfig: (cfg) => {
    const rows = cfg.grid.length
    const cols = cfg.grid[0]?.length ?? 0
    set({
      cols,
      rows,
      grid: cfg.grid.map((row) => row.map((cell) => ({ ...cell }))),
      robot: { ...cfg.robot, direction: (['N','E','S','W'].includes(cfg.robot.direction as string) ? cfg.robot.direction : ({ north:'N', east:'E', south:'S', west:'W' } as Record<string,Direction>)[cfg.robot.direction as string] ?? 'E') as Direction },
      metadata: {
        id: cfg.id,
        title: cfg.title,
        teachingGoal: cfg.teachingGoal,
        maxMainBlocks: cfg.constraints?.maxMainBlocks,
        f1Enabled: cfg.availableBlocks.includes('f1Call'),
        f2Enabled: cfg.availableBlocks.includes('f2Call'),
        chapter: cfg.chapter,
      },
    })
  },

  reset: () => {
    set({
      cols: DEFAULT_COLS,
      rows: DEFAULT_ROWS,
      grid: makeEmptyGrid(DEFAULT_COLS, DEFAULT_ROWS),
      robot: { x: 0, y: 1, z: 0, direction: 'E' },
      metadata: { id: freshId(), title: '我的关卡', teachingGoal: '', f1Enabled: true, f2Enabled: false },
      selectedTool: 'path',
    })
  },
}))
