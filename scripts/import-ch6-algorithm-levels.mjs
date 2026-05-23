/**
 * scripts/import-ch6-algorithm-levels.mjs
 * 导入「算法思维」第5章的50个手工设计关卡
 *
 * 用法：node scripts/import-ch6-algorithm-levels.mjs
 */

import mongoose from 'mongoose'

const MONGODB_URI =
  process.env.APP_MONGODB_URI ||
  'mongodb://localhost:27017/programtools'

const schema = new mongoose.Schema(
  {
    id:              { type: String, required: true, unique: true },
    title:           { type: String, required: true },
    chapter:         { id: String, title: String, order: Number },
    teachingGoal:    { type: String, default: '' },
    availableBlocks: [String],
    grid:            { type: mongoose.Schema.Types.Mixed, required: true },
    robot:           { x: Number, y: Number, z: { type: Number, default: 0 }, direction: String },
    winCondition:    { type: { type: String, default: 'all-coins-collected' } },
    constraints:     { maxMainBlocks: Number, maxFunctions: Number, recommendedSteps: Number },
    hints:           [String],
    sortOrder:       { type: Number, default: 0 },
  },
  { _id: true },
)

const V = { height: 0, kind: 'void' }
const P = { height: 0, kind: 'path' }
const h = (n, kind = 'path') => ({ height: n, kind })

function row(str) {
  return str.split(' ').map(t => {
    if (t === 'V') return { height: 0, kind: 'void' }
    if (t === 'P') return { height: 0, kind: 'path' }
    if (t === 'C') return { height: 0, kind: 'coin' }
    if (t === 'T') return { height: 0, kind: 'trap' }
    const m = t.match(/^(\d)([PCTO])$/)
    if (m) {
      const kinds = { P: 'path', C: 'coin', T: 'trap', O: 'obstacle' }
      return { height: Number(m[1]), kind: kinds[m[2]] || 'path' }
    }
    return { height: 0, kind: 'void' }
  })
}

const VOID_ROW = row('V V V V V V V V V')
const CHAPTER = { id: 'custom-ch5', title: '算法思维', order: 14 }
const OFFICIAL_LEVEL_COUNT = 50

function makeVoidGrid() {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => ({ height: 0, kind: 'void' })))
}

function setCell(grid, x, y, kind = 'path', height = 0) {
  if (x < 0 || x > 8 || y < 0 || y > 8) return
  grid[y][x] = { height, kind }
}

function setIfVoid(grid, x, y, kind = 'path', height = 0) {
  const cell = grid[y]?.[x]
  if (!cell || cell.kind !== 'void') return
  grid[y][x] = { height, kind }
}

function applyHazards(grid, hazards = []) {
  for (const hazard of hazards) {
    setIfVoid(grid, hazard.x, hazard.y, hazard.kind, hazard.height ?? 0)
  }
}

function cloneGrid(grid) {
  return grid.map(row => row.map(cell => ({ ...cell })))
}

function decorateLevel(level, hazards = []) {
  const grid = cloneGrid(level.grid)
  applyHazards(grid, hazards)
  return { ...level, grid }
}

function lineCoins(start, end, skip = []) {
  const values = []
  for (let x = start; x <= end; x++) {
    if (!skip.includes(x)) values.push(x)
  }
  return values
}

function buildCombLevel(config) {
  const grid = makeVoidGrid()
  for (let x = 1; x <= 7; x++) setCell(grid, x, config.spineY, 'path')
  for (const toothX of config.teeth) {
    for (let step = 1; step <= config.toothLength; step++) {
      const y = config.spineY - step
      const kind = step === config.toothLength || config.extraCoinRows.includes(step) ? 'coin' : 'path'
      setCell(grid, toothX, y, kind)
    }
  }
  const hazards = []
  for (const toothX of config.teeth) {
    hazards.push({ x: toothX === 1 ? 2 : toothX - 1, y: config.spineY - 1, kind: 'obstacle' })
    hazards.push({ x: toothX >= 6 ? toothX - 1 : toothX + 1, y: Math.max(0, config.spineY - Math.min(config.toothLength, 2)), kind: 'trap' })
  }
  applyHazards(grid, hazards)
  return {
    id: config.id,
    title: config.title,
    chapter: CHAPTER,
    teachingGoal: config.goal,
    availableBlocks: ['forward', 'turnLeft', 'turnRight', 'pickup', 'f1Call', 'repeat'],
    grid,
    robot: { x: 1, y: config.spineY, z: 0, direction: 'E' },
    winCondition: { type: 'all-coins-collected' },
    constraints: config.constraints,
    hints: config.hints,
    sortOrder: config.sortOrder,
  }
}

