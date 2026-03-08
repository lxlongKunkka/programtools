/**
 * recommend_atcoder_problems.js
 *
 * 功能：根据 AtCoder 域题目的 tag，为课程各章节推荐匹配的题目。
 *
 * 执行前提：已对 atcoder 域的题目打好 tag。
 *
 * 使用方式：
 *   node scripts/recommend_atcoder_problems.js
 *   node scripts/recommend_atcoder_problems.js --apply   ← 将推荐写入 MongoDB
 *   node scripts/recommend_atcoder_problems.js --min-score 2  ← 调整最低匹配分
 *
 * 输出：
 *   - 控制台打印摘要
 *   - scripts/atcoder_recommendations.json（完整推荐结果）
 */

import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// ── 路径 & 环境变量 ──────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../server/.env') })

const HYDRO_URI = process.env.HYDRO_MONGODB_URI || process.env.MONGODB_URI
const APP_URI   = process.env.APP_MONGODB_URI   || process.env.MONGODB_URI

// ── 参数 ────────────────────────────────────────────────────────
const APPLY      = process.argv.includes('--apply')      // 写入 DB
const MIN_SCORE  = (() => {
  const idx = process.argv.indexOf('--min-score')
  return idx !== -1 ? parseInt(process.argv[idx + 1]) || 1 : 1
})()
const TOP_N_REQUIRED = 5   // 每章最多推荐为"必做"的数量
const TOP_N_OPTIONAL = 3   // 每章最多推荐为"选做"的数量
const ATCODER_DOMAIN = 'atcoder'

// ── Schema（轻量，不引入完整 model 文件以避免双连接问题）────────
const documentSchema = new mongoose.Schema({}, { collection: 'document', strict: false })
const chapterSchema  = new mongoose.Schema({
  id: String,
  title: String,
  problemIds: [String],
  optionalProblemIds: [String],
}, { _id: false })
const topicSchema = new mongoose.Schema({
  title: String,
  chapters: [chapterSchema],
}, { _id: false })
const courseLevelSchema = new mongoose.Schema({
  level: Number,
  title: String,
  topics: [topicSchema],
}, { collection: 'courseLevel', strict: false })

// ── 关键词提取辅助 ──────────────────────────────────────────────
/**
 * 从章节 ID / 标题 / 专题标题中提取匹配关键词列表。
 * 优先使用 KEYWORD_MAP 中的精确映射；不在映射中则自动切词。
 */
const KEYWORD_MAP = {
  // Level 1-4 基础语法（通常不需要 AtCoder 题目，可留空）

  // Level 5 数论与效率
  '质数':        ['质数', '素数', '质因数'],
  '素数':        ['质数', '素数'],
  '埃氏筛':      ['质数', '素数', '筛法'],
  '线性筛':      ['质数', '素数', '筛法'],
  'GCD':         ['GCD', 'LCM', '最大公约数', '最小公倍数', '辗转相除'],
  'LCM':         ['LCM', 'GCD', '最小公倍数'],
  '质因数':      ['质因数', '质数', '分解'],
  '快速幂':      ['快速幂', '幂次', '模幂'],
  '高精度':      ['高精度', '大数'],
  '贪心':        ['贪心'],
  '前缀和':      ['前缀和', '差分'],
  '差分':        ['差分', '前缀和'],
  '二分':        ['二分', '二分查找', '二分答案'],
  '递归':        ['递归', '分治'],
  '分治':        ['分治', '递归'],
  '双指针':      ['双指针', '滑动窗口', '尺取'],
  '三分':        ['三分', '三分查找'],
  'STL':         ['STL', '容器'],
  '链表':        ['链表'],

  // Level 6 数据结构
  '栈':          ['栈', 'stack'],
  '队列':        ['队列', 'queue'],
  '树':          ['树', '二叉树'],
  'DFS':         ['DFS', '深度优先', '深搜'],
  'BFS':         ['BFS', '广度优先', '广搜'],
  'DP':          ['DP', '动态规划'],
  '动态规划':    ['DP', '动态规划'],
  '哈夫曼':      ['哈夫曼', '最优编码'],
  '线性DP':      ['DP', '线性DP', '动态规划'],
  '背包':        ['背包', 'DP', '动态规划'],

  // Level 7 图论与进阶DP
  '图论':        ['图论', '图', '最短路', '连通图'],
  '树状数组':    ['树状数组', 'BIT', 'Fenwick'],
  '哈希':        ['哈希', 'hash'],
  '区间DP':      ['区间DP', 'DP', '区间动态规划'],
  '树上DP':      ['树形DP', '树上DP', 'DP'],
  '树形DP':      ['树形DP', '树上DP', 'DP'],
  '二维DP':      ['二维DP', 'DP'],
  '表达式':      ['表达式', '计算器'],

  // Level 8 综合巅峰
  '最短路':      ['最短路', 'Dijkstra', 'SPFA', 'Bellman'],
  'Dijkstra':    ['Dijkstra', '最短路'],
  'SPFA':        ['SPFA', '最短路', 'Bellman-Ford'],
  'Floyd':       ['Floyd', '多源最短路', '最短路'],
  '最小生成树':  ['最小生成树', 'MST', 'Kruskal', 'Prim'],
  'MST':         ['最小生成树', 'MST'],
  '线段树':      ['线段树', '区间查询', '区间修改'],
  '并查集':      ['并查集', 'DSU', 'Union-Find'],
  '带权并查集':  ['并查集', 'DSU', '带权'],
  '扩展并查集':  ['并查集', 'DSU', '带权', '扩展'],
  '优先队列':    ['优先队列', '堆', '堆排序'],
  '拓扑排序':    ['拓扑', '拓扑排序', 'DAG'],
  'LCA':         ['LCA', '最近公共祖先', '树'],
  '树链剖分':    ['树链剖分', 'HLD', '轻重链剖分'],  // (L9)
  '树直径':      ['树的直径', '树', '直径'],
  '树重心':      ['树的重心', '树', '重心'],
  '树上差分':    ['树上差分', '差分', '树'],
  '离散化':      ['离散化'],
  'ST表':        ['ST表', '稀疏表', 'RMQ'],
  '差分约束':    ['差分约束', '最短路'],

  // Level 9 CSP-S 竞赛基础
  'KMP':         ['KMP', '字符串匹配', '模式匹配'],
  'Z函数':       ['Z函数', 'Z-algorithm', '字符串'],
  'Trie':        ['Trie', '字典树', '前缀树'],
  'AC自动机':    ['AC自动机', 'Aho-Corasick', '多模匹配'],
  'Manacher':    ['Manacher', '回文串', '最长回文'],
  '状压DP':      ['状压DP', '状态压缩', 'bitmask DP'],
  '数位DP':      ['数位DP', 'digit DP'],
  '概率':        ['概率', '期望', '概率DP'],
  '期望':        ['期望', '概率', '期望DP'],
  '换根DP':      ['换根DP', '树形DP', 'rerooting'],
  '分块':        ['分块', '根号分治'],
  '莫队':        ['莫队', '离线'],
  'CDQ':         ['CDQ', '陈丹琦', '分治'],
  'Tarjan':      ['Tarjan', 'SCC', '强连通分量', '割点', '割边', '桥'],
  '网络流':      ['网络流', '最大流', '最小割', 'max-flow'],
  '矩阵快速幂':  ['矩阵快速幂', '矩阵乘法', '快速幂'],

  // Level 10 NOI 提高
  '后缀数组':    ['后缀数组', 'SA', '后缀'],
  'SAM':         ['SAM', '后缀自动机', '字符串'],
  '可持久化':    ['可持久化', '主席树', '函数式线段树'],
  'LCT':         ['LCT', 'Link-Cut Tree', '动态树'],
  '点分治':      ['点分治', '树上分治'],
  'DSU on Tree': ['DSU on Tree', '树上启发式合并'],
  '虚树':        ['虚树'],
  'FFT':         ['FFT', 'NTT', '多项式', '快速傅里叶'],
  'NTT':         ['NTT', 'FFT', '多项式'],
  '莫比乌斯':    ['莫比乌斯', 'Möbius', '反演'],
}

