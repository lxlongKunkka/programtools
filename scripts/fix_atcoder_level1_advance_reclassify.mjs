// 修复 Level 1–3 AtCoder 题目超前分类
// 将 cpp-1-3-x / cpp-1-2-x 中需要条件结构/循环/数组知识的题目
// 迁移到正确的章节（cpp-1-4-x、cpp-1-5-x、cpp-2-1-2、cpp-3-1-5 等）
// 用法：node scripts/fix_atcoder_level1_advance_reclassify.mjs [--apply]
import path from 'path'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const APPLY = process.argv.includes('--apply')

// ─── Level 1 PLAN ──────────────────────────────────────────────────────────────
// 来源章节：removeOptional
// 目标章节：addOptional
const PLAN_L1 = {
  // ── 来源章节（只做移除） ──
  'cpp-1-2-1': {
    removeOptional: [
      'atcoder:172',  // ABC138B 倒数和公式 → 需要 N 个输入的循环 → cpp-1-5-3
      'atcoder:580',  // ABC206B 等差前n项和反推N → while 累加 → cpp-1-5-2
    ],
  },
  'cpp-1-2-3': {
    removeOptional: [
      'atcoder:67',   // ABC118A B+/-A：B%A==0 判断 → if/else → cpp-1-4-1
      'atcoder:75',   // ABC120A Favorite Sound：min(B/A, C) → 最值 → cpp-1-4-2
      'atcoder:249',  // ABC151A Next Alphabet：字符 +1 → 需要 char 知识 → cpp-1-3-4
      'atcoder:328',  // ABC164B Battle：ceil 比较输赢 → if/else → cpp-1-4-1
    ],
    addOptional: [
      'atcoder:304',  // ABC160B Golden Coins：整除取余贪心，非 char 问题
    ],
  },
  'cpp-1-3-1': {
    removeOptional: [
      'atcoder:262',  // ABC153B Common Raccoon：求 A 总和与 H 比较 → 循环 → cpp-1-5-3
      'atcoder:274',  // ABC155B Papers Please：遍历偶数判整除 → 循环 → cpp-1-5-3
      'atcoder:405',  // ABC177A Don't be late：速度路程比较 → if/else → cpp-1-4-1
      'atcoder:412',  // ABC178B Product Max：四端点取最大 → 最值 → cpp-1-4-2
      'atcoder:489',  // ABC191A Vanishing Pitch：时间区间判断 → && → cpp-1-4-3
      'atcoder:513',  // ABC195A Health M Death：H%M==0 判断 → if/else → cpp-1-4-1
      'atcoder:533',  // ABC198C Compass Walking：步数三分类 → if-else if → cpp-1-4-5
      'atcoder:537',  // ABC199A Square Inequality：A²+B² 比较 C² → if/else → cpp-1-4-1
      'atcoder:585',  // ABC207A Repression：三数之和 - min → 最值 → cpp-1-4-2
      'atcoder:594',  // ABC097A Colorful Transceivers：三人距离判断 → || → cpp-1-4-4
      'atcoder:596',  // ABC098A Add Sub Mul：max(A+B,A-B,A*B) → 最值 → cpp-1-4-2
      'atcoder:598',  // ABC208A Rolling Dice：A≤B≤6A → && → cpp-1-4-3
      'atcoder:610',  // ABC210A Cabbages：min/max 组合定价 → 最值 → cpp-1-4-2
      'atcoder:830',  // ABC238A Exponential or Quadratic：分段判断 → if-else if → cpp-1-4-5
      'atcoder:862',  // ABC242A T-shirt：double 分段判断输出 → if-else if → cpp-1-4-5
    ],
  },
  'cpp-1-3-2': {
    removeOptional: [
      'atcoder:160',  // ABC136B Uneven Numbers：枚举 1..N 位数奇偶 → 循环 → cpp-1-5-3
      'atcoder:166',  // ABC137B One Clue：输出 [X-K+1, X+K-1] 区间 → for 循环 → cpp-1-5-1
      'atcoder:196',  // ABC142B Roller Coaster：数组遍历计数 h>=K → 循环 → cpp-1-5-3
    ],
  },
  'cpp-1-3-3': {
    removeOptional: [
      'atcoder:322',  // ABC163B Homework：N - sum(A)；负数 -1 → 循环 → cpp-1-5-3
      'atcoder:334',  // ABC165B 1%：while 模拟复利 → while 循环 → cpp-1-5-2
      'atcoder:418',  // ABC179B Go to Jail：连续条件计数循环 → 循环 → cpp-1-5-3
      'atcoder:430',  // ABC181B Trapezoid Sum：N 组等差求和循环 → 循环 → cpp-1-5-3
      'atcoder:453',  // ABC185A ABC Preparation：min(A1,A2,A3,A4) → 最值 → cpp-1-4-2
      'atcoder:465',  // ABC187A Large Digits：数位和比较输出 → if/else → cpp-1-4-1
      'atcoder:472',  // ABC188B Orthogonality：向量内积循环 → 循环 → cpp-1-5-3
      'atcoder:484',  // ABC190B Magic 3：线性枚举找符合条件咒语 → 循环 → cpp-1-5-3
      'atcoder:490',  // ABC191B Remove It：线性遍历过滤 X → 循环 → cpp-1-5-3
      'atcoder:538',  // ABC199B Intersection：求 max(A)/min(B) 区间整数数 → 循环 → cpp-1-5-3
      'atcoder:557',  // ABC202C Made Up：桶计数 + 求和 → 数组+循环 → cpp-3-1-5
      'atcoder:562',  // ABC203B AtCoder Condominium：二重循环求和 → 嵌套循环 → cpp-2-1-2
      'atcoder:568',  // ABC204B Nuts：循环累加超过 10 部分 → 循环 → cpp-1-5-3
      'atcoder:581',  // ABC206C Swappable：桶计数同值对 → 数组+循环 → cpp-3-1-5
      'atcoder:591',  // ABC096A Day of Takahashi：min(a,b) 月日相等天数 → 最值 → cpp-1-4-2
      'atcoder:605',  // ABC209B Can you buy them all?：循环求和并调整 → 循环 → cpp-1-5-3
      'atcoder:611',  // ABC210B Bouzu Mekuri：找首个 '1' 位置奇偶判定 → 循环 → cpp-1-5-3
      'atcoder:623',  // ABC212B Weak Password：数位连续/相同判定 → 循环 → cpp-1-5-3
      'atcoder:647',  // ABC215B log2(N)：循环找最大 2^k ≤ N → while 循环 → cpp-1-5-2
      'atcoder:686',  // ABC220A Find Multiple：区间找倍数 (需整除 + 条件) → cpp-1-4-1
    ],
  },
  'cpp-1-3-4': {
    removeOptional: [
      'atcoder:280',  // ABC156B Digits：while 除以 K 计数位数 → while 循环 → cpp-1-5-2
      'atcoder:304',  // ABC160B Golden Coins：贪心整除取余（非 char 类问题）→ cpp-1-2-3
    ],
    addOptional: [
      'atcoder:249',  // ABC151A Next Alphabet：char +1，需要字符知识
    ],
  },

  // ── 目标章节（只做添加） ──
  'cpp-1-4-1': {
    addOptional: [
      'atcoder:67',   // ABC118A B+/-A：B%A==0 if/else 判断
      'atcoder:328',  // ABC164B Battle：ceil 比较两怪物谁先死
      'atcoder:405',  // ABC177A Don't be late：D ≤ T*S 判断
      'atcoder:465',  // ABC187A Large Digits：数位和大小比较分支
      'atcoder:513',  // ABC195A Health M Death：H%M==0 if/else
      'atcoder:537',  // ABC199A Square Inequality：A²+B² < C² 判断
      'atcoder:686',  // ABC220A Find Multiple：(L+K-1)/K*K ≤ R 条件
    ],
  },
  'cpp-1-4-2': {
    addOptional: [
      'atcoder:75',   // ABC120A Favorite Sound：min(B/A, C)
      'atcoder:412',  // ABC178B Product Max：四端点乘积取最大
      'atcoder:453',  // ABC185A ABC Preparation：min(A1,A2,A3,A4)
      'atcoder:585',  // ABC207A Repression：三数之和 - min
      'atcoder:591',  // ABC096A Day of Takahashi：min(a,b)
      'atcoder:596',  // ABC098A Add Sub Mul：max(A+B, A-B, A*B)
      'atcoder:610',  // ABC210A Cabbages：min/max 分段定价
    ],
  },
  'cpp-1-4-3': {
    addOptional: [
      'atcoder:489',  // ABC191A Vanishing Pitch：V*S ≤ B ≤ V*T（&&）
      'atcoder:598',  // ABC208A Rolling Dice：A ≤ B ≤ 6A（&&）
    ],
  },
  'cpp-1-4-4': {
    addOptional: [
      'atcoder:594',  // ABC097A Colorful Transceivers：|A-C|≤K or (|A-B|≤K and |B-C|≤K)
    ],
  },
  'cpp-1-4-5': {
    addOptional: [
      'atcoder:533',  // ABC198C Compass Walking：D≤R/D≤2R/else 三分类
      'atcoder:830',  // ABC238A Exponential or Quadratic：按 n 大小分段判断
      'atcoder:862',  // ABC242A T-shirt：double 概率三段输出
    ],
  },
  'cpp-1-5-1': {
    removeOptional: [
      'atcoder:580',  // ABC206B Savings：while 累加，误放在 for 循环章，应移到 cpp-1-5-2
    ],
    addOptional: [
      'atcoder:166',  // ABC137B One Clue：for 循环输出区间 [X-K+1, X+K-1]
    ],
  },
  'cpp-1-5-2': {
    addOptional: [
      'atcoder:280',  // ABC156B Digits：while 除以 K 计数位数
      'atcoder:334',  // ABC165B 1%：while 模拟复利
      'atcoder:580',  // ABC206B Savings：while 累加至前 n 项和 ≥ N
      'atcoder:647',  // ABC215B log2(N)：while 2^k ≤ N
    ],
  },
  'cpp-1-5-3': {
    addOptional: [
      'atcoder:160',  // ABC136B Uneven Numbers：枚举 1..N 位数奇偶
      'atcoder:172',  // ABC138B Resistors in Parallel：循环 N 个倒数求和
      'atcoder:196',  // ABC142B Roller Coaster：遍历计数 h_i >= K
      'atcoder:262',  // ABC153B Common Raccoon：循环求 A 总和与 H 比较
      'atcoder:274',  // ABC155B Papers Please：遍历偶数判 3/5 整除
      'atcoder:322',  // ABC163B Homework：N - sum(A_i)
      'atcoder:418',  // ABC179B Go to Jail：连续双骰相同计数
      'atcoder:430',  // ABC181B Trapezoid Sum：N 组等差求和
      'atcoder:472',  // ABC188B Orthogonality：向量内积
      'atcoder:484',  // ABC190B Magic 3：线性枚举找符合咒语
      'atcoder:490',  // ABC191B Remove It：过滤 !=X 的元素
      'atcoder:538',  // ABC199B Intersection：数组求 max(L) 和 min(R)
      'atcoder:568',  // ABC204B Nuts：循环累加 max(0, A_i-10)
      'atcoder:605',  // ABC209B Can you buy them all?：循环求和
      'atcoder:611',  // ABC210B Bouzu Mekuri：找首个值为 1 的位置
      'atcoder:623',  // ABC212B Weak Password：遍历 4 位数字判连续/相同
    ],
  },
}