function buildSnakeLevel(config) {
  const grid = makeVoidGrid()
  for (let index = 0; index < config.rows.length; index++) {
    const y = config.rows[index]
    for (let x = 1; x <= 7; x++) {
      const kind = config.coinRows[index].includes(x) ? 'coin' : 'path'
      setCell(grid, x, y, kind)
    }
    if (index < config.rows.length - 1) {
      const connectorX = index % 2 === 0 ? 7 : 1
      const nextY = config.rows[index + 1]
      const [fromY, toY] = y < nextY ? [y, nextY] : [nextY, y]
      for (let cy = fromY + 1; cy < toY; cy++) setCell(grid, connectorX, cy, 'path')
    }
  }
  const hazards = []
  for (let index = 0; index < config.rows.length; index++) {
    const y = config.rows[index]
    const sideY = y === 0 ? y + 1 : y - 1
    for (const x of [2, 4, 6]) {
      hazards.push({ x, y: sideY, kind: x === 4 ? 'trap' : 'obstacle' })
    }
  }
  applyHazards(grid, hazards)
  return {
    id: config.id,
    title: config.title,
    chapter: CHAPTER,
    teachingGoal: config.goal,
    availableBlocks: ['forward', 'turnLeft', 'turnRight', 'pickup', 'f1Call', 'repeat'],
    grid,
    robot: { x: 1, y: config.rows[0], z: 0, direction: 'E' },
    winCondition: { type: 'all-coins-collected' },
    constraints: config.constraints,
    hints: config.hints,
    sortOrder: config.sortOrder,
  }
}

function buildCrossLevel(config) {
  const grid = makeVoidGrid()
  const { x: cx, y: cy } = config.center
  setCell(grid, cx, cy, 'coin')
  for (let step = 1; step <= config.armLength; step++) {
    setCell(grid, cx, cy - step, step === config.armLength ? 'coin' : 'path')
    setCell(grid, cx + step, cy, step === config.armLength ? 'coin' : 'path')
    setCell(grid, cx, cy + step, step === config.armLength ? 'coin' : 'path')
    setCell(grid, cx - step, cy, step === config.armLength ? 'coin' : 'path')
  }
  for (const branch of config.sideBranches) {
    for (let step = 1; step <= branch.length; step++) {
      const x = branch.dx === 0 ? branch.x : branch.x + branch.dx * step
      const y = branch.dy === 0 ? branch.y : branch.y + branch.dy * step
      setCell(grid, x, y, step === branch.length ? 'coin' : 'path')
    }
  }
  applyHazards(grid, [
    { x: cx - 1, y: cy - 1, kind: 'trap' },
    { x: cx + 1, y: cy - 1, kind: 'obstacle' },
    { x: cx - 1, y: cy + 1, kind: 'obstacle' },
    { x: cx + 1, y: cy + 1, kind: 'trap' },
    { x: cx - config.armLength, y: cy - 1, kind: 'obstacle' },
    { x: cx + config.armLength, y: cy + 1, kind: 'obstacle' },
  ])
  return {
    id: config.id,
    title: config.title,
    chapter: CHAPTER,
    teachingGoal: config.goal,
    availableBlocks: ['forward', 'turnLeft', 'turnRight', 'pickup', 'f1Call', 'f2Call', 'repeat'],
    grid,
    robot: { x: cx, y: cy, z: 0, direction: config.direction },
    winCondition: { type: 'all-coins-collected' },
    constraints: config.constraints,
    hints: config.hints,
    sortOrder: config.sortOrder,
  }
}

function buildStairLevel(config) {
  const grid = makeVoidGrid()
  for (let index = 0; index < config.heights.length; index++) {
    const x = config.startX + index
    setCell(grid, x, config.y, index === 0 ? 'path' : 'coin', config.heights[index])
  }
  if (config.returnHeights) {
    for (let index = 0; index < config.returnHeights.length; index++) {
      const x = config.returnStartX + index
      setCell(grid, x, config.returnY, 'coin', config.returnHeights[index])
    }
    for (let y = Math.min(config.y, config.returnY); y <= Math.max(config.y, config.returnY); y++) {
      setCell(grid, config.turnX, y, 'path', config.turnHeight)
    }
  }
  const hazards = []
  const sideY = config.y < 8 ? config.y + 1 : config.y - 1
  for (let index = 1; index < config.heights.length; index++) {
    hazards.push({ x: config.startX + index, y: sideY, kind: index % 2 === 0 ? 'trap' : 'obstacle' })
  }
  if (config.returnHeights) {
    const returnSideY = config.returnY > 0 ? config.returnY - 1 : config.returnY + 1
    for (let index = 0; index < config.returnHeights.length; index++) {
      hazards.push({ x: config.returnStartX + index, y: returnSideY, kind: index % 2 === 0 ? 'obstacle' : 'trap' })
    }
  }
  applyHazards(grid, hazards)
  return {
    id: config.id,
    title: config.title,
    chapter: CHAPTER,
    teachingGoal: config.goal,
    availableBlocks: ['jump', 'turnLeft', 'turnRight', 'pickup', 'f1Call', 'repeat'],
    grid,
    robot: { x: config.startX, y: config.y, z: config.heights[0], direction: 'E' },
    winCondition: { type: 'all-coins-collected' },
    constraints: config.constraints,
    hints: config.hints,
    sortOrder: config.sortOrder,
  }
}

