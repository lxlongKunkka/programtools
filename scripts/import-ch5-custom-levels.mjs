/**
 * scripts/import-ch5-custom-levels.mjs
 * 导入「创意挑战」第5章的5个手工设计关卡
 *
 * 用法：node scripts/import-ch5-custom-levels.mjs
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

// ── 格子构建辅助 ─────────────────────────────────────────────────────────────
const V  = { height: 0, kind: 'void' }
const P  = { height: 0, kind: 'path' }
const C  = { height: 0, kind: 'coin' }
const T  = { height: 0, kind: 'trap' }
const h  = (n, kind = 'path') => ({ height: n, kind })

/** 由字符串快速构建一行（9 列） */
function row(str) {
  return str.split(' ').map(t => {
    if (t === 'V') return { height: 0, kind: 'void' }
    if (t === 'P') return { height: 0, kind: 'path' }
    if (t === 'C') return { height: 0, kind: 'coin' }
    if (t === 'T') return { height: 0, kind: 'trap' }
    // 格式：高度+类型，例如 '1P'、'2C'
    const m = t.match(/^(\d)([PCTO])$/)
    if (m) {
      const kinds = { P: 'path', C: 'coin', T: 'trap', O: 'obstacle' }
      return { height: Number(m[1]), kind: kinds[m[2]] || 'path' }
    }
    return { height: 0, kind: 'void' }
  })
}

const VOID_ROW = row('V V V V V V V V V')
const CHAPTER = { id: 'custom-ch5', title: '创意挑战', order: 5 }

// ── 关卡数据 ──────────────────────────────────────────────────────────────────

