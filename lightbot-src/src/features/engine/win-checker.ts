import type { LevelConfig } from '../../domain/map/map.types'
import type { WorldState } from './engine.types'
import { tileKey } from './events'

export function isLevelComplete(level: LevelConfig, world: WorldState) {
  for (let y = 0; y < level.grid.length; y += 1) {
    for (let x = 0; x < level.grid[y].length; x += 1) {
      const tile = level.grid[y][x]
      if (tile.kind === 'coin' && !world.collectedCoins.includes(tileKey(x, y))) {
        return false
      }
    }
  }

  return true
}