function buildRingLevel(config) {
  const grid = makeVoidGrid()
  for (let x = config.outer.left; x <= config.outer.right; x++) {
    setCell(grid, x, config.outer.top, config.outerCoins.top.includes(x) ? 'coin' : 'path')
    setCell(grid, x, config.outer.bottom, config.outerCoins.bottom.includes(x) ? 'coin' : 'path')
  }
  for (let y = config.outer.top; y <= config.outer.bottom; y++) {
    setCell(grid, config.outer.left, y, config.outerCoins.left.includes(y) ? 'coin' : 'path')
    setCell(grid, config.outer.right, y, config.outerCoins.right.includes(y) ? 'coin' : 'path')
  }
  for (let x = config.inner.left; x <= config.inner.right; x++) {
    setCell(grid, x, config.inner.top, config.innerCoins.top.includes(x) ? 'coin' : 'path')
    setCell(grid, x, config.inner.bottom, config.innerCoins.bottom.includes(x) ? 'coin' : 'path')
  }
  for (let y = config.inner.top; y <= config.inner.bottom; y++) {
    setCell(grid, config.inner.left, y, config.innerCoins.left.includes(y) ? 'coin' : 'path')
    setCell(grid, config.inner.right, y, config.innerCoins.right.includes(y) ? 'coin' : 'path')
  }
  for (const gate of config.gates) {
    if (gate.x1 === gate.x2) {
      for (let y = Math.min(gate.y1, gate.y2); y <= Math.max(gate.y1, gate.y2); y++) setCell(grid, gate.x1, y, 'path')
    } else {
      for (let x = Math.min(gate.x1, gate.x2); x <= Math.max(gate.x1, gate.x2); x++) setCell(grid, x, gate.y1, 'path')
    }
  }
  applyHazards(grid, [
    { x: config.inner.left - 1, y: config.inner.top - 1, kind: 'obstacle' },
    { x: config.inner.right + 1, y: config.inner.top - 1, kind: 'trap' },
    { x: config.inner.left - 1, y: config.inner.bottom + 1, kind: 'trap' },
    { x: config.inner.right + 1, y: config.inner.bottom + 1, kind: 'obstacle' },
    ...config.gates.map((gate, index) => ({
      x: gate.x1 === gate.x2 ? gate.x1 + (index % 2 === 0 ? 1 : -1) : Math.floor((gate.x1 + gate.x2) / 2),
      y: gate.x1 === gate.x2 ? Math.floor((gate.y1 + gate.y2) / 2) : gate.y1 + (index % 2 === 0 ? 1 : -1),
      kind: index % 2 === 0 ? 'trap' : 'obstacle',
    })),
  ])
  return {
    id: config.id,
    title: config.title,
    chapter: CHAPTER,
    teachingGoal: config.goal,
    availableBlocks: ['forward', 'turnLeft', 'turnRight', 'pickup', 'f1Call', 'f2Call', 'repeat'],
    grid,
    robot: { x: config.robot.x, y: config.robot.y, z: 0, direction: config.robot.direction },
    winCondition: { type: 'all-coins-collected' },
    constraints: config.constraints,
    hints: config.hints,
    sortOrder: config.sortOrder,
  }
}

