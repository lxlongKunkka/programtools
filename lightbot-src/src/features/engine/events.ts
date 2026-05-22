import type { Vec3 } from '../../domain/map/map.types'

export function tileKey(x: number, y: number) {
  return `${x}:${y}`
}

export function vecKey(position: Vec3) {
  return tileKey(position.x, position.y)
}
