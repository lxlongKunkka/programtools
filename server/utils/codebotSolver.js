const F_MAX_BLOCKS = 12
const DEFAULT_MAX_PATTERN_LENGTH = 12

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

function programNodeCount(nodes) {
  let count = 0
  for (const node of nodes) {
    count += 1
    if (node.type === 'repeat') {
      count += programNodeCount(node.body)
    }
    if (node.type === 'if') {
      count += programNodeCount(node.then)
      count += programNodeCount(node.else ?? [])
    }
  }
  return count
}

function tokenToNode(token) {
  if (String(token).startsWith('call:')) {
    return { type: 'call', target: String(token).slice(5) }
  }
  return { type: 'action', action: token }
}

function repeatedUnitLength(tokens, start, end) {
  const length = end - start
  for (let unitLength = 1; unitLength <= Math.floor(length / 2); unitLength += 1) {
    if (length % unitLength !== 0) continue
    let matches = true
    for (let index = start + unitLength; index < end && matches; index += 1) {
      if (tokens[index] !== tokens[start + ((index - start) % unitLength)]) {
        matches = false
      }
    }
    if (matches) {
      return unitLength
    }
  }
  return null
}

function compressTokenSequence(tokens, options = {}) {
  const allowRepeat = options.allowRepeat !== false
  const memo = new Map()

  function best(start, end) {
    const key = `${start}:${end}`
    if (memo.has(key)) {
      return memo.get(key)
    }

    let result
    if (end - start === 1) {
      result = { nodes: [tokenToNode(tokens[start])], count: 1 }
      memo.set(key, result)
      return result
    }

    result = { nodes: [], count: Number.POSITIVE_INFINITY }

    if (allowRepeat) {
      const unitLength = repeatedUnitLength(tokens, start, end)
      if (unitLength !== null) {
        const repeatedTimes = (end - start) / unitLength
        if (repeatedTimes >= 2) {
          const body = best(start, start + unitLength)
          result = {
            nodes: [{ type: 'repeat', times: repeatedTimes, body: body.nodes }],
            count: body.count + 1,
          }
        }
      }
    }

    for (let mid = start + 1; mid < end; mid += 1) {
      const left = best(start, mid)
      const right = best(mid, end)
      const candidateCount = left.count + right.count
      if (candidateCount < result.count) {
        result = {
          nodes: [...left.nodes, ...right.nodes],
          count: candidateCount,
        }
      }
    }

    memo.set(key, result)
    return result
  }

  if (tokens.length === 0) {
    return { nodes: [], count: 0 }
  }

  return best(0, tokens.length)
}

function collectPatternCandidates(tokens, options = {}) {
  const maxPatternLength = Math.min(options.maxPatternLength ?? DEFAULT_MAX_PATTERN_LENGTH, Math.max(tokens.length - 1, 1))
  const byKey = new Map()

  for (let length = 2; length <= maxPatternLength; length += 1) {
    for (let start = 0; start + length <= tokens.length; start += 1) {
      const pattern = tokens.slice(start, start + length)
      const patternKey = pattern.join('|')
      const entry = byKey.get(patternKey) ?? { pattern, starts: [] }
      entry.starts.push(start)
      byKey.set(patternKey, entry)
    }
  }

  return Array.from(byKey.values())
    .map((entry) => {
      const starts = []
      let nextAllowed = -1
      for (const start of entry.starts) {
        if (start >= nextAllowed) {
          starts.push(start)
          nextAllowed = start + entry.pattern.length
        }
      }
      return {
        pattern: entry.pattern,
        starts,
        rawGain: starts.length * entry.pattern.length,
      }
    })
    .filter((entry) => entry.starts.length >= 2)
    .sort((a, b) => b.rawGain - a.rawGain || b.pattern.length - a.pattern.length)
}

function replacePattern(tokens, pattern, callToken) {
  const nextTokens = []
  let replacements = 0

  for (let index = 0; index < tokens.length;) {
    let matched = true
    if (index + pattern.length > tokens.length) {
      matched = false
    } else {
      for (let offset = 0; offset < pattern.length; offset += 1) {
        if (tokens[index + offset] !== pattern[offset]) {
          matched = false
          break
        }
      }
    }

    if (matched) {
      nextTokens.push(callToken)
      replacements += 1
      index += pattern.length
      continue
    }

    nextTokens.push(tokens[index])
    index += 1
  }

  return { tokens: nextTokens, replacements }
}

function scoreProgram(candidate, maxMainBlocks) {
  const overflowPenalty = maxMainBlocks !== undefined && candidate.mainBlocks > maxMainBlocks ? 10000 + candidate.mainBlocks - maxMainBlocks : 0
  return overflowPenalty + candidate.totalCommands * 100 + candidate.mainBlocks
}