const baseLevels = [
  {
    id: 'custom-ch6-001',
    title: '第6-1关：回字长廊',
    chapter: CHAPTER,
    teachingGoal: '把外圈巡航与内圈切入拆成两个可复用结构，训练分治与调度思维。',
    availableBlocks: ['forward', 'turnLeft', 'turnRight', 'pickup', 'f1Call', 'f2Call', 'repeat'],
    grid: [
      VOID_ROW,
      row('V P C P P P C P V'),
      row('V P V V P V V P V'),
      row('V C P P C P P C V'),
      row('V P V V V V V P V'),
      row('V C P P C P P C V'),
      row('V P V V P V V P V'),
      row('V P C P P P C P V'),
      VOID_ROW,
    ],
    robot: { x: 1, y: 7, z: 0, direction: 'E' },
    winCondition: { type: 'all-coins-collected' },
    constraints: { maxMainBlocks: 10, maxFunctions: 10, recommendedSteps: 48 },
    hints: [
      '外圈并不是唯一任务，中途要两次切入内圈再回到外圈。',
      '把“直走收星”与“转角切换”分开，会比顺着路径硬写短很多。',
      '如果 main 太长，说明你还没有把调度和动作分层。',
    ],
    sortOrder: 300,
  },
  {
    id: 'custom-ch6-002',
    title: '第6-2关：四齿梳阵',
    chapter: CHAPTER,
    teachingGoal: '识别主干与支路的重复模式，用一段回收子程序批量清理多个齿位。',
    availableBlocks: ['forward', 'turnLeft', 'turnRight', 'pickup', 'f1Call', 'repeat'],
    grid: [
      VOID_ROW,
      VOID_ROW,
      row('V C V C V C V C V'),
      row('V P V P V P V P V'),
      row('V P V P V P V P V'),
      row('V P P P P P P P V'),
      VOID_ROW,
      VOID_ROW,
      VOID_ROW,
    ],
    robot: { x: 1, y: 5, z: 0, direction: 'N' },
    winCondition: { type: 'all-coins-collected' },
    constraints: { maxMainBlocks: 8, maxFunctions: 9, recommendedSteps: 44 },
    hints: [
      '每个齿位都要“上去、收星、回来、对准下一个齿位”。',
      '齿位有四个，repeat 很重要。',
      'f1 里处理单个齿位，main 里沿主干推进。',
    ],
    sortOrder: 301,
  },
  {
    id: 'custom-ch6-003',
    title: '第6-3关：四排蛇阵',
    chapter: CHAPTER,
    teachingGoal: '在更长的蛇形路径上保持函数复用，训练跨行切换时的方向控制。',
    availableBlocks: ['forward', 'turnLeft', 'turnRight', 'pickup', 'f1Call', 'repeat'],
    grid: [
      row('V P C C C C C P V'),
      row('V V V V V V V P V'),
      row('V P C C C C C P V'),
      row('V P V V V V V V V'),
      row('V P C C C C C P V'),
      row('V V V V V V V P V'),
      row('V P C C C C C P V'),
      VOID_ROW,
      VOID_ROW,
    ],
    robot: { x: 1, y: 0, z: 0, direction: 'E' },
    winCondition: { type: 'all-coins-collected' },
    constraints: { maxMainBlocks: 14, maxFunctions: 6, recommendedSteps: 70 },
    hints: [
      '同一个横向清扫子程序，朝东和朝西都应该能复用。',
      '换排时，一次向右转，两次向左转，不要混。',
      '这是长路径调度题，不是单纯的走迷宫。',
    ],
    sortOrder: 302,
  },
  {
    id: 'custom-ch6-004',
    title: '第6-4关：阶梯折返',
    chapter: CHAPTER,
    teachingGoal: '在上升与下降的镜像台阶中复用 jump 逻辑，体会对称结构。',
    availableBlocks: ['jump', 'turnLeft', 'turnRight', 'pickup', 'f1Call', 'repeat'],
    grid: [
      VOID_ROW,
      VOID_ROW,
      VOID_ROW,
      [V, h(0, 'path'), h(1, 'coin'), h(2, 'coin'), h(3, 'coin'), h(2, 'coin'), h(1, 'coin'), h(0, 'coin'), V],
      VOID_ROW,
      VOID_ROW,
      VOID_ROW,
      VOID_ROW,
      VOID_ROW,
    ],
    robot: { x: 1, y: 3, z: 0, direction: 'E' },
    winCondition: { type: 'all-coins-collected' },
    constraints: { maxMainBlocks: 12, maxFunctions: 5, recommendedSteps: 24 },
    hints: [
      '前半段一直上楼，后半段一直下楼，动作结构是镜像的。',
      '如果把每一级都单写，积木会超标。',
      '思考“jump + pickup”在哪些位置可以打包。',
    ],
    sortOrder: 303,
  },
  {
    id: 'custom-ch6-005',
    title: '第6-5关：双环换道',
    chapter: CHAPTER,
    teachingGoal: '先完成左环，再切入右环，重点在于两个回路共享同一种拐角策略。',
    availableBlocks: ['forward', 'turnLeft', 'turnRight', 'pickup', 'f1Call', 'f2Call', 'repeat'],
    grid: [
      VOID_ROW,
      row('V P C P V P C P V'),
      row('V C V C V C V C V'),
      row('V P C P P P C P V'),
      row('V V V V P V V V V'),
      row('V P C P P P C P V'),
      row('V C V C V C V C V'),
      row('V P C P V P C P V'),
      VOID_ROW,
    ],
    robot: { x: 1, y: 3, z: 0, direction: 'E' },
    winCondition: { type: 'all-coins-collected' },
    constraints: { maxMainBlocks: 12, maxFunctions: 12, recommendedSteps: 56 },
    hints: [
      '左半边和右半边形状一致，只是进入时机不同。',
      '一个函数管“环的一边”，另一个函数管“换道转场”，会更清楚。',
      '这是结构抽象题，不是手速题。',
    ],
    sortOrder: 304,
  },
  {
    id: 'custom-ch6-006',
    title: '第6-6关：十字巡航',
    chapter: CHAPTER,
    teachingGoal: '从中心出发反复访问四个方向，训练中心-分支-回中心的统一建模。',
    availableBlocks: ['forward', 'turnLeft', 'turnRight', 'pickup', 'f1Call', 'repeat'],
    grid: [
      VOID_ROW,
      VOID_ROW,
      row('V V V V C V V V V'),
      row('V V V V P V V V V'),
      row('V C P P C P P C V'),
      row('V V V V P V V V V'),
      row('V V V V C V V V V'),
      VOID_ROW,
      VOID_ROW,
    ],
    robot: { x: 4, y: 4, z: 0, direction: 'N' },
    winCondition: { type: 'all-coins-collected' },
    constraints: { maxMainBlocks: 10, maxFunctions: 8, recommendedSteps: 36 },
    hints: [
      '四个方向本质相同，只是朝向不同。',
      '把“出去收星再回来”当成一个整体。',
      '中心点就是循环体的锚点。',
    ],
    sortOrder: 305,
  },
  {
    id: 'custom-ch6-007',
    title: '第6-7关：三岛跳桥',
    chapter: CHAPTER,
    teachingGoal: '跨越不同高度的小岛，要求把 jump 与转向组合成稳定的过桥模板。',
    availableBlocks: ['jump', 'forward', 'turnLeft', 'turnRight', 'pickup', 'f1Call', 'repeat'],
    grid: [
      VOID_ROW,
      VOID_ROW,
      [V, h(0, 'path'), h(1, 'coin'), h(0, 'path'), h(1, 'coin'), h(0, 'path'), h(1, 'coin'), h(0, 'path'), V],
      VOID_ROW,
      [V, V, V, h(1, 'path'), h(2, 'coin'), h(1, 'path'), V, V, V],
      VOID_ROW,
      [V, h(0, 'coin'), h(1, 'path'), h(0, 'coin'), h(1, 'path'), h(0, 'coin'), h(1, 'path'), h(0, 'coin'), V],
      VOID_ROW,
      VOID_ROW,
    ],
    robot: { x: 1, y: 2, z: 0, direction: 'E' },
    winCondition: { type: 'all-coins-collected' },
    constraints: { maxMainBlocks: 14, maxFunctions: 8, recommendedSteps: 42 },
    hints: [
      '不是所有桥都是平地，有些必须用 jump，只有少数可以 forward。',
      '上中下三层的访问顺序会影响整体积木数。',
      '先想稳定模板，再决定访问顺序。',
    ],
    sortOrder: 306,
  },
  {
    id: 'custom-ch6-008',
    title: '第6-8关：镜像双排',
    chapter: CHAPTER,
    teachingGoal: '同一段横向清扫子程序在镜像双排中复用，训练方向无关的抽象。',
    availableBlocks: ['forward', 'turnLeft', 'turnRight', 'pickup', 'f1Call', 'repeat'],
    grid: [
      VOID_ROW,
      VOID_ROW,
      row('V P C C C P C C V'),
      row('V V V V V V V P V'),
      row('V P C C P C C C V'),
      row('V P V V V V V V V'),
      row('V P C C C P C C V'),
      VOID_ROW,
      VOID_ROW,
    ],
    robot: { x: 1, y: 2, z: 0, direction: 'E' },
    winCondition: { type: 'all-coins-collected' },
    constraints: { maxMainBlocks: 13, maxFunctions: 6, recommendedSteps: 54 },
    hints: [
      '三排并不完全一样，但横向主体高度相似。',
      '关键不是写出三份代码，而是识别哪个差异必须单独处理。',
      '用 main 调度差异，用 f1 处理公共部分。',
    ],
    sortOrder: 307,
  },
  {
    id: 'custom-ch6-009',
    title: '第6-9关：回旋楼梯',
    chapter: CHAPTER,
    teachingGoal: '在转角楼梯中交替使用 jump 与转向，训练二维路径和高度变化的同步规划。',
    availableBlocks: ['jump', 'turnLeft', 'turnRight', 'pickup', 'f1Call', 'f2Call', 'repeat'],
    grid: [
      VOID_ROW,
      VOID_ROW,
      [V, V, h(0, 'path'), h(1, 'coin'), h(2, 'coin'), V, V, V, V],
      [V, V, V, V, h(3, 'coin'), V, V, V, V],
      [V, V, V, V, h(2, 'coin'), h(1, 'coin'), h(0, 'coin'), V, V],
      VOID_ROW,
      VOID_ROW,
      VOID_ROW,
      VOID_ROW,
    ],
    robot: { x: 2, y: 2, z: 0, direction: 'E' },
    winCondition: { type: 'all-coins-collected' },
    constraints: { maxMainBlocks: 12, maxFunctions: 8, recommendedSteps: 28 },
    hints: [
      '前半段在上升，后半段在拐弯后下降。',
      '把“连续上楼”和“转向后连续下楼”分开思考。',
      '拐角处是最容易多写积木的地方。',
    ],
    sortOrder: 308,
  },
  {
    id: 'custom-ch6-010',
    title: '第6-10关：螺旋回廊',
    chapter: CHAPTER,
    teachingGoal: '在逐层向内的螺旋路径里识别缩小版重复结构，训练递进式抽象。',
    availableBlocks: ['forward', 'turnLeft', 'turnRight', 'pickup', 'f1Call', 'f2Call', 'repeat'],
    grid: [
      row('V V V V V V V V V'),
      row('V P C P P P C P V'),
      row('V P V V V V V P V'),
      row('V C V P C P V C V'),
      row('V P V P V P V P V'),
      row('V C V P C P P C V'),
      row('V P V V V V V V V'),
      row('V P C P P P P P V'),
      row('V V V V V V V V V'),
    ],
    robot: { x: 1, y: 7, z: 0, direction: 'E' },
    winCondition: { type: 'all-coins-collected' },
    constraints: { maxMainBlocks: 15, maxFunctions: 10, recommendedSteps: 60 },
    hints: [
      '路径不是简单绕圈，而是一圈比一圈更短。',
      '先找外层，再看内层是否是“缩小版重复”。',
      '如果你一直在 main 里写转弯，说明抽象层次还不够。',
    ],
    sortOrder: 309,
  },
]

