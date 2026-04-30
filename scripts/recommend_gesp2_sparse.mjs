/**
 * 为 GESP 二级 (C++) 稀疏章节推荐题目。
 * 在 hydro 题库中按 (1) tag 匹配 + (2) 标题/正文关键词扫描，对每个目标章节生成候选 Top-N。
 * 用法：node scripts/recommend_gesp2_sparse.mjs --out=changelogs/gesp2-sparse-recommend.json
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
  const m = process.argv.find(a => a.startsWith(prefix))
  return m ? m.slice(prefix.length) : fallback
}

const outFile = getArg('out', 'changelogs/gesp2-sparse-recommend.json')
const TOP_N = Number(getArg('top', '15'))

// 章节配置：每章定义 keyword（用于 tag 匹配）和 textHints（标题/正文 substring）和 negative 排除词
const TARGETS = [
  {
    chapterId: 'cpp-2-2-1',
    chapterTitle: 'max / min 与比较函数',
    keywords: ['max', 'min', '比较', '最大', '最小', '极值'],
    textHints: ['最大', '最小', 'max', 'min', '比较'],
    negative: ['排序', 'STL', '数组', '区间', 'DP', '搜索', '图', '树', '递归']
  },
  {
    chapterId: 'cpp-2-2-3',
    chapterTitle: 'floor / ceil / round 取整函数',
    keywords: ['floor', 'ceil', 'round', '取整', '四舍五入', '向上取整', '向下取整'],
    textHints: ['四舍五入', '取整', 'floor', 'ceil', 'round', '向上取整', '向下取整'],
    negative: ['排序', '数组', 'DP', '搜索', '图', '树']
  },
  {
    chapterId: 'cpp-2-3-1',
    chapterTitle: 'ASCII 编码表与字符读取',
    keywords: ['ASCII', '字符', '字符串', '编码'],
    textHints: ['ASCII', '字符', "'A'", "'a'", '字母', '编码值'],
    negative: ['排序', '动态规划', 'DP', 'BFS', 'DFS', '图论', '树', '数组', 'STL', '哈希', '前缀和', '差分']
  },
  {
    chapterId: 'cpp-2-3-3',
    chapterTitle: '字符判断与大小写转换',
    keywords: ['字符', '大小写', 'isalpha', 'isdigit', 'tolower', 'toupper', '字母'],
    textHints: ['大小写', 'tolower', 'toupper', 'isalpha', 'isdigit', '大写', '小写', '字母', '数字字符'],
    negative: ['排序', 'DP', 'BFS', 'DFS', '图论', '树', '数组', 'STL']
  },
  {
    chapterId: 'cpp-2-5-1',
    chapterTitle: '单层枚举基础',
    keywords: ['暴力枚举', '枚举', 'gesp2', 'gesp3'],
    textHints: ['枚举'],
    negative: ['DP', 'BFS', 'DFS', '图论', '树', '哈希', '排序', '数组', '前缀和']
  },
  {
    chapterId: 'cpp-2-5-2',
    chapterTitle: '双重枚举与三重枚举',
    keywords: ['暴力枚举', '枚举', '循环嵌套', 'gesp2', 'gesp3'],
    textHints: ['枚举', '组合', '配对'],
    negative: ['DP', 'BFS', 'DFS', '图论', '树', '哈希', '排序', '前缀和']
  },
  {
    chapterId: 'cpp-2-5-3',
    chapterTitle: '枚举综合例题',
    keywords: ['暴力枚举', '枚举', '模拟', '循环嵌套', 'gesp2', 'gesp3'],
    textHints: ['枚举'],
    negative: ['DP', 'BFS', 'DFS', '图论', '树', '哈希', '前缀和', '差分', '二分']
  }
]

const chapterSchema = new mongoose.Schema({}, { _id: false, strict: false })
const topicSchema = new mongoose.Schema({}, { _id: false, strict: false })
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

  const levels = await CourseLevel.find({ level: { $gte: 1, $lte: 4 } }).lean()
  // collect ALL pids used by any C++ level 1..4 to avoid recommending those already in use
  const usedPids = new Set()
  for (const lv of levels) {
    if (/Python/i.test(lv.group || '') || /Python/i.test(lv.subject || '')) continue
    for (const t of lv.topics || []) {
      for (const c of t.chapters || []) {
        for (const pid of c.problemIds || []) usedPids.add(pid)
        for (const pid of c.optionalProblemIds || []) usedPids.add(pid)
      }
    }
  }
  await appConn.close()

  const hydroConn = mongoose.createConnection(HYDRO_URI)
  const Document = hydroConn.model('Document', new mongoose.Schema({}, { collection: 'document', strict: false }))
  await hydroConn.asPromise()

  // 仅检索 docType=10 (题目) 的文档；按 GESP 难度限制：domain 为 gesp1/gesp2/gesp3/Level1/Level2/atcoder
  const domains = ['gesp1', 'gesp2', 'gesp3', 'Level1', 'Level2', 'atcoder']
  const docs = await Document.find({
    domainId: { $in: domains },
    title: { $exists: true }
  }).select({ docId: 1, domainId: 1, title: 1, tag: 1, nAccept: 1, nSubmit: 1, content: 1 }).lean()
  await hydroConn.close()

  console.log(`Loaded ${docs.length} candidate docs from domains ${domains.join(',')}`)

  function score(doc, target) {
    const tags = (doc.tag || []).map(t => String(t).toLowerCase())
    const title = String(doc.title || '').toLowerCase()
    const text = extractZh(doc.content).slice(0, 1500).toLowerCase()
    let s = 0
    for (const kw of target.keywords) {
      const k = kw.toLowerCase()
      if (tags.some(t => t.includes(k) || k.includes(t))) s += 3
      if (title.includes(k)) s += 2
    }
    for (const h of target.textHints || []) {
      if (text.includes(h.toLowerCase())) s += 1
    }
    for (const n of target.negative || []) {
      const nk = n.toLowerCase()
      if (tags.some(t => t === nk) || title.includes(nk)) s -= 2
    }
    // 域权重：gesp2 优先，其次 gesp1/Level1，最后 atcoder/Level2/gesp3 (难度较高的减分)
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
        if (sc < 3) return null
        return {
          pid, title: d.title, tags: d.tag || [],
          acRate: d.nSubmit ? Number((d.nAccept / d.nSubmit).toFixed(3)) : null,
          score: sc,
          preview: extractZh(d.content).replace(/\s+/g, ' ').slice(0, 180)
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || (b.acRate || 0) - (a.acRate || 0))
      .slice(0, TOP_N)
    result.targets.push({
      chapterId: target.chapterId,
      chapterTitle: target.chapterTitle,
      candidateCount: ranked.length,
      candidates: ranked
    })
    console.log(`  [${target.chapterId}] ${target.chapterTitle}: ${ranked.length} candidates`)
  }

  const outPath = path.isAbsolute(outFile) ? outFile : path.join(__dirname, '..', outFile)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2))
  console.log(`Wrote ${outPath}`)
}

main().catch(e => { console.error(e); process.exit(1) })