// ─── Level 2 PLAN ──────────────────────────────────────────────────────────────
const PLAN_L2 = {
  'cpp-2-1-2': {
    addOptional: [
      'atcoder:562',  // ABC203B AtCoder Condominium：二重循环生成房间号求和
    ],
  },
}

// ─── Level 3 PLAN ──────────────────────────────────────────────────────────────
const PLAN_L3 = {
  'cpp-3-1-5': {
    addOptional: [
      'atcoder:557',  // ABC202C Made Up：桶计数 C[A[i]] 求和
      'atcoder:581',  // ABC206C Swappable：N*(N-1)/2 - 同值对数（桶）
    ],
  },
}

async function processLevel(CL, level, plan) {
  const lv = await CL.findOne({ level, group: /C\+\+/ })
  if (!lv) { console.warn(`Level ${level} C++ not found, skip`); return 0 }
  let touched = 0
  for (const t of lv.topics || []) {
    for (const c of t.chapters || []) {
      const planEntry = plan[c.id]
      if (!planEntry) continue
      const beforeR = [...(c.problemIds || [])]
      const beforeO = [...(c.optionalProblemIds || [])]
      let R = c.problemIds || []
      let O = c.optionalProblemIds || []
      if (planEntry.removeOptional) O = O.filter(p => !planEntry.removeOptional.includes(p))
      if (planEntry.removeRequired) R = R.filter(p => !planEntry.removeRequired.includes(p))
      if (planEntry.addOptional) {
        for (const p of planEntry.addOptional) {
          if (!R.includes(p) && !O.includes(p)) O.push(p)
        }
      }
      if (planEntry.addRequired) {
        for (const p of planEntry.addRequired) {
          if (!R.includes(p) && !O.includes(p)) R.push(p)
        }
      }
      c.problemIds = R
      c.optionalProblemIds = O
      const rChanged = beforeR.some(p => !R.includes(p)) || R.some(p => !beforeR.includes(p))
      const oChanged = beforeO.some(p => !O.includes(p)) || O.some(p => !beforeO.includes(p))
      if (rChanged || oChanged) {
        console.log(`[${c.id}] R: ${beforeR.length}->${R.length}  O: ${beforeO.length}->${O.length}`)
        if (oChanged) console.log(`  O now: ${O.join(', ')}`)
        touched++
      }
    }
  }
  if (APPLY && touched) { lv.markModified('topics'); await lv.save(); console.log(`  L${level} saved (${touched} chapters).`) }
  return touched
}

async function main() {
  const conn = mongoose.createConnection(process.env.APP_MONGODB_URI)
  const CL = conn.model('CourseLevel', new mongoose.Schema({}, { collection: 'courselevels', strict: false }))
  await conn.asPromise()

  let total = 0
  total += await processLevel(CL, 1, PLAN_L1)
  total += await processLevel(CL, 2, PLAN_L2)
  total += await processLevel(CL, 3, PLAN_L3)

  if (!APPLY) console.log(`\n[DRY-RUN] ${total} chapters would be modified; rerun with --apply`)
  else console.log(`\nDone. Total ${total} chapters modified.`)
  await conn.close()
}
main().catch(e => { console.error(e); process.exit(1) })
