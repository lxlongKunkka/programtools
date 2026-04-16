const TURN_LEFT = {
  forward: 'left',
  left: 'backward',
  backward: 'right',
  right: 'forward'
}

const TURN_RIGHT = {
  forward: 'right',
  right: 'backward',
  backward: 'left',
  left: 'forward'
}

const DIRECTION_VECTORS = {
  forward: { x: 1, y: 0 },
  right: { x: 0, y: 1 },
  backward: { x: -1, y: 0 },
  left: { x: 0, y: -1 }
}

const ACTIONS = ['light', 'walk', 'jump', 'left', 'right']
const REPEATABLE_ACTIONS = new Set(['light', 'walk', 'jump', 'left', 'right', 'p1'])
const MAX_REPEAT_COUNT = 4

function isRepeatOperation(operation) {
  return Boolean(
    operation
    && typeof operation === 'object'
    && operation.type === 'repeat'
    && typeof operation.body === 'string'
    && REPEATABLE_ACTIONS.has(operation.body)
    && Number.isInteger(operation.count)
    && operation.count > 1
  )
}

function createRepeatOperation(body, count) {
  return {
    type: 'repeat',
    body,
    count
  }
}

function compressOperationRuns(sequence) {
  const compressed = []

  let index = 0
  while (index < sequence.length) {
    const operation = sequence[index]
    if (!REPEATABLE_ACTIONS.has(operation)) {
      compressed.push(operation)
      index += 1
      continue
    }

    let runLength = 1
    while (index + runLength < sequence.length && sequence[index + runLength] === operation) {
      runLength += 1
    }
    let remaining = runLength

    while (remaining >= 2) {
      const chunkSize = Math.min(MAX_REPEAT_COUNT, remaining)
      compressed.push(createRepeatOperation(operation, chunkSize))
      remaining -= chunkSize
    }

    if (remaining === 1) {
      compressed.push(operation)
    }

    index += runLength
  }

  return compressed
}

function programScore(program) {
  return program.main.length + program.p1.length
}

function chooseBetterProgram(currentBest, candidate) {
  if (!candidate) return currentBest
  if (!currentBest) return candidate

  const currentScore = programScore(currentBest)
  const candidateScore = programScore(candidate)
  if (candidateScore !== currentScore) {
    return candidateScore < currentScore ? candidate : currentBest
  }

  if (candidate.main.length !== currentBest.main.length) {
    return candidate.main.length < currentBest.main.length ? candidate : currentBest
  }

  return candidate.p1.length < currentBest.p1.length ? candidate : currentBest
}

function finalizeProgram(level, mainSequence, p1Sequence = []) {
  const finalized = {
    main: compressOperationRuns(mainSequence),
    p1: compressOperationRuns(p1Sequence)
  }

  if (finalized.main.length > level.mainLimit) {
    return null
  }

  const p1Limit = level.procLimits?.p1 || 0
  if (finalized.p1.length > p1Limit) {
    return null
  }

  return finalized
}

function keyOf(x, y) {
  return `${x},${y}`
}

function buildLevelContext(level) {
  const platformMap = new Map()
  const targets = []

  level.board.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (!cell) return
      const key = keyOf(x, y)
      platformMap.set(key, cell)
      if (cell.target) {
        targets.push(key)
      }
    })
  })

  return {
    platformMap,
    targetIndex: new Map(targets.map((key, index) => [key, index])),
    targetMask: (1 << targets.length) - 1,
    targetCount: targets.length
  }
}

function applyAction(state, action, context) {
  const currentKey = keyOf(state.x, state.y)
  const currentPlatform = context.platformMap.get(currentKey)
  if (!currentPlatform) return null

  if (action === 'left') {
    return { ...state, dir: TURN_LEFT[state.dir] }
  }

  if (action === 'right') {
    return { ...state, dir: TURN_RIGHT[state.dir] }
  }

  if (action === 'light') {
    const targetBit = context.targetIndex.get(currentKey)
    if (targetBit == null) return null
    return { ...state, litMask: state.litMask ^ (1 << targetBit) }
  }

  const vector = DIRECTION_VECTORS[state.dir]
  const nextX = state.x + vector.x
  const nextY = state.y + vector.y
  const nextPlatform = context.platformMap.get(keyOf(nextX, nextY))
  if (!nextPlatform) return null

  if (action === 'walk') {
    if (currentPlatform.h !== nextPlatform.h) return null
    return { ...state, x: nextX, y: nextY }
  }

  if (action === 'jump') {
    const diff = nextPlatform.h - currentPlatform.h
    if (diff === 1 || diff < 0) {
      return { ...state, x: nextX, y: nextY }
    }
  }

  return null
}

