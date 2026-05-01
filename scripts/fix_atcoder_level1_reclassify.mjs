// 修复 Level 1 错误分类：将误放入算术章节（cpp-1-2-1/cpp-1-2-3）的题目
// 迁移到正确的条件结构章节（cpp-1-4-1 if/else, cpp-1-4-2 最值, cpp-1-4-5 多分支）
// 用法：node scripts/fix_atcoder_level1_reclassify.mjs [--apply]
import path from 'path'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const APPLY = process.argv.includes('--apply')

// 按章节描述：从哪里移走，加到哪里
const PLAN = {
  // 来源章节：只做移除
  'cpp-1-2-3': {
    removeOptional: [
      'atcoder:11',  // ABC102A 2和N LCM：判断奇偶决定 N 还是 2N → if/else
      'atcoder:153', // ABC135A Harmony：(A+B)%2==0 ? (A+B)/2 : IMPOSSIBLE → if/else
      'atcoder:159', // ABC136A Transfer：max(0, C-(A-B)) → 最值
      'atcoder:165', // ABC137A +-x：求 max(A+B,A-B,A*B) → 最值
      'atcoder:171', // ABC138A Red or Not：条件输出 red 或 s → if/else
      'atcoder:189', // ABC141A Weather Prediction：三选一条件输出 → if-else if
      'atcoder:201', // ABC143A Curtain：max(0, A-2*B) → 最值
      'atcoder:207', // ABC144A 9x9：范围判断后输出乘积或 -1 → if/else
      'atcoder:225', // ABC147A Blackjack：求和与 21 比较 → if/else
      'atcoder:238', // ABC149B Greedy Takahashi：max(0, A-K) → 最值
      'atcoder:243', // ABC150A 500 Yen Coins：K*500 与 X 比较 → if/else
      'atcoder:255', // ABC152A AC or WA：N==M 输出 Yes → if/else
    ],
  },
  'cpp-1-2-1': {
    removeOptional: [
      'atcoder:141', // ABC133A T or T：min(N*A, B) → 最值
      'atcoder:604', // ABC209A Counting：max(0, B-A+1) → 最值
    ],
  },
  // 目标章节：只做添加
  'cpp-1-4-1': {
    addOptional: [
      'atcoder:11',  // ABC102A
      'atcoder:153', // ABC135A
      'atcoder:171', // ABC138A
      'atcoder:207', // ABC144A
      'atcoder:225', // ABC147A
      'atcoder:243', // ABC150A
      'atcoder:255', // ABC152A
    ],
  },
  'cpp-1-4-2': {
    addOptional: [
      // atcoder:159 ABC136A: dry-run confirmed already in cpp-1-4-1, skip to avoid cross-chapter duplicate
      'atcoder:165', // ABC137A +-x
      'atcoder:201', // ABC143A Curtain
      'atcoder:238', // ABC149B Greedy Takahashi
      'atcoder:141', // ABC133A T or T
      'atcoder:604', // ABC209A Counting
    ],
  },
  'cpp-1-4-5': {
    addOptional: [
      'atcoder:189', // ABC141A
    ],
  },
}

async function main() {
  const conn = mongoose.createConnection(process.env.APP_MONGODB_URI)
  const CL = conn.model('CourseLevel', new mongoose.Schema({}, { collection: 'courselevels', strict: false }))
  await conn.asPromise()

  const lv = await CL.findOne({ level: 1, group: /C\+\+/ })
  if (!lv) throw new Error('Level 1 C++ not found')

  let touched = 0
  for (const t of lv.topics || []) {
    for (const c of t.chapters || []) {
      const plan = PLAN[c.id]
      if (!plan) continue
      const beforeR = [...(c.problemIds || [])]
      const beforeO = [...(c.optionalProblemIds || [])]
      let R = c.problemIds || []
      let O = c.optionalProblemIds || []

      if (plan.removeOptional) O = O.filter(p => !plan.removeOptional.includes(p))
      if (plan.removeRequired) R = R.filter(p => !plan.removeRequired.includes(p))
      if (plan.addOptional) {
        for (const p of plan.addOptional) {
          if (!R.includes(p) && !O.includes(p)) O.push(p)
        }
      }
      if (plan.addRequired) {
        for (const p of plan.addRequired) {
          if (!R.includes(p) && !O.includes(p)) R.push(p)
        }
      }

      c.problemIds = R
      c.optionalProblemIds = O
      console.log(`[${c.id}] R: ${beforeR.length}->${R.length}  O: ${beforeO.length}->${O.length}`)
      if (beforeO.length !== O.length || beforeR.length !== R.length) {
        console.log(`  O now: ${O.join(', ')}`)
        touched++
      }
    }
  }

  if (APPLY) {
    lv.markModified('topics')
    await lv.save()
    console.log(`\nSaved (${touched} chapters touched).`)
  } else {
    console.log(`\n[DRY-RUN] ${touched} chapters would be modified; rerun with --apply`)
  }
  await conn.close()
}
main().catch(e => { console.error(e); process.exit(1) })