const combConfigs = [
  ['custom-ch6-011', '第6-11关：五齿长梳', [1, 2, 4, 6, 7], 3, [2], 10, 56],
  ['custom-ch6-012', '第6-12关：偏移梳阵', [2, 4, 6], 4, [2], 10, 52],
  ['custom-ch6-013', '第6-13关：密齿回收', [1, 3, 5, 7], 3, [1, 2], 11, 60],
  ['custom-ch6-014', '第6-14关：双层梳背', [2, 3, 5, 6], 3, [2], 10, 58],
  ['custom-ch6-015', '第6-15关：宽脊梳路', [1, 3, 5, 7], 2, [1], 10, 46],
  ['custom-ch6-016', '第6-16关：六齿展开', [1, 2, 3, 5, 6, 7], 2, [1], 12, 62],
  ['custom-ch6-017', '第6-17关：深齿长廊', [2, 4, 6], 5, [2, 4], 12, 66],
  ['custom-ch6-018', '第6-18关：齿阵折返', [1, 3, 4, 6], 4, [3], 11, 64],
].map(([id, title, teeth, toothLength, extraCoinRows, maxMainBlocks, recommendedSteps], index) => buildCombLevel({
  id,
  title,
  spineY: 7,
  teeth,
  toothLength,
  extraCoinRows,
  goal: '识别“进入齿位、回收、返回主干”的统一动作，逼出循环和子程序复用。',
  constraints: { maxMainBlocks, maxFunctions: 10, recommendedSteps },
  hints: [
    '主干负责位移，齿位负责收星，别把两层逻辑混在一起。',
    '每个齿位并不需要单独写，重复结构已经很明显。',
    '最短解一定是“沿主干推进 + 单齿模板”的组合。',
  ],
  sortOrder: 310 + index,
}))

