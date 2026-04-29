// Lightbot 关卡数据/版面工具。
import { EDITOR_GRID_SIZE } from './constants.js'
import { cloneOperationList } from './operations.js'

export function cloneBoard(board) {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)))
}

export function cloneBot(start) {
  return { x: start.x, y: start.y, dir: start.dir }
}

export function platformKey(x, y) {
  return `${x},${y}`
}

export function cloneLevelDefinition(level) {
  return {
    ...level,
    commandOptions: { ...(level.commandOptions || {}) },
    completionRequirements: { ...(level.completionRequirements || {}) },
    procLimits: { ...(level.procLimits || {}) },
    tips: (level.tips || []).map((tip) => ({ ...tip })),
    board: cloneBoard(level.board),
    start: { ...level.start },
    demo: {
      main: cloneOperationList(level.demo?.main || []),
      p1: cloneOperationList(level.demo?.p1 || []),
      p2: cloneOperationList(level.demo?.p2 || [])
    }
  }
}

export function isCustomLevel(level) {
  return Boolean(level?.isCustom)
}

export function getLevelAuthorName(level) {
  if (!level) return '系统默认'
  return String(level.createdByName || level.updatedByName || (isCustomLevel(level) ? '未知作者' : '系统默认')).trim() || '系统默认'
}

export function getLevelAuthorLabel(level) {
  return `作者：${getLevelAuthorName(level)}`
}

export function formatRelativeTime(value) {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return '刚刚'

  const diff = Date.now() - timestamp
  if (diff < 60 * 1000) return '刚刚'

  const minutes = Math.floor(diff / (60 * 1000))
  if (minutes < 60) return `${minutes} 分钟前`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`

  const days = Math.floor(hours / 24)
  return `${days} 天前`
}

export function createEmptyEditorBoard(size = EDITOR_GRID_SIZE) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null))
}

export function findOccupiedBounds(board) {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  board.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (!cell) return
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    })
  })

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return null
  }

  return { minX, minY, maxX, maxY }
}

export function findFirstPlatform(board) {
  for (let y = 0; y < board.length; y += 1) {
    for (let x = 0; x < board[y].length; x += 1) {
      if (board[y][x]) {
        return { x, y }
      }
    }
  }
  return null
}

export function normalizeEditorBoard(board, minimumSize = EDITOR_GRID_SIZE) {
  const bounds = findOccupiedBounds(board)
  if (!bounds) {
    return {
      board: createEmptyEditorBoard(minimumSize),
      remapPoint(point) {
        return { ...point }
      }
    }
  }

  const contentWidth = bounds.maxX - bounds.minX + 1
  const contentHeight = bounds.maxY - bounds.minY + 1
  const width = Math.max(minimumSize, contentWidth + 2)
  const height = Math.max(minimumSize, contentHeight + 2)
  const offsetX = Math.floor((width - contentWidth) / 2)
  const offsetY = Math.floor((height - contentHeight) / 2)
  const normalized = Array.from({ length: height }, () => Array.from({ length: width }, () => null))

  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      const cell = board[y]?.[x] || null
      if (!cell) continue
      normalized[offsetY + y - bounds.minY][offsetX + x - bounds.minX] = { ...cell }
    }
  }

  return {
    board: normalized,
    remapPoint(point) {
      return {
        ...point,
        x: offsetX + point.x - bounds.minX,
        y: offsetY + point.y - bounds.minY
      }
    }
  }
}

export function normalizeEditorState(board, start) {
  const normalized = normalizeEditorBoard(board)
  const remappedStart = normalized.remapPoint(start)
  const fallbackStart = findFirstPlatform(normalized.board) || { x: 0, y: 0 }
  const nextStart = normalized.board[remappedStart.y]?.[remappedStart.x]
    ? remappedStart
    : fallbackStart

  return {
    board: normalized.board,
    start: {
      ...start,
      x: nextStart.x,
      y: nextStart.y
    }
  }
}
