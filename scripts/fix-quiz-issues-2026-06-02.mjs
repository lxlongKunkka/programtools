/**
 * 修复 2026-06-02 批次 5 条 quiz issue
 * - 2 道"上题中"依赖题 → 停用 + resolve
 * - 1 道代码损坏无法正常使用 → 停用 + resolve
 * - 2 道误报（官方答案匹配） → ignored
 */
import mongoose from 'mongoose'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envLines = readFileSync(path.join(__dirname, '../server/.env'), 'utf8').split('\n')
for (const line of envLines) {
  const m = line.match(/^([^=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const APPLY = process.argv.includes('--apply')
console.log(`mode=${APPLY ? 'APPLY' : 'DRY-RUN'}`)

const conn = await mongoose.createConnection(process.env.APP_MONGODB_URI).asPromise()
const issues = conn.db.collection('quiz_question_issues')
const questions = conn.db.collection('quiz_questions')

const now = new Date()
const reviewer = 'admin'

// 停用题目并关闭 issue
async function disableAndResolve(questionUid, issueNote) {
  const q = await questions.findOne({ questionUid })
  console.log(`\n[DISABLE+RESOLVE] ${questionUid}`)
  console.log(`  stem: ${q?.stem?.slice(0, 60)}`)
  console.log(`  enabled: ${q?.enabled} → false`)
  console.log(`  note: ${issueNote}`)
  if (APPLY) {
    await questions.updateOne({ questionUid }, { $set: { enabled: false, reviewStatus: 'reviewed', updatedAt: now } })
    const r = await issues.updateMany(
      { questionUid, status: { $in: ['pending', 'reviewing'] } },
      { $set: { status: 'resolved', reviewNote: issueNote, reviewedBy: reviewer, reviewedAt: now } }
    )
    console.log(`  → disabled; ${r.modifiedCount} issue(s) resolved`)
  }
}

// 仅关闭 issue 为 ignored
async function closeIgnored(questionUid, issueNote) {
  const q = await questions.findOne({ questionUid })
  console.log(`\n[IGNORED] ${questionUid}`)
  console.log(`  stem: ${q?.stem?.slice(0, 60)}`)
  console.log(`  note: ${issueNote}`)
  if (APPLY) {
    const r = await issues.updateMany(
      { questionUid, status: { $in: ['pending', 'reviewing'] } },
      { $set: { status: 'ignored', reviewNote: issueNote, reviewedBy: reviewer, reviewedAt: now } }
    )
    console.log(`  → ${r.modifiedCount} issue(s) ignored`)
  }
}

// 1. 依赖上题 → 停用
await disableAndResolve(
  'gesp-2024-09-cpp-7-q13',
  '题目为"上题中程序的时间复杂度"，依赖上一题语境，无法独立作答，停用。'
)

// 2. 依赖上题 → 停用
await disableAndResolve(
  'gesp-2024-12-cpp-7-q13',
  '题目为"上题中程序的时间复杂度"，依赖上一题语境，无法独立作答，停用。'
)

// 3. 代码损坏（%// 是注释导致歧义，Hydro 原文同样损坏）→ 停用
await disableAndResolve(
  'gesp-2025-09-cpp-1-q4',
  '代码中含 // 行注释导致语义歧义（cout << a/b << a%a*b 输出"20"=C，但官方答案为D），且 Hydro 原文亦同等损坏，无法可靠使用，停用。'
)

// 4. 误报：GCD辗转相除判断题，answer=true，Hydro官方答案T，正确
await closeIgnored(
  'gesp-2025-06-cpp-5-q16',
  '欧几里得GCD算法对a>b和a<b均适用（当a<b时第一步相当于自动交换），answer=true正确，官方答案T，误报关闭。'
)

// 5. 误报：continue与if配合，answer=true，Hydro官方答案A=true，正确
await closeIgnored(
  'gesp-2024-06-cpp-1-q21',
  'continue语句通常与if配合使用是正确表述，answer=true，官方答案A=true，误报关闭。'
)

// 汇总
const remaining = await issues.countDocuments({ status: { $in: ['pending', 'reviewing'] } })
console.log(`\n=== 操作完成，剩余 open issue: ${remaining}`)
const stats = await issues.aggregate([
  { $group: { _id: '$status', count: { $sum: 1 } } }
]).toArray()
console.log('statusStats:', Object.fromEntries(stats.map(s => [s._id, s.count])))

await conn.close()