const snakeConfigs = [
  ['custom-ch6-019', '第6-19关：五排蛇阵', [1, 2, 3, 4, 5], [[], [], [], [], []], 13, 78],
  ['custom-ch6-020', '第6-20关：断点蛇形', [2, 4, 6, 8], [[4], [3], [5], [4]], 12, 68],
  ['custom-ch6-021', '第6-21关：密集扫廊', [0, 2, 4, 6], [[], [2], [], [6]], 12, 72],
  ['custom-ch6-022', '第6-22关：双缺口蛇阵', [1, 3, 5, 7], [[3], [5], [3], [5]], 13, 74],
  ['custom-ch6-023', '第6-23关：长蛇变道', [0, 2, 4, 6, 8], [[6], [], [2], [], [6]], 14, 82],
  ['custom-ch6-024', '第6-24关：交错星带', [1, 3, 5, 7], [[2, 6], [3, 5], [2, 6], [3, 5]], 14, 76],
  ['custom-ch6-025', '第6-25关：窄门蛇行', [2, 4, 6], [[4], [4], [4]], 10, 58],
  ['custom-ch6-026', '第6-26关：五线巡回', [0, 2, 4, 6, 8], [[2], [6], [2], [6], [2]], 15, 88],
].map(([id, title, rows, skipColumnsPerRow, maxMainBlocks, recommendedSteps], index) => buildSnakeLevel({
  id,
  title,
  rows,
  coinRows: rows.map((_, rowIndex) => lineCoins(1, 7, [1, 7, ...skipColumnsPerRow[rowIndex]])),
  goal: '在长蛇形路径中保持方向无关的横向模板复用，训练跨行调度。',
  constraints: { maxMainBlocks, maxFunctions: 8, recommendedSteps },
  hints: [
    '先把单排清扫抽出来，再考虑换排。',
    '朝向会变，但“清扫一排”的结构不会变。',
    '如果你为每一排写不同代码，积木数会立刻失控。',
  ],
  sortOrder: 318 + index,
}))

const crossConfigs = [
  ['custom-ch6-027', '第6-27关：中心四射', { x: 4, y: 4 }, 2, 'N', [{ x: 2, y: 4, dx: 0, dy: -1, length: 1 }, { x: 6, y: 4, dx: 0, dy: 1, length: 1 }], 10, 40],
  ['custom-ch6-028', '第6-28关：十字偏枝', { x: 4, y: 4 }, 3, 'E', [{ x: 4, y: 1, dx: -1, dy: 0, length: 1 }, { x: 4, y: 7, dx: 1, dy: 0, length: 1 }], 11, 46],
  ['custom-ch6-029', '第6-29关：双侧回收', { x: 4, y: 4 }, 2, 'S', [{ x: 2, y: 4, dx: 0, dy: 1, length: 1 }, { x: 6, y: 4, dx: 0, dy: -1, length: 1 }], 10, 42],
  ['custom-ch6-030', '第6-30关：长臂十字', { x: 4, y: 4 }, 3, 'W', [{ x: 1, y: 4, dx: 0, dy: -1, length: 1 }, { x: 7, y: 4, dx: 0, dy: 1, length: 1 }], 12, 48],
  ['custom-ch6-031', '第6-31关：外扩四翼', { x: 4, y: 4 }, 2, 'N', [{ x: 4, y: 2, dx: -1, dy: 0, length: 1 }, { x: 4, y: 6, dx: 1, dy: 0, length: 1 }], 10, 44],
  ['custom-ch6-032', '第6-32关：中枢回路', { x: 4, y: 4 }, 3, 'E', [{ x: 3, y: 4, dx: 0, dy: -1, length: 2 }, { x: 5, y: 4, dx: 0, dy: 1, length: 2 }], 12, 52],
  ['custom-ch6-033', '第6-33关：十字加挂', { x: 4, y: 4 }, 2, 'S', [{ x: 4, y: 2, dx: -1, dy: 0, length: 2 }, { x: 4, y: 6, dx: 1, dy: 0, length: 2 }], 12, 50],
  ['custom-ch6-034', '第6-34关：四象归心', { x: 4, y: 4 }, 3, 'W', [{ x: 2, y: 4, dx: 0, dy: -1, length: 2 }, { x: 6, y: 4, dx: 0, dy: 1, length: 2 }], 13, 56],
].map(([id, title, center, armLength, direction, sideBranches, maxMainBlocks, recommendedSteps], index) => buildCrossLevel({
  id,
  title,
  center,
  armLength,
  direction,
  sideBranches,
  goal: '从中枢出发访问多条分支，并不断返回中枢，训练调度层和动作层分离。',
  constraints: { maxMainBlocks, maxFunctions: 9, recommendedSteps },
  hints: [
    '从中心出发去四边，本质是同一种往返过程。',
    '支路只是局部差异，主骨架仍然统一。',
    'main 负责顺序，f1/f2 负责动作模板。',
  ],
  sortOrder: 326 + index,
}))

