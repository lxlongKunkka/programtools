/**
 * dump_course_level2_problems.mjs
 * 从数据库 CourseLevel 集合读取 Level2 GESP 课程的完整章节与题号，
 * 再从 Hydro document 集合拉取题目标题和标签，输出完整分析报告。
 *
 * 用法（在服务器上）：
 *   node scripts/dump_course_level2_problems.mjs
 *   node scripts/dump_course_level2_problems.mjs --level=2 --out=changelogs/course-level2-db-analysis.json
 */
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const APP_URI = process.env.APP_MONGODB_URI || 'mongodb://localhost:27017/programtools'
const HYDRO_URI = process.env.HYDRO_MONGODB_URI || process.env.MONGODB_URI

function getArg(name, fallback = '') {
  const prefix = `--${name}=`
  const match = process.argv.find((a) => a.startsWith(prefix))
  return match ? match.slice(prefix.length) : fallback
}

const targetLevel = Number(getArg('level', '2')) || 2
const outFile = getArg('out', `changelogs/course-level${targetLevel}-db-analysis.json`)

const chapterSchema = new mongoose.Schema({
  id: String, title: String, content: String,
  problemIds: [String], optionalProblemIds: [String],
  homeworkIds: [String], examIds: [String], videoUrl: String
}, { _id: false })

const topicSchema = new mongoose.Schema({
  title: String, description: String, chapters: [chapterSchema]
}, { _id: false })

const courseLevelSchema = new mongoose.Schema({
  level: Number, group: String, label: String, subject: String,
  title: String, description: String, topics: [topicSchema]
}, { collection: 'courselevels' })

function parseProblemId(pid) {
  const str = String(pid || '')
  const idx = str.indexOf(':')
  if (idx < 0) return null
  const domainId = str.slice(0, idx)
  const docId = Number(str.slice(idx + 1))
  return Number.isFinite(docId) ? { domainId, docId } : null
}

async function main() {
  const appConn = mongoose.createConnection(APP_URI)
  const CourseLevel = appConn.model('CourseLevel', courseLevelSchema)
  await appConn.asPromise()

  const levels = await CourseLevel.find({ level: targetLevel }).sort({ level: 1, group: 1 }).lean()
  if (!levels.length) {
    const all = await CourseLevel.distinct('level')
    console.error(`No level=${targetLevel} found. Available: ${all.sort().join(', ')}`)
    process.exit(1)
  }

  const chapterItems = []
  const allProblemIds = []

  for (const lv of levels) {
    const topics = lv.topics || []
    for (const topic of topics) {
      for (const ch of (topic.chapters || [])) {
        const ids = [...(ch.problemIds || []), ...(ch.optionalProblemIds || [])]
        chapterItems.push({
          levelTitle: lv.title,
          group: lv.group || '',
          topicTitle: topic.title,
          chapterId: ch.id,
          chapterTitle: ch.title,
          problemCount: (ch.problemIds || []).length,
          optionalCount: (ch.optionalProblemIds || []).length,
          problemIds: ch.problemIds || [],
          optionalProblemIds: ch.optionalProblemIds || []
        })
        allProblemIds.push(...ids)
      }
    }
  }

  const uniqueProblemIds = [...new Set(allProblemIds)]
  const dupCount = allProblemIds.length - uniqueProblemIds.length

  await appConn.close()

  const byDomain = new Map()
  for (const pid of uniqueProblemIds) {
    const parsed = parseProblemId(pid)
    if (!parsed) continue
    if (!byDomain.has(parsed.domainId)) byDomain.set(parsed.domainId, [])
    byDomain.get(parsed.domainId).push(parsed.docId)
  }

  const docMap = new Map()
  if (HYDRO_URI && byDomain.size > 0) {
    const hydroConn = mongoose.createConnection(HYDRO_URI)
    const Document = hydroConn.model('Document', new mongoose.Schema({}, { collection: 'document', strict: false }))
    await hydroConn.asPromise()
    for (const [domainId, docIds] of byDomain.entries()) {
      const docs = await Document.find({ domainId, docId: { $in: docIds } })
        .select({ docId: 1, domainId: 1, title: 1, tag: 1, nAccept: 1, nSubmit: 1 })
        .lean()
      for (const doc of docs) docMap.set(`${domainId}:${doc.docId}`, doc)
    }
    await hydroConn.close()
  }

  const problems = uniqueProblemIds.map((pid) => {
    const doc = docMap.get(pid)
    const tags = Array.isArray(doc?.tag) ? doc.tag : []
    const nA = Number(doc?.nAccept || 0)
    const nS = Number(doc?.nSubmit || 0)
    return {
      problemId: pid,
      title: String(doc?.title || ''),
      tags,
      acRate: nS > 0 ? Number((nA / nS).toFixed(4)) : null,
      existsInHydro: Boolean(doc)
    }
  })

  const pidMap = new Map(problems.map((p) => [p.problemId, p]))

  const chapterAnalysis = chapterItems.map((ch) => {
    const rates = ch.problemIds.map((id) => pidMap.get(id)?.acRate).filter((v) => typeof v === 'number')
    const avgAcRate = rates.length ? Number((rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(4)) : null
    return { ...ch, avgAcRate }
  })

  const report = {
    generatedAt: new Date().toISOString(),
    targetLevel,
    summary: {
      levelDocCount: levels.length,
      totalChapters: chapterItems.length,
      totalProblemRefs: allProblemIds.length,
      uniqueProblemCount: uniqueProblemIds.length,
      duplicateCount: dupCount,
      missingInHydro: problems.filter((p) => !p.existsInHydro).length
    },
    chapterAnalysis,
    problems
  }

  fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true })
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2) + '\n', 'utf-8')
  console.log(`Report written: ${outFile}`)
  console.log(JSON.stringify(report.summary, null, 2))
  console.log('\n章节题目数量：')
  for (const ch of chapterAnalysis) {
    console.log(`  [${ch.chapterId || '-'}] ${ch.chapterTitle} — 必做:${ch.problemCount} 选做:${ch.optionalCount} 均通过率:${ch.avgAcRate ?? 'N/A'}`)
  }
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err))
  process.exit(1)
})
