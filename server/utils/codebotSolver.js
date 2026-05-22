function tileKey(x, y) {
  return `${x}:${y}`
}

function directionDelta(direction) {
  switch (direction) {
    case 'N': return { x: 0, y: -1 }
    case 'E': return { x: 1, y: 0 }
    case 'S': return { x: 0, y: 1 }
    case 'W': return { x: -1, y: 0 }
    default: return { x: 1, y: 0 }
  }
}

function rotateLeft(direction) {
  switch (direction) {
    case 'N': return 'W'
    case 'W': return 'S'
    case 'S': return 'E'
    case 'E': return 'N'
    default: return 'E'
  }
}

function rotateRight(direction) {
  switch (direction) {
    case 'N': return 'E'
    case 'E': return 'S'
    case 'S': return 'W'
    case 'W': return 'N'
    default: return 'E'
  }
}

function normalizeDirection(direction) {
  const normalized = String(direction || '').trim()
  return {
    north: 'N',
    east: 'E',
    south: 'S',
    west: 'W',
    N: 'N',
    E: 'E',
    S: 'S',
    W: 'W',
  }[normalized] || 'E'
}

function getTile(level, x, y) {
  const row = Array.isArray(level?.grid) ? level.grid[y] : null
  return row?.[x] ?? null
}

function buildCoinIndex(level) {
  const coins = []
  const coinBitByKey = new Map()
  for (let y = 0; y < level.grid.length; y += 1) {
    for (let x = 0; x < level.grid[y].length; x += 1) {
      if (level.grid[y][x]?.kind === 'coin') {
        const bit = coins.length
        coins.push({ x, y })
        coinBitByKey.set(tileKey(x, y), bit)
      }
    }
  }
  return { coins, coinBitByKey }
}

function createInitialState(level) {
  const startTile = getTile(level, level.robot?.x, level.robot?.y)
  return {
    x: level.robot?.x ?? 0,
    y: level.robot?.y ?? 0,
    z: startTile?.height ?? level.robot?.z ?? 0,
    direction: normalizeDirection(level.robot?.direction),
    coinsMask: 0,
  }
}

function stateKey(state) {
  return `${state.x}:${state.y}:${state.z}:${state.direction}:${state.coinsMask}`
}

function buildAllowedActions(level) {
  const availableBlocks = Array.isArray(level?.availableBlocks) ? level.availableBlocks : []
  const actions = []
  if (availableBlocks.includes('forward')) actions.push('forward')
  if (availableBlocks.includes('turnLeft')) actions.push('left')
  if (availableBlocks.includes('turnRight')) actions.push('right')
  if (availableBlocks.includes('jump')) actions.push('jump')
  if (availableBlocks.includes('pickup')) actions.push('pickup')
  return actions
}

function applyAction(level, state, action, coinBitByKey) {
  if (action === 'left') {
    return { ...state, direction: rotateLeft(state.direction) }
  }

  if (action === 'right') {
    return { ...state, direction: rotateRight(state.direction) }
  }

  if (action === 'pickup') {
    const key = tileKey(state.x, state.y)
    const bit = coinBitByKey.get(key)
    if (bit === undefined) return null
    const nextMask = state.coinsMask | (1 << bit)
    if (nextMask === state.coinsMask) return null
    return { ...state, coinsMask: nextMask }
  }

  const delta = directionDelta(state.direction)
  const nextX = state.x + delta.x
  const nextY = state.y + delta.y
  const targetTile = getTile(level, nextX, nextY)
  if (!targetTile || targetTile.kind === 'void' || targetTile.kind === 'obstacle' || targetTile.kind === 'trap') {
    return null
  }

  if (action === 'forward') {
    if (targetTile.height !== state.z) return null
    return { ...state, x: nextX, y: nextY, z: targetTile.height }
  }

  if (action === 'jump') {
    const heightDelta = targetTile.height - state.z
    if (heightDelta !== 1 && heightDelta !== -1) return null
    return { ...state, x: nextX, y: nextY, z: targetTile.height }
  }

  return null
}

function restorePath(goalKey, parentByKey) {
  const actions = []
  let currentKey = goalKey
  while (parentByKey.has(currentKey)) {
    const entry = parentByKey.get(currentKey)
    actions.push(entry.action)
    currentKey = entry.parentKey
  }
  actions.reverse()
  return actions
}

export function solveCodebotLevel(level, options = {}) {
  const maxCoins = options.maxCoins ?? 20
  const maxVisitedStates = options.maxVisitedStates ?? 300000

  if (!level || !Array.isArray(level.grid) || !level.robot) {
    return { ok: false, solvable: false, error: '关卡结构不完整' }
  }

  const { coins, coinBitByKey } = buildCoinIndex(level)
  if (coins.length === 0) {
    return {
      ok: true,
      solvable: true,
      minSteps: 0,
      actions: [],
      visitedStates: 1,
      note: '关卡没有金币，已天然完成。',
    }
  }

  if (coins.length > maxCoins) {
    return {
      ok: false,
      solvable: false,
      error: `金币数量过多（${coins.length}），当前智能测试上限为 ${maxCoins} 枚。`,
    }
  }

  const allowedActions = buildAllowedActions(level)
  if (!allowedActions.includes('pickup')) {
    return {
      ok: true,
      solvable: false,
      error: '当前可用积木不包含 pickup，无法完成收集金币目标。',
    }
  }

  const goalMask = (1 << coins.length) - 1
  const start = createInitialState(level)
  const startKey = stateKey(start)
  const queue = [start]
  let head = 0
  const visited = new Set([startKey])
  const parentByKey = new Map()

  while (head < queue.length) {
    const current = queue[head]
    head += 1
    const currentKey = stateKey(current)

    if (current.coinsMask === goalMask) {
      const actions = restorePath(currentKey, parentByKey)
      return {
        ok: true,
        solvable: true,
        minSteps: actions.length,
        actions,
        visitedStates: visited.size,
      }
    }

    for (const action of allowedActions) {
      const next = applyAction(level, current, action, coinBitByKey)
      if (!next) continue
      const nextKey = stateKey(next)
      if (visited.has(nextKey)) continue
      visited.add(nextKey)
      parentByKey.set(nextKey, { parentKey: currentKey, action })
      queue.push(next)
      if (visited.size > maxVisitedStates) {
        return {
          ok: false,
          solvable: false,
          error: `搜索状态超过上限（${maxVisitedStates}），请缩小地图或减少金币数量后重试。`,
          visitedStates: visited.size,
        }
      }
    }
  }

  return {
    ok: true,
    solvable: false,
    error: '未找到可行解。',
    visitedStates: visited.size,
  }
}