function buildCompressedProgram(actions, level, options = {}) {
  const availableBlocks = Array.isArray(level?.availableBlocks) ? level.availableBlocks : []
  const maxMainBlocks = level?.constraints?.maxMainBlocks
  const functionTargets = []
  if (availableBlocks.includes('f1Call')) functionTargets.push('f1')
  if (availableBlocks.includes('f2Call')) functionTargets.push('f2')

  let currentTokens = [...actions]
  const functions = {}

  function buildCandidate(tokens, functionBodies) {
    const main = compressTokenSequence(tokens, { allowRepeat: availableBlocks.includes('repeat') })
    const program = {
      main: main.nodes,
      functions: {
        f1: functionBodies.f1 ?? [],
        f2: functionBodies.f2 ?? [],
      },
    }
    return {
      tokens,
      functionBodies,
      program,
      mainBlocks: main.nodes.length,
      totalCommands: programNodeCount(program.main) + programNodeCount(program.functions.f1) + programNodeCount(program.functions.f2),
    }
  }

  let best = buildCandidate(currentTokens, functions)

  for (const target of functionTargets) {
    const candidates = collectPatternCandidates(currentTokens, { maxPatternLength: options.maxPatternLength ?? DEFAULT_MAX_PATTERN_LENGTH })
    let bestForTarget = best

    for (const candidate of candidates.slice(0, 24)) {
      const functionBody = compressTokenSequence(candidate.pattern, { allowRepeat: availableBlocks.includes('repeat') })
      if (functionBody.nodes.length === 0 || functionBody.nodes.length > F_MAX_BLOCKS) {
        continue
      }

      const callToken = `call:${target}`
      const replaced = replacePattern(currentTokens, candidate.pattern, callToken)
      if (replaced.replacements < 2) {
        continue
      }

      const nextFunctions = { ...bestForTarget.functionBodies, [target]: functionBody.nodes }
      const nextCandidate = buildCandidate(replaced.tokens, nextFunctions)
      if (scoreProgram(nextCandidate, maxMainBlocks) < scoreProgram(bestForTarget, maxMainBlocks)) {
        bestForTarget = nextCandidate
      }
    }

    best = bestForTarget
    currentTokens = best.tokens
  }

  return best
}

function assignIdsToNodes(nodes, makeId) {
  return nodes.map((node) => {
    if (node.type === 'action') {
      return { id: makeId(node.action), type: 'action', action: node.action }
    }
    if (node.type === 'call') {
      return { id: makeId(`call-${node.target}`), type: 'call', target: node.target }
    }
    if (node.type === 'repeat') {
      return {
        id: makeId('repeat'),
        type: 'repeat',
        times: node.times,
        body: assignIdsToNodes(node.body, makeId),
      }
    }
    return {
      id: makeId('if'),
      type: 'if',
      condition: node.condition,
      then: assignIdsToNodes(node.then, makeId),
      else: assignIdsToNodes(node.else ?? [], makeId),
    }
  })
}

function finalizeProgram(program) {
  let nextId = 0
  const makeId = (prefix) => {
    nextId += 1
    return `${prefix}-${nextId}`
  }
  return {
    main: assignIdsToNodes(program.main, makeId),
    functions: {
      f1: assignIdsToNodes(program.functions.f1 ?? [], makeId),
      f2: assignIdsToNodes(program.functions.f2 ?? [], makeId),
    },
  }
}

function actionToKeyword(action) {
  switch (action) {
    case 'forward': return 'forward'
    case 'left': return 'turnLeft'
    case 'right': return 'turnRight'
    case 'pickup': return 'pickup'
    case 'jump': return 'jump'
    default: return action
  }
}

function nodeToCode(node, depth = 0) {
  const pad = '  '.repeat(depth)
  if (node.type === 'action') return `${pad}${actionToKeyword(node.action)}`
  if (node.type === 'call') return `${pad}${node.target}()`
  if (node.type === 'repeat') {
    const body = node.body.map((child) => nodeToCode(child, depth + 1)).join('\n')
    return `${pad}repeat(${node.times}):\n${body}`
  }
  const thenCode = node.then.map((child) => nodeToCode(child, depth + 1)).join('\n')
  let code = `${pad}if ${node.condition.type}:\n${thenCode}`
  if (node.else?.length) {
    const elseCode = node.else.map((child) => nodeToCode(child, depth + 1)).join('\n')
    code += `\n${pad}else:\n${elseCode}`
  }
  return code
}

function programToCode(program) {
  const main = program.main.map((node) => nodeToCode(node, 1)).join('\n')
  const f1 = program.functions.f1.map((node) => nodeToCode(node, 1)).join('\n')
  const f2 = program.functions.f2.map((node) => nodeToCode(node, 1)).join('\n')
  return [
    'main:',
    main,
    '',
    'f1:',
    f1,
    '',
    'f2:',
    f2,
  ].join('\n')
}

function findShortestActionSolution(level, options = {}) {
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

export function solveCodebotLevel(level, options = {}) {
  const shortest = findShortestActionSolution(level, options)
  if (!shortest.ok || !shortest.solvable) {
    return shortest
  }

  const compressed = buildCompressedProgram(shortest.actions, level, options)
  const finalizedProgram = finalizeProgram(compressed.program)
  const functionBlocks = {
    f1: finalizedProgram.functions.f1.length,
    f2: finalizedProgram.functions.f2.length,
  }
  const noteParts = ['执行步数为最优。']
  if (functionBlocks.f1 > 0 || functionBlocks.f2 > 0) {
    noteParts.push('参考程序已尝试使用循环和子函数压缩积木数量。')
  } else if (Array.isArray(level?.availableBlocks) && level.availableBlocks.includes('repeat')) {
    noteParts.push('参考程序已尝试使用循环压缩积木数量。')
  }
  if (level?.constraints?.maxMainBlocks !== undefined) {
    noteParts.push(`主程序限制为 ${level.constraints.maxMainBlocks} 块，当前参考程序使用 ${finalizedProgram.main.length} 块。`)
  }

  return {
    ...shortest,
    program: finalizedProgram,
    programCode: programToCode(finalizedProgram),
    totalCommands: programNodeCount(finalizedProgram.main) + programNodeCount(finalizedProgram.functions.f1) + programNodeCount(finalizedProgram.functions.f2),
    mainBlocks: finalizedProgram.main.length,
    functionBlocks,
    note: noteParts.join(' '),
  }
}