function stateKey(state) {
  return `${state.x},${state.y},${state.dir},${state.litMask}`
}

export function solveRawSequence(level) {
  const context = buildLevelContext(level)
  const start = {
    x: level.start.x,
    y: level.start.y,
    dir: level.start.dir,
    litMask: 0
  }

  const queue = [start]
  const visited = new Set([stateKey(start)])
  const parent = new Map()
  let head = 0
  let goalKey = null

  while (head < queue.length) {
    const current = queue[head]
    const currentStateKey = stateKey(current)
    head += 1

    if (current.litMask === context.targetMask) {
      goalKey = currentStateKey
      break
    }

    for (const action of ACTIONS) {
      const next = applyAction(current, action, context)
      if (!next) continue

      const nextKey = stateKey(next)
      if (visited.has(nextKey)) continue

      visited.add(nextKey)
      parent.set(nextKey, { prev: currentStateKey, action })
      queue.push(next)
    }
  }

  if (!goalKey) return null

  const sequence = []
  let traceKey = goalKey
  while (parent.has(traceKey)) {
    const step = parent.get(traceKey)
    sequence.push(step.action)
    traceKey = step.prev
  }
  sequence.reverse()

  return {
    sequence,
    targetCount: context.targetCount
  }
}

function matchesAt(sequence, pattern, index) {
  if (index + pattern.length > sequence.length) return false
  for (let offset = 0; offset < pattern.length; offset += 1) {
    if (sequence[index + offset] !== pattern[offset]) {
      return false
    }
  }
  return true
}

function compressWithPattern(sequence, pattern) {
  const dp = Array(sequence.length + 1).fill(0)
  const choice = Array(sequence.length).fill(null)

  for (let index = sequence.length - 1; index >= 0; index -= 1) {
    let bestCost = 1 + dp[index + 1]
    let bestChoice = { type: 'literal', value: sequence[index], nextIndex: index + 1 }

    if (matchesAt(sequence, pattern, index)) {
      const patternCost = 1 + dp[index + pattern.length]
      if (patternCost < bestCost) {
        bestCost = patternCost
        bestChoice = { type: 'p1', nextIndex: index + pattern.length }
      }
    }

    dp[index] = bestCost
    choice[index] = bestChoice
  }

  const main = []
  let index = 0
  let p1Calls = 0
  while (index < sequence.length) {
    const step = choice[index]
    if (step.type === 'p1') {
      main.push('p1')
      p1Calls += 1
    } else {
      main.push(step.value)
    }
    index = step.nextIndex
  }

  return { main, p1: pattern, p1Calls }
}

export function buildProgram(level, rawSequence) {
  let best = chooseBetterProgram(null, finalizeProgram(level, rawSequence))
  const procLimit = level.procLimits?.p1 || 0
  if (!procLimit) {
    return best
  }

  const maxPatternSize = Math.min(rawSequence.length, procLimit * MAX_REPEAT_COUNT)
  for (let start = 0; start < rawSequence.length; start += 1) {
    for (let size = 1; size <= maxPatternSize && start + size <= rawSequence.length; size += 1) {
      const pattern = rawSequence.slice(start, start + size)
      const compressed = compressWithPattern(rawSequence, pattern)
      if (compressed.p1Calls < 2) continue
      best = chooseBetterProgram(best, finalizeProgram(level, compressed.main, compressed.p1))
    }
  }

  return best
}

export function solveLevelProgram(level) {
  const raw = solveRawSequence(level)
  if (!raw) {
    return {
      solvable: false,
      reason: '未找到可行路径'
    }
  }

  const program = buildProgram(level, raw.sequence)
  if (!program) {
    return {
      solvable: false,
      reason: `最短序列 ${raw.sequence.length} 步，超出 MAIN ${level.mainLimit}${level.procLimits?.p1 ? ` / P1 ${level.procLimits.p1}` : ''}`,
      rawSequence: raw.sequence
    }
  }

  return {
    solvable: true,
    rawLength: raw.sequence.length,
    main: program.main,
    p1: program.p1
  }
}

export function formatOps(sequence = []) {
  return sequence.map((operation) => {
    if (isRepeatOperation(operation)) {
      return `[x${operation.count} ${operation.body}]`
    }
    return operation
  }).join(' ')
}