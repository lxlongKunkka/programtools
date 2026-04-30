import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const chapterDir = process.argv[2]
if (!chapterDir) {
  console.error('Usage: node scripts/analyze_selected_chapter_problems.mjs <chapterDir> [outFile]')
  process.exit(1)
}

const outFile = process.argv[3] || path.join(__dirname, '../changelogs/chapter-problems-analysis.json')
const hydroUri = process.env.HYDRO_MONGODB_URI || process.env.MONGODB_URI

if (!hydroUri) {
  console.error('Missing HYDRO_MONGODB_URI or MONGODB_URI in server/.env')
  process.exit(1)
}

function parseProblemIds(markdown) {
  const matches = markdown.match(/-\s+`([^`]+)`/g) || []
  return matches
    .map((line) => line.match(/`([^`]+)`/)?.[1] || '')
    .filter(Boolean)
}

function parseChapterMeta(markdown, fileName) {
  const chapterId = (markdown.match(/章节 ID：\*\*\s*`([^`]+)`/) || [])[1] || ''
  const title = (markdown.match(/^#\s+(.+)$/m) || [])[1] || fileName
  return { chapterId, title }
}

function extractDocId(problemId) {
  const idx = String(problemId).indexOf(':')
  if (idx < 0) return null
  const domainId = String(problemId).slice(0, idx)
  const docId = Number(String(problemId).slice(idx + 1))
  if (!Number.isFinite(docId)) return null
  return { domainId, docId }
}

function detectTopic(title = '', tags = []) {
  const text = `${title} ${(tags || []).join(' ')}`
  if (/乘法表|图形|三角|矩形|菱形|打印/.test(text)) return '打印图形'
  if (/个位|十位|百位|数位|拆分|各位/.test(text)) return '数位分离'
  if (/嵌套|双重循环|二维遍历/.test(text)) return '循环嵌套'
  if (/while|do-while|循环|遍历|计数/.test(text)) return '循环练习'
  return '其他'
}

async function main() {
  const files = fs.readdirSync(chapterDir)
    .filter((name) => name.toLowerCase().endsWith('.md'))
    .sort((a, b) => a.localeCompare(b, 'zh-CN'))

  const chapterItems = []
  const allProblemIds = []

  for (const file of files) {
    const fullPath = path.join(chapterDir, file)
    const markdown = fs.readFileSync(fullPath, 'utf-8')
    const ids = parseProblemIds(markdown)
    const meta = parseChapterMeta(markdown, file)

    chapterItems.push({
      file,
      chapterId: meta.chapterId,
      chapterTitle: meta.title,
      problemCount: ids.length,
      problemIds: ids
    })

    allProblemIds.push(...ids)
  }

  const uniqueProblemIds = [...new Set(allProblemIds)]

  const byDomain = new Map()
  for (const pid of uniqueProblemIds) {
    const parsed = extractDocId(pid)
    if (!parsed) continue
    if (!byDomain.has(parsed.domainId)) byDomain.set(parsed.domainId, [])
    byDomain.get(parsed.domainId).push(parsed.docId)
  }

  const conn = mongoose.createConnection(hydroUri)
  const Document = conn.model('Document', new mongoose.Schema({}, { collection: 'document', strict: false }))
  await conn.asPromise()

  const docMap = new Map()
  for (const [domainId, docIds] of byDomain.entries()) {
    const docs = await Document.find({ domainId, docId: { $in: docIds } })
      .select({ docId: 1, domainId: 1, title: 1, tag: 1, nAccept: 1, nSubmit: 1 })
      .lean()

    for (const doc of docs) {
      docMap.set(`${domainId}:${doc.docId}`, doc)
    }
  }

  await conn.close()

  const enriched = uniqueProblemIds.map((pid) => {
    const doc = docMap.get(pid)
    const tags = Array.isArray(doc?.tag) ? doc.tag : []
    const title = String(doc?.title || '')
    const nAccept = Number(doc?.nAccept || 0)
    const nSubmit = Number(doc?.nSubmit || 0)
    const acRate = nSubmit > 0 ? Number((nAccept / nSubmit).toFixed(4)) : null
    return {
      problemId: pid,
      existsInHydro: Boolean(doc),
      title,
      tags,
      nAccept,
      nSubmit,
      acRate,
      inferredTopic: detectTopic(title, tags)
    }
  })

  const topicStats = {}
  for (const item of enriched) {
    const key = item.inferredTopic
    if (!topicStats[key]) topicStats[key] = { count: 0, missing: 0, avgAcRate: 0, _sumRate: 0, _rateCount: 0 }
    topicStats[key].count += 1
    if (!item.existsInHydro) topicStats[key].missing += 1
    if (typeof item.acRate === 'number') {
      topicStats[key]._sumRate += item.acRate
      topicStats[key]._rateCount += 1
    }
  }

  for (const key of Object.keys(topicStats)) {
    const s = topicStats[key]
    s.avgAcRate = s._rateCount > 0 ? Number((s._sumRate / s._rateCount).toFixed(4)) : null
    delete s._sumRate
    delete s._rateCount
  }

  const report = {
    generatedAt: new Date().toISOString(),
    chapterDir,
    summary: {
      chapterFileCount: chapterItems.length,
      totalProblemRefs: allProblemIds.length,
      uniqueProblemCount: uniqueProblemIds.length,
      duplicateCount: allProblemIds.length - uniqueProblemIds.length,
      missingInHydroCount: enriched.filter((x) => !x.existsInHydro).length
    },
    chapterItems,
    topicStats,
    problems: enriched
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2) + '\n', 'utf-8')

  console.log(`Report written: ${outFile}`)
  console.log(JSON.stringify(report.summary, null, 2))
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err))
  process.exit(1)
})
