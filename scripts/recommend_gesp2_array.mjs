/**
 * 推荐 GESP 二级 (C++) 一维数组入门候选题目（入门级，避开三级已用题）。
 * 输出 changelogs/gesp2-array-recommend.json
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

const TARGETS = [
  {
    chapterId: 'cpp-2-6-1',
    chapterTitle: '数组的定义与初始化',
    keywords: ['一维数组', '数组'],
    textHints: ['数组', '下标'],
    negative: ['DP', 'BFS', 'DFS', '图论', '最短路', 'STL', '递归', '分治', '二分', '前缀和', '差分']
  },
  {
    chapterId: 'cpp-2-6-2',
    chapterTitle: '数组的输入与输出',
    keywords: ['一维数组', '数组', '逆序输出', '反向'],
    textHints: ['数组', '逆序', '反向输出', '依次输入'],
    negative: ['DP', 'BFS', 'DFS', '图论', '最短路', '递归', '分治', '二分', '前缀和', '差分']
  },
  {
    chapterId: 'cpp-2-6-3',
    chapterTitle: '数组遍历：求和与最值',
    keywords: ['一维数组', '数组', '最大', '最小', '求和'],
    textHints: ['求和', '总和', '最大', '最小'],
    negative: ['DP', 'BFS', 'DFS', '图论', '排序', '递归', '前缀和', '差分', '二分']
  }
]

const courseLevelSchema = new mongoose.Schema({}, { collection: 'courselevels', strict: false })

function extractZh(content) {
  if (!content) return ''
  let s = String(content)
  try { const o = JSON.parse(s); if (o && typeof o === 'object') s = o.zh || o.en || '' } catch {}
  return s
}

async function main() {
  const appConn = mongoose.createConnection(APP_URI)
  const CourseLevel = appConn.model('CourseLevel', courseLevelSchema)
  await appConn.asPromise()
  // 收集 C++ Level 1..3 全部已用题，避免推三级已绑定题
  const levels = await CourseLevel.find({ level: { $gte: 1, $lte: 3 } }).lean()
  const usedPids = new Set()
  for (const lv of levels) {
    if (/Python/i.test(lv.group || '') || /Python/i.test(lv.subject || '')) continue
    for (const t of lv.topics || [])
      for (const c of t.chapters || []) {
        for (const p of c.problemIds || []) usedPids.add(p)
        for (const p of c.optionalProblemIds || []) usedPids.add(p)
      }
  }
  await appConn.close()
  console.log(`Excluding ${usedPids.size} pids already in C++ L1-L3`)

  const hydroConn = mongoose.createConnection(HYDRO_URI)
  const Document = hydroConn.model('Document', new mongoose.Schema({}, { collection: 'document', strict: false }))
  await hydroConn.asPromise()
  const domains = ['gesp1', 'gesp2', 'gesp3', 'Level1', 'Level2', 'atcoder']
  const docs = await Document.find({ domainId: { $in: domains } })
    .select({ docId: 1, domainId: 1, title: 1, tag: 1, nAccept: 1, nSubmit: 1, content: 1 }).lean()
  await hydroConn.close()
  console.log(`Loaded ${docs.length} docs`)

  function score(doc, target) {
    const tags = (doc.tag || []).map(t => String(t).toLowerCase())
    const title = String(doc.title || '').toLowerCase()
    const text = extractZh(doc.content).slice(0, 1500).toLowerCase()
    let s = 0
    // tag 命中要求 - 数组类 tag 必须命中至少一个，否则直接 0
    const hasArrayTag = tags.some(t => /数组|一维数组/.test(t))
    if (!hasArrayTag) return 0
    s += 5
    for (const kw of target.keywords) {
      const k = kw.toLowerCase()
      if (tags.some(t => t.includes(k) || k.includes(t))) s += 2
      if (title.includes(k)) s += 1
    }
    for (const h of target.textHints || []) {
      if (text.includes(h.toLowerCase())) s += 1
    }
    for (const n of target.negative || []) {
      const nk = n.toLowerCase()
      if (tags.some(t => t === nk) || title.includes(nk)) s -= 3
    }
    if (doc.domainId === 'gesp2') s += 2
    else if (doc.domainId === 'gesp1' || doc.domainId === 'Level1') s += 1
    else if (doc.domainId === 'gesp3' || doc.domainId === 'Level2') s -= 1
    return s
  }

  const result = { generatedAt: new Date().toISOString(), targets: [] }
  for (const target of TARGETS) {
    const ranked = docs
      .map(d => {
        const pid = `${d.domainId}:${d.docId}`
        if (usedPids.has(pid)) return null
        const sc = score(d, target)
        if (sc < 5) return null
        return {
          pid, title: d.title, tags: d.tag || [],
          acRate: d.nSubmit ? Number((d.nAccept / d.nSubmit).toFixed(3)) : null,
          score: sc,
          preview: extractZh(d.content).replace(/\s+/g, ' ').slice(0, 180)
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || (b.acRate || 0) - (a.acRate || 0))
      .slice(0, 20)
    result.targets.push({
      chapterId: target.chapterId,
      chapterTitle: target.chapterTitle,
      candidateCount: ranked.length,
      candidates: ranked
    })
    console.log(`[${target.chapterId}] ${target.chapterTitle}: ${ranked.length} candidates`)
  }

  const outPath = path.join(__dirname, '..', 'changelogs', 'gesp2-array-recommend.json')
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2))
  console.log(`Wrote ${outPath}`)
}

main().catch(e => { console.error(e); process.exit(1) })
