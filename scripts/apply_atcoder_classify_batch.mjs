// 通用：把 atcoder 分类批次文件中的 pid 加入对应章节的 optionalProblemIds
// 用法： node scripts/apply_atcoder_classify_batch.mjs --batch=changelogs/atcoder-classify-batch-0001.json [--apply]
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const APPLY = process.argv.includes('--apply')
const argBatch = process.argv.find(a => a.startsWith('--batch='))
if (!argBatch) { console.error('Missing --batch=changelogs/atcoder-classify-batch-XXXX.json'); process.exit(2) }
const batchPath = argBatch.split('=')[1]
const data = JSON.parse(fs.readFileSync(batchPath, 'utf8'))
const defaultKind = data.kind || 'O'  // 'R' or 'O'

// chapterId 形如 cpp-{level}-{topicIdx}-{chapterIdx}（仅前两位用于路由）
function levelOf(chapterId) {
  const m = chapterId.match(/^cpp-(\d+)-/)
  return m ? Number(m[1]) : null
}

async function main() {
  const conn = mongoose.createConnection(process.env.APP_MONGODB_URI)
  const CL = conn.model('CourseLevel', new mongoose.Schema({}, { collection: 'courselevels', strict: false }))
  await conn.asPromise()

  // 收集已用 pid（problemIds + optionalProblemIds 全 cpp 课程）以避免跨章重复
  const allCpp = await CL.find({ group: /C\+\+/ }).lean()
  const used = new Set()
  for (const lv of allCpp) for (const t of lv.topics||[]) for (const c of t.chapters||[]) {
    for (const id of c.problemIds||[]) used.add(id)
    for (const id of c.optionalProblemIds||[]) used.add(id)
  }

  // 按 level 分组
  const byLevel = new Map()
  for (const a of data.assignments) {
    const lv = levelOf(a.chapterId)
    if (!lv) { console.warn(`skip bad chapterId ${a.chapterId}`); continue }
    if (!byLevel.has(lv)) byLevel.set(lv, [])
    byLevel.get(lv).push(a)
  }

  let totalAdded = 0, totalSkipped = 0
  for (const [level, items] of byLevel.entries()) {
    const lv = await CL.findOne({ level, group: /C\+\+/ })
    if (!lv) { console.warn(`Level ${level} not found, skip`); continue }
    let touched = 0
    // 建 chapter 索引
    const chapterRef = new Map()
    for (const t of lv.topics||[]) for (const c of t.chapters||[]) chapterRef.set(c.id, c)
    for (const a of items) {
      const c = chapterRef.get(a.chapterId)
      if (!c) { console.warn(`L${level} chapter ${a.chapterId} not found, skip ${a.pid}`); totalSkipped++; continue }
      if (used.has(a.pid)) { console.log(`L${level} [${a.chapterId}] SKIP ${a.pid} (already linked)`); totalSkipped++; continue }
      const kind = a.kind || defaultKind
      const field = kind === 'R' ? 'problemIds' : 'optionalProblemIds'
      c[field] = [...(c[field]||[]), a.pid]
      used.add(a.pid)
      console.log(`L${level} [${a.chapterId}] +${kind} ${a.pid}  -- ${a.title || ''}`)
      totalAdded++
      touched++
    }
    if (APPLY && touched) { lv.markModified('topics'); await lv.save(); console.log(`  L${level} saved (${touched} chapters touched)`) }
  }

  console.log(`\nTotal: added=${totalAdded} skipped=${totalSkipped}`)
  if (!APPLY) console.log('[DRY-RUN] rerun with --apply')
  await conn.close()
}
main().catch(e=>{console.error(e);process.exit(1)})