const stairConfigs = [
  ['custom-ch6-035', '第6-35关：五阶长梯', 2, [0, 1, 2, 3, 4, 5], null, 10, 24],
  ['custom-ch6-036', '第6-36关：折返阶梯', 2, [0, 1, 2, 3], { returnStartX: 5, returnY: 5, returnHeights: [3, 2, 1], turnX: 5, turnHeight: 3 }, 11, 30],
  ['custom-ch6-037', '第6-37关：镜像长梯', 1, [0, 1, 2, 3, 4], { returnStartX: 5, returnY: 5, returnHeights: [4, 3, 2, 1], turnX: 5, turnHeight: 4 }, 12, 34],
  ['custom-ch6-038', '第6-38关：高低反转', 1, [0, 1, 2, 3], { returnStartX: 4, returnY: 4, returnHeights: [2, 1, 0], turnX: 4, turnHeight: 3 }, 10, 28],
  ['custom-ch6-039', '第6-39关：连续登顶', 2, [0, 1, 2, 3, 4], null, 10, 22],
  ['custom-ch6-040', '第6-40关：双段上坡', 1, [0, 1, 2, 3], { returnStartX: 5, returnY: 3, returnHeights: [3, 4, 5], turnX: 5, turnHeight: 3 }, 12, 32],
  ['custom-ch6-041', '第6-41关：楼梯回勾', 1, [0, 1, 2, 3, 4], { returnStartX: 6, returnY: 5, returnHeights: [4, 3, 2], turnX: 6, turnHeight: 4 }, 12, 34],
  ['custom-ch6-042', '第6-42关：拐角天梯', 2, [0, 1, 2, 3], { returnStartX: 5, returnY: 6, returnHeights: [3, 2, 1, 0], turnX: 5, turnHeight: 3 }, 13, 36],
].map(([id, title, y, heights, returnConfig, maxMainBlocks, recommendedSteps], index) => buildStairLevel({
  id,
  title,
  startX: 1,
  y,
  heights,
  returnStartX: returnConfig?.returnStartX,
  returnY: returnConfig?.returnY,
  returnHeights: returnConfig?.returnHeights,
  turnX: returnConfig?.turnX,
  turnHeight: returnConfig?.turnHeight,
  goal: '把跳跃与转向拆解成稳定模板，在高度变化中保持抽象一致性。',
  constraints: { maxMainBlocks, maxFunctions: 7, recommendedSteps },
  hints: [
    '高度变化才是核心，路径只是承载。',
    '如果每一级都单独处理，你会浪费大量积木。',
    '先找重复的 jump 节奏，再考虑拐角。',
  ],
  sortOrder: 334 + index,
}))

const ringConfigs = [
  ['custom-ch6-043', '第6-43关：双环内切', { left: 1, top: 1, right: 7, bottom: 7 }, { left: 3, top: 3, right: 5, bottom: 5 }, [{ x1: 4, y1: 1, x2: 4, y2: 3 }], 12, 58],
  ['custom-ch6-044', '第6-44关：回字双门', { left: 1, top: 1, right: 7, bottom: 7 }, { left: 2, top: 2, right: 6, bottom: 6 }, [{ x1: 1, y1: 4, x2: 2, y2: 4 }, { x1: 6, y1: 4, x2: 7, y2: 4 }], 13, 64],
  ['custom-ch6-045', '第6-45关：偏心双环', { left: 1, top: 1, right: 7, bottom: 7 }, { left: 3, top: 2, right: 6, bottom: 5 }, [{ x1: 5, y1: 1, x2: 5, y2: 2 }], 12, 60],
  ['custom-ch6-046', '第6-46关：双环换轴', { left: 1, top: 1, right: 7, bottom: 7 }, { left: 2, top: 3, right: 6, bottom: 5 }, [{ x1: 7, y1: 4, x2: 6, y2: 4 }], 13, 62],
  ['custom-ch6-047', '第6-47关：双层回廊', { left: 1, top: 1, right: 7, bottom: 7 }, { left: 3, top: 3, right: 5, bottom: 5 }, [{ x1: 4, y1: 7, x2: 4, y2: 5 }], 12, 56],
  ['custom-ch6-048', '第6-48关：四门回字', { left: 1, top: 1, right: 7, bottom: 7 }, { left: 3, top: 3, right: 5, bottom: 5 }, [{ x1: 4, y1: 1, x2: 4, y2: 3 }, { x1: 7, y1: 4, x2: 5, y2: 4 }], 14, 68],
  ['custom-ch6-049', '第6-49关：双环穿梭', { left: 1, top: 1, right: 7, bottom: 7 }, { left: 2, top: 2, right: 6, bottom: 6 }, [{ x1: 1, y1: 4, x2: 2, y2: 4 }, { x1: 4, y1: 6, x2: 4, y2: 7 }], 14, 70],
  ['custom-ch6-050', '第6-50关：螺旋双环', { left: 1, top: 1, right: 7, bottom: 7 }, { left: 3, top: 2, right: 5, bottom: 6 }, [{ x1: 4, y1: 1, x2: 4, y2: 2 }, { x1: 5, y1: 6, x2: 7, y2: 6 }], 15, 74],
].map(([id, title, outer, inner, gates, maxMainBlocks, recommendedSteps], index) => buildRingLevel({
  id,
  title,
  outer,
  inner,
  gates,
  outerCoins: {
    top: lineCoins(outer.left + 1, outer.right - 1, [4]),
    bottom: lineCoins(outer.left + 1, outer.right - 1, [outer.left + 1]),
    left: [outer.top + 2, outer.bottom - 2],
    right: [outer.top + 2, outer.bottom - 2],
  },
  innerCoins: {
    top: lineCoins(inner.left + 1, inner.right - 1, []),
    bottom: lineCoins(inner.left + 1, inner.right - 1, []),
    left: inner.bottom - inner.top >= 2 ? [inner.top + 1] : [],
    right: inner.bottom - inner.top >= 2 ? [inner.bottom - 1] : [],
  },
  robot: { x: outer.left, y: outer.bottom, direction: 'E' },
  goal: '在外环与内环之间多次切换，训练局部模板复用与全局调度。',
  constraints: { maxMainBlocks, maxFunctions: 10, recommendedSteps },
  hints: [
    '外环和内环不是两套完全不同的代码。',
    '关键在于什么时候切入，什么时候回到外层。',
    '把“环的一边”抽成统一模板，主程序只做路线编排。',
  ],
  sortOrder: 342 + index,
}))

