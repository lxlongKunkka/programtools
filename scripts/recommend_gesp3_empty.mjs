// 为 GESP 三级空章节检索候选题目
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const APP_URI = process.env.APP_MONGODB_URI || 'mongodb://localhost:27017/programtools'
const HYDRO_URI = process.env.HYDRO_MONGODB_URI || process.env.MONGODB_URI

// 章节 -> 关键词正则（任一 tag 命中即候选）
const CHAPTERS = [
  { id: 'cpp-3-3-3', title: '原码、反码、补码', tagRe: /(原码|反码|补码|二进制位)/ },
  { id: 'cpp-3-4-1', title: '按位与/或/异或', tagRe: /(位运算|按位|异或|XOR|bit)/i },
  { id: 'cpp-3-4-2', title: '左移与右移', tagRe: /(位运算|移位|左移|右移|shift)/i },
  { id: 'cpp-3-5-1', title: '多维枚举与数组结合', tagRe: /(枚举|暴力枚举|多重循环)/ },
  { id: 'cpp-3-5-2', title: '子集枚举（位运算辅助）', tagRe: /(子集枚举|位运算枚举|状态压缩)/ },
  { id: 'cpp-3-5-3', title: '枚举剪枝与效率分析', tagRe: /(剪枝|枚举|搜索)/ },
  { id: 'cpp-3-6-2', title: '矩阵/方格模拟', tagRe: /(矩阵|二维数组|方格|模拟)/ },
  { id: 'cpp-3-6-3', title: '字符串模拟类例题', tagRe: /(字符串.*模拟|模拟.*字符串|字符串)/ }
]

const courseLevelSchema = new mongoose.Schema({}, { collection: 'courselevels', strict: false })

async function main() {
  // 1) 收集已用题目（C++ 一二三级全部章节，避免重复绑题）
  const appConn = mongoose.createConnection(APP_URI)
  const CourseLevel = appConn.model('CourseLevel', courseLevelSchema)
  await appConn.asPromise()
  const cppLevels = await CourseLevel.find({ level: { $in: [1, 2, 3] }, group: /C\+\+/ }).lean()
  const usedSet = new Set()
  for (const lv of cppLevels) {
    for (const t of (lv.topics || [])) {
      for (const c of (t.chapters || [])) {
        for (const id of (c.problemIds || [])) usedSet.add(id)
        for (const id of (c.optionalProblemIds || [])) usedSet.add(id)
      }
    }
  }
  await appConn.close()
  console.error(`Already used (cpp L1+L2+L3): ${usedSet.size}`)

  // 2) 查询 hydro：仅看 gesp 三级合适的题目（限制题目难度等级 tag 含 gesp3 / Level3 / 一维数组 / 字符串等）
  const hydroConn = mongoose.createConnection(HYDRO_URI)
  const Document = hydroConn.model('Document', new mongoose.Schema({}, { collection: 'document', strict: false }))
  await hydroConn.asPromise()

  // 三级范围内的潜在候选：domain in {Level1, Level2, Level3, gesp2, gesp3, atcoder, luogu...}
  // 优先 Level1/Level2/Level3/gesp3
  const cursor = Document.find({
    docType: 10,
    domainId: { $in: ['Level1', 'Level2', 'Level3', 'gesp3', 'gesp2', 'atcoder'] }
  }).select({ docId: 1, domainId: 1, title: 1, tag: 1, nAccept: 1, nSubmit: 1 }).lean().cursor()

  const buckets = {}
  for (const ch of CHAPTERS) buckets[ch.id] = []
  let scanned = 0
  for await (const doc of cursor) {
    scanned++
    const pid = `${doc.domainId}:${doc.docId}`
    if (usedSet.has(pid)) continue
    const tags = (doc.tag || []).map(String)
    if (tags.length === 0) continue
    const ac = doc.nSubmit > 0 ? doc.nAccept / doc.nSubmit : null
    // 仅纳入有合理 AC 数据 & 提交数 >=5
    if (!ac || doc.nSubmit < 5) continue
    if (ac < 0.15) continue // 过难
    for (const ch of CHAPTERS) {
      if (tags.some(t => ch.tagRe.test(t))) {
        // 章节特化过滤（精确把关，不依赖 isPreferred）
        if (ch.id === 'cpp-3-3-3' && !tags.some(t => /(原码|反码|补码|二进制|进制)/.test(t))) continue
        if (ch.id.startsWith('cpp-3-4') && !tags.some(t => /(位运算|按位|异或|移位|左移|右移|XOR|bit)/i.test(t))) continue
        if (ch.id === 'cpp-3-5-1' && !tags.some(t => /(枚举|暴力|循环嵌套|多重循环)/.test(t))) continue
        if (ch.id === 'cpp-3-5-2' && !tags.some(t => /(子集|状态压缩|位运算)/.test(t))) continue
        if (ch.id === 'cpp-3-5-3' && !tags.some(t => /(剪枝|搜索|枚举)/.test(t))) continue
        if (ch.id === 'cpp-3-6-2' && !tags.some(t => /(矩阵|二维数组|方格)/.test(t))) continue
        if (ch.id === 'cpp-3-6-3' && !tags.some(t => /(字符串)/.test(t))) continue
        // 三级范围限制：避免 gesp4+ 难题
        const isAdvanced = tags.some(t => /(gesp[5-9]|NOIP|提高组|动态规划|DP|图论|最短路|线段树|并查集|二分图|网络流)/i.test(t))
        if (isAdvanced) continue
        buckets[ch.id].push({ pid, title: doc.title, tags, ac: Number(ac.toFixed(3)), nSubmit: doc.nSubmit })
      }
    }
  }
  await hydroConn.close()

  // 排序：优先 gesp3 标签，其次 ac 偏中（0.4-0.85），其次 Level2/Level3 域
  for (const ch of CHAPTERS) {
    buckets[ch.id].sort((a, b) => {
      const score = (x) => {
        let s = 0
        if (x.tags.some(t => /gesp3/.test(t))) s += 5
        if (x.tags.some(t => /Level3/.test(t))) s += 4
        if (x.tags.some(t => /Level2/.test(t))) s += 3
        if (x.pid.startsWith('Level1:')) s -= 1 // Level1 偏简单
        const ac = x.ac
        if (ac >= 0.35 && ac <= 0.8) s += 3
        else if (ac > 0.8 && ac <= 0.92) s += 1
        else if (ac < 0.25) s -= 2
        return s
      }
      return score(b) - score(a)
    })
    buckets[ch.id] = buckets[ch.id].slice(0, 30)
  }

  const out = path.resolve(__dirname, '../changelogs/gesp3-empty-candidates.json')
  fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), scanned, usedCount: usedSet.size, buckets }, null, 2))
  console.error(`scanned=${scanned} -> ${out}`)
  for (const ch of CHAPTERS) {
    console.log(`\n## ${ch.id} ${ch.title} (${buckets[ch.id].length})`)
    for (const c of buckets[ch.id].slice(0, 12)) {
      console.log(`  ${c.pid} | ac=${c.ac} | ${c.title} | tags=${c.tags.slice(0, 6).join(',')}`)
    }
  }
}
main().catch(e => { console.error(e); process.exit(1) })
