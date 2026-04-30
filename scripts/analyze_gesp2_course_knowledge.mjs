import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const level2Root = process.argv[2] || 'curriculum_export/Level2_GESP 二级 (进阶语法)'
const outFile = process.argv[3] || 'changelogs/gesp2-course-knowledge-analysis-2026-04-30.json'

const hydroUri = process.env.HYDRO_MONGODB_URI || process.env.MONGODB_URI
if (!hydroUri) {
  console.error('Missing HYDRO_MONGODB_URI or MONGODB_URI in server/.env')
  process.exit(1)
}

const GESP2_KNOWLEDGE_TAGS = ['循环嵌套', '暴力枚举', '模拟', '数学函数']
const GESP2_SET = new Set(GESP2_KNOWLEDGE_TAGS)

function walkMdFiles(dir) {
  const result = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      result.push(...walkMdFiles(full))
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      result.push(full)
    }
  }
  return result
}

function parseChapter(markdown, filePath) {
  const chapterId = (markdown.match(/章节 ID：\*\*\s*`([^`]+)`/) || [])[1] || ''
  const title = (markdown.match(/^#\s+(.+)$/m) || [])[1] || path.basename(filePath)
  const topic = (markdown.match(/所属专题：\*\*\s*([^\n]+)/) || [])[1] || ''
  const ids = [...markdown.matchAll(/-\s+`([^`]+)`/g)].map((m) => m[1]).filter(Boolean)
  return {
    file: filePath.replace(/\\/g, '/'),
    chapterId,
    chapterTitle: title,
    topic,
    problemIds: ids
  }
}

function parseProblemId(pid) {
  const idx = String(pid).indexOf(':')
  if (idx < 0) return null
  const domainId = String(pid).slice(0, idx)
  const docId = Number(String(pid).slice(idx + 1))
  if (!Number.isFinite(docId)) return null
  return { domainId, docId }
}

async function main() {
  const mdFiles = walkMdFiles(level2Root)
    .filter((p) => !p.endsWith('/README.md') && !p.endsWith('\\README.md'))

  const chapters = []
  const allProblemIds = []

  for (const file of mdFiles) {
    const text = fs.readFileSync(file, 'utf-8')
    const chapter = parseChapter(text, file)
    if (!chapter.chapterId) continue
    chapters.push(chapter)
    allProblemIds.push(...chapter.problemIds)
  }

  chapters.sort((a, b) => a.chapterId.localeCompare(b.chapterId, 'zh-CN'))

  const uniqueProblemIds = [...new Set(allProblemIds)]
  const byDomain = new Map()
  for (const pid of uniqueProblemIds) {
    const parsed = parseProblemId(pid)
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
      .select({ docId: 1, domainId: 1, title: 1, tag: 1, nAccept: 1, nSubmit: 1, content: 1 })
      .lean()
    for (const doc of docs) {
      docMap.set(`${domainId}:${doc.docId}`, doc)
    }
  }

  await conn.close()

  const chapterMap = new Map()
  for (const ch of chapters) {
    for (const pid of ch.problemIds) {
      if (!chapterMap.has(pid)) chapterMap.set(pid, [])
      chapterMap.get(pid).push({ chapterId: ch.chapterId, chapterTitle: ch.chapterTitle, topic: ch.topic })
    }
  }

  const problems = uniqueProblemIds.map((pid) => {
    const doc = docMap.get(pid)
    const tags = Array.isArray(doc?.tag) ? doc.tag : []
    const matchedKnowledgeTags = tags.filter((t) => GESP2_SET.has(t))
    const nAccept = Number(doc?.nAccept || 0)
    const nSubmit = Number(doc?.nSubmit || 0)
    const acRate = nSubmit > 0 ? Number((nAccept / nSubmit).toFixed(4)) : null
    return {
      problemId: pid,
      title: String(doc?.title || ''),
      tags,
      matchedKnowledgeTags,
      isMatchedByKnowledgeTags: matchedKnowledgeTags.length > 0,
      acRate,
      chapterBindings: chapterMap.get(pid) || [],
      contentPreview: String(doc?.content || '').replace(/\s+/g, ' ').slice(0, 120)
    }
  })

  const matched = problems.filter((p) => p.isMatchedByKnowledgeTags)
  const unmatched = problems.filter((p) => !p.isMatchedByKnowledgeTags)

  const perTagCounts = {}
  for (const t of GESP2_KNOWLEDGE_TAGS) perTagCounts[t] = 0
  for (const p of problems) {
    for (const t of p.matchedKnowledgeTags) perTagCounts[t] += 1
  }

  const topicStats = {}
  for (const p of problems) {
    for (const b of p.chapterBindings) {
      const topic = b.topic || '未分类'
      if (!topicStats[topic]) {
        topicStats[topic] = {
          total: 0,
          matchedByKnowledgeTags: 0,
          unmatchedByKnowledgeTags: 0
        }
      }
      topicStats[topic].total += 1
      if (p.isMatchedByKnowledgeTags) topicStats[topic].matchedByKnowledgeTags += 1
      else topicStats[topic].unmatchedByKnowledgeTags += 1
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    level2Root,
    gesp2KnowledgeTags: GESP2_KNOWLEDGE_TAGS,
    summary: {
      totalChapterFiles: chapters.length,
      totalProblemRefs: allProblemIds.length,
      uniqueProblemCount: uniqueProblemIds.length,
      matchedByKnowledgeTags: matched.length,
      unmatchedByKnowledgeTags: unmatched.length
    },
    perTagCounts,
    topicStats,
    matchedProblems: matched,
    unmatchedSample: unmatched.slice(0, 60)
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2) + '\n', 'utf-8')

  console.log(`Report written: ${outFile}`)
  console.log(JSON.stringify(report.summary, null, 2))
  console.log('perTagCounts=', JSON.stringify(perTagCounts, null, 2))
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err))
  process.exit(1)
})