const decoratedBaseLevels = [
  decorateLevel(baseLevels[0], [
    { x: 4, y: 4, kind: 'trap' },
    { x: 3, y: 4, kind: 'obstacle' },
    { x: 5, y: 4, kind: 'obstacle' },
  ]),
  decorateLevel(baseLevels[1], [
    { x: 1, y: 4, kind: 'obstacle' },
    { x: 3, y: 4, kind: 'trap' },
    { x: 5, y: 4, kind: 'trap' },
    { x: 7, y: 4, kind: 'obstacle' },
  ]),
  decorateLevel(baseLevels[2], [
    { x: 2, y: 3, kind: 'trap' },
    { x: 4, y: 3, kind: 'obstacle' },
    { x: 5, y: 5, kind: 'trap' },
  ]),
  decorateLevel(baseLevels[3], [
    { x: 2, y: 4, kind: 'obstacle' },
    { x: 6, y: 4, kind: 'trap' },
    { x: 5, y: 4, kind: 'obstacle' },
  ]),
  decorateLevel(baseLevels[4], [
    { x: 4, y: 2, kind: 'obstacle' },
    { x: 2, y: 3, kind: 'trap' },
    { x: 6, y: 5, kind: 'trap' },
  ]),
  decorateLevel(baseLevels[5], [
    { x: 3, y: 3, kind: 'trap' },
    { x: 5, y: 3, kind: 'obstacle' },
    { x: 3, y: 5, kind: 'obstacle' },
    { x: 5, y: 5, kind: 'trap' },
  ]),
  decorateLevel(baseLevels[6], [
    { x: 2, y: 1, kind: 'obstacle' },
    { x: 4, y: 1, kind: 'trap' },
    { x: 6, y: 1, kind: 'obstacle' },
    { x: 4, y: 5, kind: 'trap' },
  ]),
  decorateLevel(baseLevels[7], [
    { x: 2, y: 1, kind: 'trap' },
    { x: 4, y: 3, kind: 'obstacle' },
    { x: 6, y: 5, kind: 'trap' },
  ]),
  decorateLevel(baseLevels[8], [
    { x: 3, y: 1, kind: 'obstacle' },
    { x: 5, y: 2, kind: 'trap' },
    { x: 6, y: 4, kind: 'obstacle' },
  ]),
  decorateLevel(baseLevels[9], [
    { x: 2, y: 2, kind: 'obstacle' },
    { x: 6, y: 2, kind: 'trap' },
    { x: 2, y: 6, kind: 'trap' },
    { x: 6, y: 6, kind: 'obstacle' },
  ]),
]

const levels = [
  ...decoratedBaseLevels,
  ...combConfigs,
  ...snakeConfigs,
  ...crossConfigs,
  ...stairConfigs,
  ...ringConfigs,
].map((level, index) => ({
  ...level,
  id: `custom-ch5-${String(index + 1).padStart(3, '0')}`,
  title: level.title.replace(/^第6-/, '第5-'),
  chapter: CHAPTER,
  sortOrder: OFFICIAL_LEVEL_COUNT + index,
}))

async function main() {
  console.log(`[import-ch6] 连接数据库 ${MONGODB_URI.replace(/\/\/[^@]+@/, '//<creds>@')} …`)
  await mongoose.connect(MONGODB_URI)
  const CodebotLevel = mongoose.model('CodebotLevel', schema, 'lightbotlevels')

  const deleteResult = await CodebotLevel.deleteMany({
    id: { $regex: /^custom-ch(5|6)-/ },
  })
  console.log(`[import-ch6] 已删除旧自定义关卡: ${deleteResult.deletedCount}`)

  let upserted = 0
  let skipped = 0

  for (const lvl of levels) {
    try {
      await CodebotLevel.findOneAndUpdate(
        { id: lvl.id },
        { $set: lvl },
        { upsert: true, new: true },
      )
      console.log(`  [ok] ${lvl.id}  "${lvl.title}"`)
      upserted++
    } catch (e) {
      console.error(`  [err] ${lvl.id}: ${e.message}`)
      skipped++
    }
  }

  console.log(`\n[import-ch6] 完成！导入: ${upserted}，失败: ${skipped}`)
  await mongoose.disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })