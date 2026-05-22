export type Direction = 'N' | 'E' | 'S' | 'W'

export type TileKind = 'void' | 'path' | 'coin' | 'obstacle' | 'trap'

export type Vec3 = {
  x: number
  y: number
  z: number
}

export type TileConfig = {
  height: number
  kind: TileKind
}

export type LevelConfig = {
  id: string
  title: string
  chapter?: {
    id: string
    title: string
    order: number
  }
  teachingGoal: string
  availableBlocks: string[]
  grid: TileConfig[][]
  robot: Vec3 & {
    direction: Direction
  }
  winCondition: {
    type: 'all-coins-collected'
  }
  constraints?: {
    maxMainBlocks?: number
    maxFunctions?: number
    recommendedSteps?: number
  }
  hints?: string[]
}

export type LessonConfig = {
  id: string
  title: string
  summary: string
  concepts: string[]
}