const levels = [

  // ─────────────────────────────────────────────────────────────────────────
  // 第5-1关：方形回路
  //
  //   布局（9×9，robot★ 在 (2,6) 朝 E）
  //   y=2:  . . ● ─ ─ ─ ● . .
  //   y=3:  . . │         │ . .
  //   y=4:  . . │         │ . .
  //   y=5:  . . │         │ . .
  //   y=6:  . . ★ ─ ─ ─ ● . .
  //   ● = 金币, ─/│ = 路径
  //
  //   最优解：main: pickup left f1 right f1 right f1 right f1
  //           f1  : forward forward forward forward pickup
  //   共 14 块
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'custom-ch5-001',
    title: '第5-1关：方形回路',
    chapter: CHAPTER,
    teachingGoal: '利用 f1 子程序封装"走4步+收星"，绕方形回路收集4枚金星',
    availableBlocks: ['forward', 'turnLeft', 'turnRight', 'pickup', 'f1Call'],
    grid: [
      VOID_ROW,                                   // y=0
      VOID_ROW,                                   // y=1
      row('V V C P P P C V V'),                   // y=2
      row('V V P V V V P V V'),                   // y=3
      row('V V P V V V P V V'),                   // y=4
      row('V V P V V V P V V'),                   // y=5
      row('V V C P P P C V V'),                   // y=6  ← robot(2,6)
      VOID_ROW,                                   // y=7
      VOID_ROW,                                   // y=8
    ],
    robot: { x: 2, y: 6, z: 0, direction: 'E' },
    winCondition: { type: 'all-coins-collected' },
    constraints: { maxMainBlocks: 12, maxFunctions: 7, recommendedSteps: 29 },
    hints: [
      '先 pickup 收脚下金星，再左转出发',
      '每段路都是"走4步然后收星"——用 f1 表示这个单元',
      '走完一段就右转，再调用同一个 f1',
    ],
    sortOrder: 200,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 第5-2关：梳形收星
  //
  //   布局（robot★ 在 (2,5) 朝 N，脊梁为 y=5）
  //   y=3:  . . ● . ● . ● . .   ← 齿尖（金币）
  //   y=4:  . . │ . │ . │ . .   ← 齿身
  //   y=5:  . ★━━━━━━━━━ . .   ← 脊梁（robot从此出发）
  //
  //   最优解：main: repeat(3){ f1 forward forward turnLeft }
  //           f1  : forward forward pickup turnLeft turnLeft forward forward turnLeft
  //   共 13 块（含嵌套计数）
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'custom-ch5-002',
    title: '第5-2关：梳形收星',
    chapter: CHAPTER,
    teachingGoal: '用 f1 封装"进齿→收星→回脊"，再配合 repeat 批量完成三颗金星',
    availableBlocks: ['forward', 'turnLeft', 'turnRight', 'pickup', 'f1Call', 'repeat'],
    grid: [
      VOID_ROW,                                   // y=0
      VOID_ROW,                                   // y=1
      VOID_ROW,                                   // y=2
      row('V V C V C V C V V'),                   // y=3  ← 齿尖金币
      row('V V P V P V P V V'),                   // y=4  ← 齿身
      row('V P P P P P P P V'),                   // y=5  ← 脊梁, robot(2,5)朝N
      VOID_ROW,                                   // y=6
      VOID_ROW,                                   // y=7
      VOID_ROW,                                   // y=8
    ],
    robot: { x: 2, y: 5, z: 0, direction: 'N' },
    winCondition: { type: 'all-coins-collected' },
    constraints: { maxMainBlocks: 6, maxFunctions: 9, recommendedSteps: 36 },
    hints: [
      'f1 里：进两格收星，然后掉头回到脊梁再右转继续',
      'main 里可以用 repeat(3) 重复"f1 + 沿脊梁走两步 + 左转朝北"',
      '最后一次 repeat 走出脊梁边界没关系，robot 会原地不动',
    ],
    sortOrder: 201,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 第5-3关：阶梯天梯
  //
  //   布局（robot★ 在 (1,4) z=0 朝 E，y=4 行的楼梯）
  //   x: 1  2  3  4  5
  //      ★  ●  ●  ●  ●
  //      h0 h1 h2 h3 h4
  //
  //   最优解：main: repeat(4){ jump pickup }
  //   共 3 块！
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'custom-ch5-003',
    title: '第5-3关：阶梯天梯',
    chapter: CHAPTER,
    teachingGoal: '用 repeat + jump + pickup 三种积木征服四级天梯，体会循环的简洁之美',
    availableBlocks: ['jump', 'pickup', 'repeat'],
    grid: [
      VOID_ROW,                                                                          // y=0
      VOID_ROW,                                                                          // y=1
      VOID_ROW,                                                                          // y=2
      VOID_ROW,                                                                          // y=3
      [V, P, h(1,'coin'), h(2,'coin'), h(3,'coin'), h(4,'coin'), V, V, V],              // y=4  ← robot(1,4)朝E
      VOID_ROW,                                                                          // y=5
      VOID_ROW,                                                                          // y=6
      VOID_ROW,                                                                          // y=7
      VOID_ROW,                                                                          // y=8
    ],
    robot: { x: 1, y: 4, z: 0, direction: 'E' },
    winCondition: { type: 'all-coins-collected' },
    constraints: { maxMainBlocks: 4, maxFunctions: 0, recommendedSteps: 12 },
    hints: [
      '不用子程序！只需 3 种积木',
      '每次跳到下一级台阶后立刻收星，这个动作重复几次？',
    ],
    sortOrder: 202,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 第5-4关：双排齐收
  //
  //   布局（robot★ 在 (1,5) 朝 E）
  //   y=3:  . P P P ● ● ● P .   ← 上排，金币在 x=4,5,6，向西经过
  //   y=4:  . . . . . . . P .   ← 右侧通道 (7,4)
  //   y=5:  . ★ ● ● ● P P P .   ← 下排，金币在 x=2,3,4，向东出发
  //
  //   关键：f1 = repeat(3){forward pickup} forward forward forward
  //   两排的行进结构完全一致（一个方向3格金币+3格空路），f1 可复用！
  //
  //   最优解：main: f1 turnLeft forward forward turnLeft f1
  //   共 12 块
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'custom-ch5-004',
    title: '第5-4关：双排齐收',
    chapter: CHAPTER,
    teachingGoal: '两排路径结构完全对称，同一个 f1 子程序可以分别处理向东和向西的收集',
    availableBlocks: ['forward', 'turnLeft', 'turnRight', 'pickup', 'f1Call', 'repeat'],
    grid: [
      VOID_ROW,                                   // y=0
      VOID_ROW,                                   // y=1
      VOID_ROW,                                   // y=2
      row('V P P P C C C P V'),                   // y=3  ← 上排，金币 x=4,5,6
      row('V V V V V V V P V'),                   // y=4  ← 右侧通道 (7,4)
      row('V P C C C P P P V'),                   // y=5  ← 下排，robot(1,5)金币 x=2,3,4
      VOID_ROW,                                   // y=6
      VOID_ROW,                                   // y=7
      VOID_ROW,                                   // y=8
    ],
    robot: { x: 1, y: 5, z: 0, direction: 'E' },
    winCondition: { type: 'all-coins-collected' },
    constraints: { maxMainBlocks: 8, maxFunctions: 7, recommendedSteps: 30 },
    hints: [
      'f1 = repeat(3){forward pickup} + 走完剩余路段到达换排通道',
      '下排向东走，上排向西走——但 f1 代码完全一样！',
      'main 里只需调用两次 f1，中间加上换排的转弯和前进',
    ],
    sortOrder: 203,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 第5-5关：蛇形路径
  //
  //   布局（robot★ 在 (1,2) 朝 E，三行蛇形，15枚金币）
  //   y=2:  . ★ ● ● ● ● ● ─ .   → 向东出发，右侧通道下行
  //   y=3:  . . . . . . . P .   ← 右侧通道
  //   y=4:  . ─ ● ● ● ● ● ─ .   ← 向西经过，左侧通道下行
  //   y=5:  . P . . . . . . .   ← 左侧通道
  //   y=6:  . ─ ● ● ● ● ● ─ .   → 向东收最后一排
  //
  //   最优解：main: f1 right forward forward right f1 left forward forward left f1
  //           f1  : repeat(5){forward pickup} forward
  //   共 15 块；精髓：f1 无论朝东还是朝西都能用
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'custom-ch5-005',
    title: '第5-5关：蛇形路径',
    chapter: CHAPTER,
    teachingGoal: '三排蛇形路径，15枚金星等你全收！同一个 f1 子程序能适配向东和向西两个方向',
    availableBlocks: ['forward', 'turnLeft', 'turnRight', 'pickup', 'f1Call', 'repeat'],
    grid: [
      VOID_ROW,                                   // y=0
      VOID_ROW,                                   // y=1
      row('V P C C C C C P V'),                   // y=2  ← 第1排，robot(1,2)，金币 x=2-6
      row('V V V V V V V P V'),                   // y=3  ← 右侧通道 (7,3)
      row('V P C C C C C P V'),                   // y=4  ← 第2排，金币 x=2-6
      row('V P V V V V V V V'),                   // y=5  ← 左侧通道 (1,5)
      row('V P C C C C C P V'),                   // y=6  ← 第3排，金币 x=2-6
      VOID_ROW,                                   // y=7
      VOID_ROW,                                   // y=8
    ],
    robot: { x: 1, y: 2, z: 0, direction: 'E' },
    winCondition: { type: 'all-coins-collected' },
    constraints: { maxMainBlocks: 12, maxFunctions: 5, recommendedSteps: 52 },
    hints: [
      'f1 = repeat(5){forward pickup} + 再走一步到达通道',
      'f1 朝东和朝西都能用——robot 方向不同，forward 方向就不同',
      '第1排右转下行右转，第2排左转下行左转，注意两次换排的转弯方向',
    ],
    sortOrder: 204,
  },
]

// ── 主逻辑 ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`[import-ch5] 连接数据库 ${MONGODB_URI.replace(/\/\/[^@]+@/, '//<creds>@')} …`)
  await mongoose.connect(MONGODB_URI)
  const CodebotLevel = mongoose.model('CodebotLevel', schema, 'lightbotlevels')

  let upserted = 0, skipped = 0

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

  console.log(`\n[import-ch5] 完成！导入: ${upserted}，失败: ${skipped}`)
  await mongoose.disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