/**
 * 从章节标题和专题标题中提取查询关键词列表（去重）
 */
function extractKeywords(topicTitle, chapterTitle) {
  const combined = `${topicTitle} ${chapterTitle}`
  const keywords = new Set()

  // 先用精确映射
  for (const [key, vals] of Object.entries(KEYWORD_MAP)) {
    if (combined.includes(key)) {
      vals.forEach(v => keywords.add(v))
    }
  }

  // 补充：把中文词直接加入（2字以上的连续汉字词组）
  const chineseWords = combined.match(/[\u4e00-\u9fa5A-Za-z0-9\-\_\.]{2,}/g) || []
  for (const w of chineseWords) {
    // 过滤掉常见无意义词
    const stopWords = ['基础', '进阶', '应用', '专题', '入门', '练习', '综合', '例题', '与', '和', '的']
    if (!stopWords.includes(w)) keywords.add(w)
  }

  return [...keywords]
}

/**
 * 计算一道题目与关键词列表的匹配分数
 */
function scoreDoc(doc, keywords) {
  if (!doc.tag || doc.tag.length === 0) return 0
  const docTags = doc.tag.map(t => t.toLowerCase())
  let score = 0
  for (const kw of keywords) {
    const kwLower = kw.toLowerCase()
    for (const tag of docTags) {
      if (tag.includes(kwLower) || kwLower.includes(tag)) {
        score++
        break
      }
    }
  }
  return score
}

