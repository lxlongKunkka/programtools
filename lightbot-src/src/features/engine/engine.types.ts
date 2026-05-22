import type { Direction, LevelConfig, Vec3 } from '../../domain/map/map.types'
import type { ConditionNode } from '../../domain/program/ast.types'

export type WorldState = {
  robot: Vec3 & { direction: Direction }
  collectedCoins: string[]
  activeBlockId: string | null
  focusTileKey: string | null
  lastCondition: {
    type: ConditionNode['type']
    result: boolean
    tileKey: string | null
  } | null
  failureReason: string | null
  /** 已触发陷阱/失败，后续指令跳过 */
  trapped: boolean
}

export type ExecutionEvent =
  | { type: 'cursor'; blockId: string }
  | { type: 'condition-check'; condition: ConditionNode['type']; result: boolean; tileKey: string | null }
  | { type: 'turn'; direction: Direction }
  | { type: 'move'; to: Vec3 }
  | { type: 'jump'; to: Vec3 }
  | { type: 'pickup'; tileKey: string }
  | { type: 'fail'; reason: string }
  | { type: 'complete' }

export type InterpreterContext = {
  level: LevelConfig
  world: WorldState
  events: ExecutionEvent[]
}
