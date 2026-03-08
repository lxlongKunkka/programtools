/**
 * apply_atcoder_gesp_tags.js
 *
 * 根据 atcoder_abc_tags_with_gesp.json 中的 gesp_labels，
 * 向 MongoDB hydro 库 atcoder domain 的题目追加缺失的知识点标签。
 *
 * 规则：
 *   - 只追加（$addToSet），不删除、不修改已有标签
 *   - 不修改 gesp 等级标签（gesp1~gesp10），等级由人工维护
 *   - 标题必须含 [ABCXXXN] 可提取 atcoder problem id
 *   - 跳过 gesp_labels 为空的题目（仅 Easy/Other/Marathon 等泛标签）
 *
 * 来源映射：
 *   [ABC435A] → abc435_a
 *   [ABC001A] → abc001_a
 *   [ABC100B] → abc100_b
 *
 * 使用：
 *   node scripts/apply_atcoder_gesp_tags.js --dry-run   # 预览，不写 DB
 *   node scripts/apply_atcoder_gesp_tags.js             # 实际写入
 */

import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const DRY_RUN  = process.argv.includes('--dry-run')
const VERBOSE  = process.argv.includes('--verbose')
const LIMIT    = (() => { const i = process.argv.indexOf('--limit'); return i > -1 ? parseInt(process.argv[i+1]) : Infinity })()

const HYDRO_URI   = process.env.HYDRO_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/hydro'
const GESP_JSON   = path.resolve(__dirname, 'atcoder_abc_tags_with_gesp.json')

// 纯知识点标签（不含 gesp1~gesp10 等级），只追加这类标签
const GESP_LEVELS = new Set(['gesp1','gesp2','gesp3','gesp4','gesp5','gesp6','gesp7','gesp8','gesp9','gesp10'])

// 提取标题中的 AtCoder problem id
// [ABC435A]  → abc435_a
// [ABC001AB] → abc001_ab （极少数多字母题号）
function extractProblemId(title) {
  const m = title.match(/\[ABC(\d+)([A-Z_-]+)\]/i)
  if (!m) return null
  const num    = m[1]
  const letter = m[2].toLowerCase()
  return `abc${num}_${letter}`
}

async function main() {
  console.log(DRY_RUN ? '【DRY RUN 模式 - 不写入 DB】' : '【写入模式】')
  console.log(`数据源: ${GESP_JSON}\n`)

  // 加载 gesp 映射数据
  const gData = JSON.parse(fs.readFileSync(GESP_JSON, 'utf-8'))
  console.log(`已加载 gesp 数据: ${Object.keys(gData).length} 道题\n`)

  // 连接 DB
  const conn = mongoose.createConnection(HYDRO_URI)
  const Document = conn.model('Document', new mongoose.Schema({}, { collection: 'document', strict: false }))
  await conn.asPromise()
  console.log('DB 已连接\n')

  // 查询所有 atcoder domain 题目
  const query = LIMIT < Infinity
    ? Document.find({ domainId: 'atcoder', docType: 10 }).limit(LIMIT)
    : Document.find({ domainId: 'atcoder', docType: 10 })

  const docs = await query.select({ docId: 1, title: 1, tag: 1 }).lean()
  console.log(`atcoder 题目总数: ${docs.length}\n`)

  let matched = 0, updated = 0, skipped = 0, noData = 0, noId = 0

  const updates = []

  for (const doc of docs) {
    const pid = extractProblemId(doc.title || '')
    if (!pid) { noId++; continue }

    const gProb = gData[pid]
    if (!gProb) { noData++; continue }
    matched++

    // 只取 gesp 等级标签（gesp1~gesp10），知识点标签已单独追加过
    const allLabels = (gProb.gesp_levels || []).filter(l => GESP_LEVELS.has(l))
    if (allLabels.length === 0) { skipped++; continue }

    // 找出当前题目缺少的标签
    const existingTags = new Set(doc.tag || [])
    const toAdd = allLabels.filter(l => !existingTags.has(l))

    if (toAdd.length === 0) { skipped++; continue }

    if (VERBOSE) {
      console.log(`  ${pid.padEnd(12)} ${doc.title.slice(0,40)}`)
      console.log(`    已有: [${[...existingTags].join(', ')}]`)
      console.log(`    追加: [${toAdd.join(', ')}]\n`)
    }

    updates.push({ docId: doc.docId, title: doc.title, pid, toAdd })
    updated++
  }

  console.log(`\n${'─'.repeat(55)}`)
  console.log(`匹配到 gesp 数据:  ${matched}`)
  console.log(`需要追加标签:      ${updated}`)
  console.log(`无需变更（已有）:  ${skipped}`)
  console.log(`未找到 atcoder ID: ${noId}`)
  console.log(`不在 gesp 数据中:  ${noData}`)

  if (DRY_RUN) {
    console.log('\n[DRY RUN] 前 20 条变更预览:')
    for (const u of updates.slice(0, 20)) {
      console.log(`  [${u.pid}] ${u.title.slice(0, 45)}`)
      console.log(`    → 追加: ${u.toAdd.join(', ')}`)
    }
    console.log('\n[DRY RUN] 未写入。去掉 --dry-run 参数后重新运行以实际写入。')
  } else {
    console.log('\n写入 DB...')
    let done = 0
    for (const u of updates) {
      await Document.updateOne(
        { domainId: 'atcoder', docId: u.docId },
        { $addToSet: { tag: { $each: u.toAdd } } }
      )
      done++
      if (done % 100 === 0) process.stdout.write(`\r  进度: ${done}/${updates.length}`)
    }
    console.log(`\r  完成: ${done} 道题目已更新标签`)
  }

  await conn.close()
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
