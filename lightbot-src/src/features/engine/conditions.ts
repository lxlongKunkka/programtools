import type { Direction, LevelConfig, TileConfig, Vec3 } from '../../domain/map/map.types'
import type { ConditionNode } from '../../domain/program/ast.types'
import type { WorldState } from './engine.types'
import { tileKey } from './events'

function directionDelta(direction: Direction) {
  switch (direction) {
    case 'N':
      return { x: 0, y: -1 }
    case 'E':
      return { x: 1, y: 0 }
    case 'S':
      return { x: 0, y: 1 }
    case 'W':
      return { x: -1, y: 0 }
  }
}

export function getTile(level: LevelConfig, x: number, y: number): TileConfig | null {
  const row = level.grid[y]
  if (!row) {
    return null
  }

  return row[x] ?? null
}

export function getCurrentTile(level: LevelConfig, world: WorldState) {
  return getTile(level, world.robot.x, world.robot.y)
}

export function getForwardPosition(position: Vec3 & { direction: Direction }) {
  const delta = directionDelta(position.direction)
  return {
    x: position.x + delta.x,
    y: position.y + delta.y,
    z: position.z,
  }
}

export function evaluateCondition(level: LevelConfig, world: WorldState, condition: ConditionNode) {
  const currentTile = getCurrentTile(level, world)
  const forwardPosition = getForwardPosition(world.robot)
  const forwardTile = getTile(level, forwardPosition.x, forwardPosition.y)

  switch (condition.type) {
    case 'front-clear':
      return Boolean(forwardTile && forwardTile.kind !== 'void' && forwardTile.height === world.robot.z)
    case 'front-has-coin':
      return forwardTile?.kind === 'coin'
    case 'on-coin':
      return currentTile?.kind === 'coin'
    case 'coin-here':
      return currentTile?.kind === 'coin' && !world.collectedCoins.includes(tileKey(world.robot.x, world.robot.y))
    case 'front-higher':
      return Boolean(forwardTile && forwardTile.kind !== 'void' && forwardTile.height > world.robot.z)
    case 'front-lower':
      return Boolean(forwardTile && forwardTile.kind !== 'void' && forwardTile.height < world.robot.z)
    default:
      return false
  }
}
