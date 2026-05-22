import type { Direction, LevelConfig } from '../../domain/map/map.types'
import type { ProgramDocument, ProgramNode } from '../../domain/program/ast.types'
import { evaluateCondition, getCurrentTile, getForwardPosition, getTile } from './conditions'
import type { ExecutionEvent, WorldState } from './engine.types'
import { tileKey } from './events'
import { isLevelComplete } from './win-checker'

const MAX_STEPS = 500
const MAX_CALL_DEPTH = 40

function rotateLeft(direction: Direction): Direction {
  switch (direction) {
    case 'N':
      return 'W'
    case 'W':
      return 'S'
    case 'S':
      return 'E'
    case 'E':
      return 'N'
  }
}

function rotateRight(direction: Direction): Direction {
  switch (direction) {
    case 'N':
      return 'E'
    case 'E':
      return 'S'
    case 'S':
      return 'W'
    case 'W':
      return 'N'
  }
}

const _DIR_NORM: Record<string, Direction> = {
  north: 'N', east: 'E', south: 'S', west: 'W',
  N: 'N', E: 'E', S: 'S', W: 'W',
}
function normalizeDir(d: string): Direction {
  return (_DIR_NORM[d] ?? 'E') as Direction
}

function createInitialWorld(level: LevelConfig): WorldState {
  return {
    robot: { ...level.robot, direction: normalizeDir(level.robot.direction as string) },
    collectedCoins: [],
    activeBlockId: null,
    focusTileKey: tileKey(level.robot.x, level.robot.y),
    lastCondition: null,
    failureReason: null,
    trapped: false,
  }
}

function pushEvent(events: ExecutionEvent[], event: ExecutionEvent) {
  events.push(event)
}

function executeAction(level: LevelConfig, world: WorldState, node: Extract<ProgramNode, { type: 'action' }>, events: ExecutionEvent[]) {
  if (node.action === 'left') {
    world.robot.direction = rotateLeft(world.robot.direction)
    pushEvent(events, { type: 'turn', direction: world.robot.direction })
    return true
  }

  if (node.action === 'right') {
    world.robot.direction = rotateRight(world.robot.direction)
    pushEvent(events, { type: 'turn', direction: world.robot.direction })
    return true
  }

  if (node.action === 'pickup') {
    const currentTile = getCurrentTile(level, world)
    if (currentTile?.kind !== 'coin') {
      return true // 非金币格：静默跳过
    }

    const key = tileKey(world.robot.x, world.robot.y)
    if (!world.collectedCoins.includes(key)) {
      world.collectedCoins = [...world.collectedCoins, key]
    }
    pushEvent(events, { type: 'pickup', tileKey: key })
    return true
  }

  const target = getForwardPosition(world.robot)
  const targetTile = getTile(level, target.x, target.y)
  if (!targetTile || targetTile.kind === 'void' || targetTile.kind === 'obstacle') {
    return true // 边界/障碍：静默跳过
  }

  if (node.action === 'forward') {
    if (targetTile.height !== world.robot.z) {
      return true // 高度不同：静默跳过
    }

    world.robot = { ...world.robot, x: target.x, y: target.y, z: targetTile.height }
    pushEvent(events, { type: 'move', to: { x: target.x, y: target.y, z: targetTile.height } })

    if (targetTile.kind === 'trap') {
      world.trapped = true
      world.failureReason = '机器人触发了陷阱！'
      pushEvent(events, { type: 'fail', reason: '机器人触发了陷阱！' })
      return false
    }
    return true
  }

  if (node.action === 'jump') {
    const heightDelta = targetTile.height - world.robot.z
    if (heightDelta !== 1 && heightDelta !== -1) {
      return true // 高度差不符：只允许 ±1 格
    }

    world.robot = { ...world.robot, x: target.x, y: target.y, z: targetTile.height }
    pushEvent(events, { type: 'jump', to: { x: target.x, y: target.y, z: targetTile.height } })

    if (targetTile.kind === 'trap') {
      world.trapped = true
      world.failureReason = '机器人触发了陷阱！'
      pushEvent(events, { type: 'fail', reason: '机器人触发了陷阱！' })
      return false
    }
    return true
  }

  return true
}

function executeNodes(level: LevelConfig, document: ProgramDocument, world: WorldState, nodes: ProgramNode[], events: ExecutionEvent[], counter: { steps: number; done: boolean; depth: number }): void {
  for (const node of nodes) {
    if (world.trapped || counter.done) break
    if (counter.steps > MAX_STEPS || counter.depth > MAX_CALL_DEPTH) break

    if (node.type === 'action') {
      counter.steps++
      executeAction(level, world, node, events)
      if (isLevelComplete(level, world)) {
        counter.done = true
        return
      }
      continue
    }

    if (node.type === 'repeat') {
      for (let index = 0; index < node.times; index += 1) {
        if (world.trapped || counter.done || counter.steps > MAX_STEPS || counter.depth > MAX_CALL_DEPTH) break
        executeNodes(level, document, world, node.body, events, counter)
      }
      continue
    }

    if (node.type === 'if') {
      const result = evaluateCondition(level, world, node.condition)
      const forward = getForwardPosition(world.robot)
      const tileToInspect = node.condition.type === 'on-coin' || node.condition.type === 'coin-here'
        ? tileKey(world.robot.x, world.robot.y)
        : tileKey(forward.x, forward.y)
      world.lastCondition = { type: node.condition.type, result, tileKey: tileToInspect }
      pushEvent(events, { type: 'condition-check', condition: node.condition.type, result, tileKey: tileToInspect })
      executeNodes(level, document, world, result ? node.then : (node.else ?? []), events, counter)
      continue
    }

    if (node.type === 'call') {
      counter.depth++
      executeNodes(level, document, world, document.functions[node.target], events, counter)
      counter.depth--
    }
  }
}

export function interpretProgram(level: LevelConfig, document: ProgramDocument) {
  const world = createInitialWorld(level)
  const events: ExecutionEvent[] = []
  const counter = { steps: 0, done: false, depth: 0 }
  executeNodes(level, document, world, document.main, events, counter)

  if (counter.done || isLevelComplete(level, world)) {
    pushEvent(events, { type: 'complete' })
  } else if (!world.trapped) {
    const reason = counter.depth > MAX_CALL_DEPTH
      ? `递归调用层数超出限制（${MAX_CALL_DEPTH} 层），请检查是否存在无限递归。`
      : counter.steps > MAX_STEPS
        ? `程序超出最大步数（${MAX_STEPS} 步）限制。`
        : '程序执行结束，但还有金币没有收集。'
    pushEvent(events, { type: 'fail', reason })
  }

  return {
    events,
    finalWorld: world,
  }
}

export function createWorldState(level: LevelConfig) {
  return createInitialWorld(level)
}
