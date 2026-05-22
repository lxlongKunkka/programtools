/**
 * scripts/import-ch6-algorithm-levels.mjs
 * 导入「算法思维」第6章的10个手工设计关卡
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
const CHAPTER = { id: 'custom-ch6', title: '算法思维', order: 6 }

const levels = [
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

async function main() {
  console.log(`[import-ch6] 连接数据库 ${MONGODB_URI.replace(/\/\/[^@]+@/, '//<creds>@')} …`)
  await mongoose.connect(MONGODB_URI)
  const CodebotLevel = mongoose.model('CodebotLevel', schema, 'lightbotlevels')

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