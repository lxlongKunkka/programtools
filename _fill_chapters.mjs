/**
 * _fill_chapters.mjs
 *
 * AI 批量填充空章节内容（GESP C++ 认证课程）
 *
 * 用法：
 *   node _fill_chapters.mjs              # 预览空章节（dry-run）
 *   node _fill_chapters.mjs --fill       # 填充所有空章节
 *   node _fill_chapters.mjs --fill --level 6      # 只填 level 6
 *   node _fill_chapters.mjs --fill --level 6,7    # 填 level 6 和 7
 *   node _fill_chapters.mjs --fill --id 6-6-1     # 只填指定章节
 */

import dotenv from 'dotenv'
import { MongoClient } from 'mongodb'
import axios from 'axios'
import { writeFileSync, appendFileSync, existsSync } from 'fs'
dotenv.config({ path: './server/.env' })

const MONGODB_URI = process.env.APP_MONGODB_URI || 'mongodb://localhost:27017/programtools'
const AI_URL      = process.env.YUN_API_URL
const AI_KEY      = process.env.YUN_API_KEY
const AI_MODEL    = 'gemini-2.5-flash-preview-04-17'
const GROUP       = 'GESP C++ 认证课程'
const MIN_CONTENT_LEN = 200   // 小于这个字符数算"空"

// ── CLI flags ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const FILL      = args.includes('--fill')
const levelArg  = args.find(a => a.startsWith('--level'))
const idArg     = args.find(a => a.startsWith('--id'))
const LEVELS    = levelArg ? levelArg.split('=')[1]?.split(',').map(Number) || [] : []
const TARGET_ID = idArg   ? idArg.split('=')[1] : null
const LOG_FILE  = '_fill_chapters.log'

// ── Prompt ──────────────────────────────────────────────────────────────────
function buildPrompt(level, topicTitle, chapterTitle) {
  const lvlDesc = {
    5: 'GESP L5（基础算法入门：贪心、分治、递归、二分、前缀和、STL）',
    6: 'GESP L6（树搜索DP入门：栈、队列、优先队列、树、图、DFS、BFS、动态规划基础）',
    7: 'GESP L7（图哈希进阶：哈希、图论进阶、DFS/BFS进阶、区间DP、树上DP）',
    8: 'GESP L8（图论算法数学：最短路、最小生成树、并查集、拓扑排序、线段树）',
    9: 'GESP L9（CSP-S 提高级）',
  }[level] || `GESP L${level}`

  return `你是一名资深 C++ 算法竞赛教师，正在为"${GROUP}"编写 Markdown 格式的优秀教学材料。

【任务】为以下章节生成完整、可直接使用的 Markdown 教学内容。

课程等级：${lvlDesc}
所属专题：${topicTitle}
章节标题：${chapterTitle}

【内容要求】
1. 结构清晰，使用 ## / ### 标题分层（禁用一级标题）
2. 概念解释面向高中生，通俗易懂，不假设读者有竞赛经验
3. 包含至少 2 个完整可运行的 C++ 代码示例，每段代码：
   - 用 \`\`\`cpp ... \`\`\` 包裹
   - 关键行有中文注释
   - main() 函数完整，能直接编译运行
4. 每个示例后说明时间复杂度
5. 包含"常见错误 / 注意事项"小节
6. 末尾给出 1-2 道经典例题思路（文字，不需要完整题面）
7. 总长度 800-2000 字，Markdown 渲染后排版美观

【禁止事项】
- 禁止使用 STL 中学生不熟悉的库（如 <bit/stdc++.h> 除入门外）
- 禁止在输出中添加任何 JSON 包装或代码块以外的格式说明
- 禁止生成选择题或填空题形式的内容
- 禁止在段落里大量堆砌术语而不解释

请直接输出 Markdown 正文，不需要任何前言或解释。`
}

