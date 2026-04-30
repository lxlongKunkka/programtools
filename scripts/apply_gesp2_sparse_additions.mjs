/**
 * 批量为 GESP 二级 (C++) 稀疏章节追加题目。
 * 直接修改 CourseLevel 文档：在 chapter.problemIds / optionalProblemIds 末尾追加，避免重复。
 * 用法：
 *   node scripts/apply_gesp2_sparse_additions.mjs           ← dry-run
 *   node scripts/apply_gesp2_sparse_additions.mjs --apply   ← 写入
 */
import dotenv from 'dotenv'
import path from 'path'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const APP_URI = process.env.APP_MONGODB_URI || 'mongodb://localhost:27017/programtools'
const APPLY = process.argv.includes('--apply')

// 每个章节的题目追加列表
// kind: 'required' -> problemIds, 'optional' -> optionalProblemIds
const ADDITIONS = {
  // 数位分离 (已 13 题): +1 选做
  'cpp-2-1-4': {
    optional: ['gesp2:50']
  },
  // ASCII 编码表与字符读取 (0 题) → 5 必做
  'cpp-2-3-1': {
    required: [
      'atcoder:1006', // [ABC260A] A Unique Letter
      'Level1:253',   // 寻找长度为3字符串中的唯一字符
      'atcoder:1485', // [ABC327A] ab 字符串相邻字符检查
      'atcoder:1408', // [ABC315A] tcdr 移除元音
      'atcoder:18'    // [ABC104B] AcCepted 字符串格式判断
    ]
  },
  // 字符判断与大小写转换 (1 题) → +3 必做 +1 选做
  'cpp-2-3-3': {
    required: [
      'atcoder:1696', // [ABC357B] Uppercase and Lowercase
      'Level1:397',   // 小写字母转大写
      'Level2:148'    // 字符串大小写转换
    ],
    optional: [
      'atcoder:1240'  // [ABC291A] camel Case
    ]
  },
  // 单层枚举基础 (1 题) → +4 必做
  'cpp-2-5-1': {
    required: [
      'Level2:19',    // 统计约数个数为偶数的数字
      'atcoder:1479', // [ABC326B] 326-like Numbers
      'atcoder:521',  // [ABC196C] Doubled
      'atcoder:461'   // [ABC186C] Unlucky 7
    ]
  },
  // 双重枚举与三重枚举 (1 题) → +4 必做
  'cpp-2-5-2': {
    required: [
      'atcoder:1913', // Heavy Snake
      'atcoder:1633', // [ABC348B] Farthest Point
      'atcoder:1514', // [ABC331B] Buy One Carton of Milk
      'atcoder:639'   // [ABC214B] How many?
    ]
  },
  // 枚举综合例题 (0 题) → +5 必做 +1 选做
  'cpp-2-5-3': {
    required: [
      'atcoder:1269', // [ABC295B] Bombs
      'atcoder:2127', // abc420_b Most Minority
      'atcoder:1654', // [ABC351B] Spot the Difference
      'atcoder:1430', // [ABC319B] Measure
      'atcoder:80'    // [ABC121B] Can you solve this?
    ],
    optional: [
      'atcoder:719'   // [ABC224B] Mongeness
    ]
  }
}

const courseLevelSchema = new mongoose.Schema({}, { collection: 'courselevels', strict: false })

async function main() {
  console.log(`mode=${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  const conn = mongoose.createConnection(APP_URI)
  const CourseLevel = conn.model('CourseLevel', courseLevelSchema)
  await conn.asPromise()

  const levels = await CourseLevel.find({ level: 2 })
  const cppLevel = levels.find(l => /C\+\+/.test(l.group || '') && !/Python/i.test(l.group || ''))
  if (!cppLevel) {
    console.error('No C++ Level 2 doc found')
    process.exit(1)
  }
  console.log(`Found C++ L2 doc: ${cppLevel._id}`)

  let totalAdded = 0
  const summary = []
  for (const topic of cppLevel.topics || []) {
    for (const ch of topic.chapters || []) {
      const cfg = ADDITIONS[ch.id]
      if (!cfg) continue
      const before = {
        required: ch.problemIds.length,
        optional: ch.optionalProblemIds.length
      }
      const existing = new Set([...(ch.problemIds || []), ...(ch.optionalProblemIds || [])])

      const addedRequired = []
      for (const pid of cfg.required || []) {
        if (existing.has(pid)) continue
        ch.problemIds.push(pid)
        existing.add(pid)
        addedRequired.push(pid)
      }
      const addedOptional = []
      for (const pid of cfg.optional || []) {
        if (existing.has(pid)) continue
        ch.optionalProblemIds.push(pid)
        existing.add(pid)
        addedOptional.push(pid)
      }
      const added = addedRequired.length + addedOptional.length
      totalAdded += added
      summary.push({
        chapterId: ch.id,
        chapterTitle: ch.title,
        before,
        after: { required: ch.problemIds.length, optional: ch.optionalProblemIds.length },
        addedRequired,
        addedOptional
      })
    }
  }

  for (const s of summary) {
    console.log(`[${s.chapterId}] ${s.chapterTitle}`)
    console.log(`   ${s.before.required}→${s.after.required} 必做 (+${s.addedRequired.length}: ${s.addedRequired.join(', ')})`)
    console.log(`   ${s.before.optional}→${s.after.optional} 选做 (+${s.addedOptional.length}: ${s.addedOptional.join(', ')})`)
  }
  console.log(`\nTotal additions: ${totalAdded}`)

  if (APPLY) {
    cppLevel.markModified('topics')
    await cppLevel.save()
    console.log('Saved.')
  }

  await conn.close()
}

main().catch(e => { console.error(e); process.exit(1) })
