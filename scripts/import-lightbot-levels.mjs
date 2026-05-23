/**
 * scripts/import-lightbot-levels.mjs
 * 一次性脚本：将 lightbot 源码中的 50 个官方关卡 JSON 导入 MongoDB programtools 数据库
 *
 * 用法：
 *   node scripts/import-lightbot-levels.mjs
 *   APP_MONGODB_URI=mongodb://... node scripts/import-lightbot-levels.mjs
 *
 * 需要 lightbot 源码位于 D:\webapp\lightbot（或通过 LIGHTBOT_SRC 环境变量指定）
 */

import mongoose from 'mongoose'
import { readFileSync, readdirSync, statSync } from 'fs'
import { resolve, join } from 'path'

// ── 配置 ────────────────────────────────────────────────────────────────────

const LIGHTBOT_SRC = process.env.LIGHTBOT_SRC || 'D:/webapp/lightbot/src/content/levels'
const MONGODB_URI = process.env.APP_MONGODB_URI || 'mongodb://localhost:27017/programtools'
const REMOVED_LEVEL_IDS = new Set(['swf-02-001'])

// ── Schema（与 server/models/CodebotLevel.js 保持一致）────────────────────

const schema = new mongoose.Schema(
  {
    id:           { type: String, required: true, unique: true },
    title:        { type: String, required: true },
    chapter: {
      id:    String,
      title: String,
      order: Number,
    },
    teachingGoal:    { type: String, default: '' },
    availableBlocks: [String],
    grid:            { type: mongoose.Schema.Types.Mixed, required: true },
    robot: {
      x:         Number,
      y:         Number,
      z:         { type: Number, default: 0 },
      direction: String,
    },
    winCondition: {
      type: { type: String, default: 'all-coins-collected' },
    },
    constraints: {
      maxMainBlocks:     Number,
      maxFunctions:      Number,
      recommendedSteps:  Number,
    },
    hints:     [String],
    sortOrder: { type: Number, default: 0 },
  },
  { _id: true },
)

const resultSchema = new mongoose.Schema(
  {
    userId: Number,
    username: String,
    levelId: String,
    totalCommands: Number,
    executionSteps: Number,
    solution: mongoose.Schema.Types.Mixed,
    completedAt: Date,
  },
  { _id: true },
)

// ── 工具函数 ─────────────────────────────────────────────────────────────────

function scanJsonFiles(dir) {
  const results = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      results.push(...scanJsonFiles(full))
      continue
    }
    if (!name.endsWith('.json')) continue
    try {
      const raw = readFileSync(full, 'utf-8').replace(/^\uFEFF/, '') // 去 BOM
      const data = JSON.parse(raw)
      results.push({ file: full, data })
    } catch (e) {
      console.warn(`  [skip] ${full}: ${e.message}`)
    }
  }
  return results
}

// ── 主逻辑 ───────────────────────────────────────────────────────────────────

async function main() {
  const levelsDir = resolve(LIGHTBOT_SRC)
  console.log(`[import] 扫描关卡目录: ${levelsDir}`)

  const files = scanJsonFiles(levelsDir)
  console.log(`[import] 共发现 ${files.length} 个 JSON 文件`)

  // 按文件路径排序，保证 chapter 内部顺序
  files.sort((a, b) => a.file.localeCompare(b.file))

  // 提取有效关卡（必须有 id, title, grid, robot）
  const rawLevels = files
    .map(({ file, data }) => {
      if (!data.id || !data.title || !data.grid || !data.robot) {
        console.warn(`  [skip] ${file} — 缺少必要字段 (id/title/grid/robot)`)
        return null
      }
      return data
    })
    .filter(Boolean)

  const levels = rawLevels
    .filter(level => !REMOVED_LEVEL_IDS.has(level.id))
    .map(level => ({ ...level }))

  let chapter2Index = 0
  for (const level of levels) {
    if (level.chapter?.id === 'swf-ch2') {
      chapter2Index += 1
      level.title = `第2-${chapter2Index}关`
    }
  }

  console.log(`[import] 有效关卡: ${levels.length} 个`)

  // 连接 MongoDB
  await mongoose.connect(MONGODB_URI)
  console.log(`[import] 已连接 MongoDB: ${MONGODB_URI}`)

  const CodebotLevel = mongoose.model('CodebotLevel', schema)
  const CodebotResult = mongoose.model('CodebotResult', resultSchema, 'lightbotresults')

  const officialLevelIds = levels.map(level => level.id)
  const explicitlyRemovedIds = Array.from(REMOVED_LEVEL_IDS)
  const removedNamedLevels = explicitlyRemovedIds.length > 0
    ? await CodebotLevel.deleteMany({ id: { $in: explicitlyRemovedIds } })
    : { deletedCount: 0 }
  const removedNamedResults = explicitlyRemovedIds.length > 0
    ? await CodebotResult.deleteMany({ levelId: { $in: explicitlyRemovedIds } })
    : { deletedCount: 0 }
  const staleOfficialLevels = await CodebotLevel.deleteMany({
    $and: [
      { id: { $regex: /^swf-/ } },
      { id: { $nin: officialLevelIds } },
    ],
  })
  const staleOfficialResults = await CodebotResult.deleteMany({
    $and: [
      { levelId: { $regex: /^swf-/ } },
      { levelId: { $nin: officialLevelIds } },
    ],
  })
  console.log(
    `[import] 已删除指定官方关卡: ${removedNamedLevels.deletedCount}，指定成绩: ${removedNamedResults.deletedCount}；` +
    `已删除过期官方关卡: ${staleOfficialLevels.deletedCount}，过期成绩: ${staleOfficialResults.deletedCount}`
  )

  let upserted = 0
  let skipped = 0

  for (let i = 0; i < levels.length; i++) {
    const lvl = levels[i]
    const doc = {
      id:              lvl.id,
      title:           lvl.title,
      chapter:         lvl.chapter || {},
      teachingGoal:    lvl.teachingGoal || '',
      availableBlocks: lvl.availableBlocks || [],
      grid:            lvl.grid,
      robot:           lvl.robot,
      winCondition:    lvl.winCondition || { type: 'all-coins-collected' },
      constraints:     lvl.constraints || {},
      hints:           lvl.hints || [],
      sortOrder:       i,
    }

    try {
      await CodebotLevel.findOneAndUpdate(
        { id: lvl.id },
        { $set: doc },
        { upsert: true, new: true },
      )
      console.log(`  [ok] #${String(i + 1).padStart(2, '0')} ${lvl.id}  "${lvl.title}"`)
      upserted++
    } catch (e) {
      console.error(`  [err] ${lvl.id}: ${e.message}`)
      skipped++
    }
  }

  console.log(`\n[import] 完成！导入: ${upserted}，失败: ${skipped}`)
  await mongoose.disconnect()
}

main().catch((e) => {
  console.error('[import] 致命错误:', e)
  process.exit(1)
})