// ── AI Call ─────────────────────────────────────────────────────────────────
async function callAI(prompt, retries = 4) {
  if (!AI_URL || !AI_KEY) throw new Error('缺少 YUN_API_URL 或 YUN_API_KEY')
  let lastErr
  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) {
      const wait = 10000 * Math.pow(2, attempt - 1) // 10s, 20s, 40s
      log(`  ⏳ 等待 ${wait / 1000}s 后重试 (${attempt}/${retries - 1})...`)
      await new Promise(r => setTimeout(r, wait))
    }
    try {
      const resp = await axios.post(AI_URL, {
        model: AI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 4096
      }, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AI_KEY}` },
        timeout: 120000
      })
      const content = resp.data?.choices?.[0]?.message?.content || ''
      if (!content) throw new Error('AI 返回空内容')
      return content.trim()
    } catch (e) {
      const status = e.response?.status
      lastErr = e
      // 只对 429/500/502/503/504 重试
      if (status && ![429, 500, 502, 503, 504].includes(status)) throw e
      log(`  ⚠️  第 ${attempt + 1} 次尝试失败 (HTTP ${status ?? e.code ?? e.message})`)
    }
  }
  throw lastErr
}

// ── Log ──────────────────────────────────────────────────────────────────────
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`
  console.log(line)
  appendFileSync(LOG_FILE, line + '\n', 'utf8')
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db  = client.db()
  const col = db.collection('courselevels')

  // Build query
  const query = { group: GROUP }
  if (LEVELS.length > 0) query.level = { $in: LEVELS }

  const docs = await col.find(query).sort({ level: 1 }).toArray()

  // Collect empty chapters
  const tasks = []
  for (const doc of docs) {
    const lvl = doc.level
    for (const [ti, topic] of (doc.topics || []).entries()) {
      for (const [ci, ch] of (topic.chapters || []).entries()) {
        if (TARGET_ID && ch.id !== TARGET_ID) continue
        const len = (ch.content || '').trim().length
        if (len < MIN_CONTENT_LEN) {
          tasks.push({
            docId: doc._id,
            level: lvl,
            topicIdx: ti,
            chapterIdx: ci,
            chapterId: ch.id,
            topicTitle: topic.title,
            chapterTitle: ch.title,
            currentLen: len
          })
        }
      }
    }
  }

  log(`发现空章节 ${tasks.length} 个（< ${MIN_CONTENT_LEN} 字符）`)
  tasks.forEach(t => log(`  [空] L${t.level} ${t.topicTitle} / ${t.chapterTitle} (${t.chapterId}) ← ${t.currentLen} chars`))

  if (!FILL) {
    log('Dry-run 模式，未写入任何内容。加 --fill 参数执行填充。')
    await client.close()
    return
  }

  log(`\n开始 AI 填充（模型: ${AI_MODEL}）...`)
  let ok = 0, fail = 0

  for (const t of tasks) {
    log(`→ 处理 [${t.chapterId}] ${t.topicTitle} / ${t.chapterTitle}`)
    try {
      const prompt  = buildPrompt(t.level, t.topicTitle, t.chapterTitle)
      const content = await callAI(prompt)

      // Atomic update by array index path
      const updateKey = `topics.${t.topicIdx}.chapters.${t.chapterIdx}.content`
      await col.updateOne(
        { _id: t.docId },
        { $set: { [updateKey]: content, [`topics.${t.topicIdx}.chapters.${t.chapterIdx}.contentType`]: 'markdown' } }
      )
      log(`  ✅ 写入成功 (${content.length} 字符)`)
      ok++

      // Rate limit: 3s between calls
      await new Promise(r => setTimeout(r, 3000))
    } catch (e) {
      log(`  ❌ 失败: ${e.message}`)
      fail++
      await new Promise(r => setTimeout(r, 5000))
    }
  }

  log(`\n完成: ${ok} 成功, ${fail} 失败`)
  await client.close()
}

main().catch(e => { console.error(e); process.exit(1) })