// ── 主逻辑 ──────────────────────────────────────────────────────
async function main() {
  console.log('🔌 连接数据库...')
  const hydroConn = await mongoose.createConnection(HYDRO_URI).asPromise()
  const appConn   = await mongoose.createConnection(APP_URI).asPromise()

  const DocumentModel     = hydroConn.model('Document', documentSchema)
  const CourseLevelModel  = appConn.model('CourseLevel', courseLevelSchema)

  // 1. 读取所有已打 tag 的 AtCoder 题目
  console.log(`📥 读取 AtCoder 域已打标签的题目...`)
  const atcoderDocs = await DocumentModel.find(
    { domainId: ATCODER_DOMAIN, tag: { $exists: true, $not: { $size: 0 } } },
    { docId: 1, pid: 1, title: 1, tag: 1, domainId: 1 }
  ).lean()
  console.log(`   找到 ${atcoderDocs.length} 道已打标签的 AtCoder 题目`)

  if (atcoderDocs.length === 0) {
    console.warn('⚠️  没有找到已打标签的 AtCoder 题目，请先完成打标签工作。')
    await hydroConn.close()
    await appConn.close()
    return
  }

  // 2. 读取所有课程章节
  console.log('📚 读取课程章节...')
  const levels = await CourseLevelModel.find({}, { level: 1, title: 1, topics: 1 }).lean()
  console.log(`   找到 ${levels.length} 个等级\n`)

  // 3. 为每个章节生成推荐
  const recommendations = {}
  let totalChapters = 0
  let chaptersNeedingProblems = 0

  for (const level of levels.sort((a, b) => a.level - b.level)) {
    for (const topic of (level.topics || [])) {
      for (const chapter of (topic.chapters || [])) {
        totalChapters++
        const chapterId = chapter.id
        const existingRequired = (chapter.problemIds || []).filter(p => p.includes(ATCODER_DOMAIN))
        const existingOptional  = (chapter.optionalProblemIds || []).filter(p => p.includes(ATCODER_DOMAIN))

        const keywords = extractKeywords(topic.title || '', chapter.title || '')
        if (keywords.length === 0) continue

        // 对所有已打标签的 AtCoder 题目打分
        const scored = atcoderDocs
          .map(doc => ({
            id: `${doc.domainId}:${doc.docId}`,
            title: doc.title,
            tags: doc.tag,
            score: scoreDoc(doc, keywords),
          }))
          .filter(d => d.score >= MIN_SCORE)
          .sort((a, b) => b.score - a.score)

        if (scored.length === 0) continue
        chaptersNeedingProblems++

        // 分成 required（高分）和 optional（中等分）
        const suggested_required = scored.slice(0, TOP_N_REQUIRED).map(d => d.id)
        const suggested_optional = scored.slice(TOP_N_REQUIRED, TOP_N_REQUIRED + TOP_N_OPTIONAL).map(d => d.id)

        recommendations[chapterId] = {
          levelTitle:   level.title,
          topicTitle:   topic.title,
          chapterTitle: chapter.title,
          keywords,
          existing_atcoder_required: existingRequired,
          existing_atcoder_optional: existingOptional,
          suggested_required,
          suggested_optional,
          top_matches: scored.slice(0, TOP_N_REQUIRED + TOP_N_OPTIONAL).map(d => ({
            id: d.id,
            title: d.title,
            tags: d.tags,
            score: d.score,
          })),
        }
      }
    }
  }

  // 4. 输出摘要
  console.log(`📊 推荐摘要`)
  console.log(`   总章节数：${totalChapters}`)
  console.log(`   有推荐结果的章节：${chaptersNeedingProblems}`)
  console.log('')

  for (const [cid, rec] of Object.entries(recommendations)) {
    const marker = rec.existing_atcoder_required.length > 0 ? '✅' : '🆕'
    console.log(`${marker} [${cid}] ${rec.chapterTitle}`)
    console.log(`      关键词：${rec.keywords.slice(0, 6).join('、')}`)
    console.log(`      推荐必做：${rec.suggested_required.join('  ')}`)
    if (rec.suggested_optional.length > 0)
      console.log(`      推荐选做：${rec.suggested_optional.join('  ')}`)
    console.log('')
  }

  // 5. 写入 JSON 文件
  const outPath = path.resolve(__dirname, 'atcoder_recommendations.json')
  fs.writeFileSync(outPath, JSON.stringify(recommendations, null, 2), 'utf-8')
  console.log(`✅ 完整推荐已写入：${outPath}`)

  // 6. 可选：写入 MongoDB
  if (APPLY) {
    console.log('\n🚀 --apply 模式：将推荐追加写入 MongoDB...')
    let applied = 0
    for (const [cid, rec] of Object.entries(recommendations)) {
      // 对每道推荐题目，检查是否已在 problemIds 中；若无则追加
      const newRequired = rec.suggested_required.filter(
        id => !(rec.existing_atcoder_required.includes(id))
      )
      const newOptional = rec.suggested_optional.filter(
        id => !(rec.existing_atcoder_optional.includes(id))
      )
      if (newRequired.length === 0 && newOptional.length === 0) continue

      // 找到对应的 chapter 并 $addToSet
      const res = await CourseLevelModel.updateOne(
        { 'topics.chapters.id': cid },
        {
          $addToSet: {
            'topics.$[].chapters.$[ch].problemIds': { $each: newRequired },
            'topics.$[].chapters.$[ch].optionalProblemIds': { $each: newOptional },
          }
        },
        { arrayFilters: [{ 'ch.id': cid }] }
      )
      if (res.modifiedCount > 0) {
        applied++
        console.log(`   ✔ ${cid} 追加 ${newRequired.length} 必做 + ${newOptional.length} 选做`)
      }
    }
    console.log(`\n完成，共修改 ${applied} 个章节。`)
  } else {
    console.log('\n💡 如需写入数据库，请加 --apply 参数重新运行。')
  }

  await hydroConn.close()
  await appConn.close()
}

main().catch(err => {
  console.error('❌ 脚本执行出错：', err)
  process.exit(1)
})
