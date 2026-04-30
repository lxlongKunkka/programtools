// 为 GESP 三级 C++ 9 个空章节填充题目（基于人工读题判断）
// 用法：
//   node scripts/fill_gesp3_empty_chapters.mjs           ← dry-run
//   node scripts/fill_gesp3_empty_chapters.mjs --apply
import dotenv from 'dotenv'
import path from 'path'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })
const APP_URI = process.env.APP_MONGODB_URI || 'mongodb://localhost:27017/programtools'
const APPLY = process.argv.includes('--apply')

// 题库无合适题目的章节：cpp-3-3-3 原码反码补码、cpp-3-5-2 子集枚举（位运算辅助）
// 这两章保留为讲义型空章节，本脚本不修改

const PLAN = {
  'cpp-3-4-1': {
    title: '按位与(&)、或(|)、异或(^)',
    required: [
      'atcoder:1086', // 1-2-4 Test 三道题二进制状态表示得分
      'atcoder:630',  // 异或运算求 C
      'atcoder:1178', // 两人组队解决所有问题（OR 思想）
      'atcoder:1549', // CTZ 二进制末尾零计数（涉及 & 1 / 移位）
    ],
    optional: [],
  },
  'cpp-3-4-2': {
    title: '左移(<<) 与 右移(>>)',
    // 题库左移右移类例题不足，使用与位运算综合相关的题目
    required: [
      'atcoder:1549', // 二进制末尾零计数（典型右移练习）
    ],
    optional: [],
  },
  'cpp-3-5-1': {
    title: '多维枚举与数组结合',
    required: [
      'atcoder:244',  // Count ABC 子串
      'atcoder:919',  // Perfect String 美妙字符串
      'atcoder:1591', // 排队位置比较（多查询）
      'atcoder:1815', // 字符串逐位比较
    ],
    optional: [
      'atcoder:2111', // 有序序列按值删除
    ],
  },
  'cpp-3-5-3': {
    title: '枚举剪枝与效率分析',
    required: [
      'Level2:283',  // 字符串排列与回文子串计数（全排列+剪枝）
      'atcoder:2067', // Reverse Proxy 模拟放球
      'atcoder:2117', // 子串最大填充率（O(n^2) 子串枚举）
      'Level3:281',   // Palindromic in Both Bases（进制+回文+枚举）
    ],
    optional: [],
  },
  'cpp-3-6-2': {
    title: '矩阵/方格模拟',
    required: [
      'Level2:374', // 扫雷数字填充
      'Level2:346', // 广告牌矩阵顺时针旋转
      'Level2:221', // 网格外圈顺时针移动
      'Level2:164', // 棋盘拼图染色模拟
      'atcoder:30', // Grid Compression 网格白色行/列移除
    ],
    optional: [
      'atcoder:2186', // Count Subgrid 网格不同子图案计数
      'atcoder:2139', // 网格相邻性
    ],
  },
  'cpp-3-6-3': {
    title: '字符串模拟类例题',
    required: [
      'atcoder:2169', // ABC -> AC 删除中间字符
      'atcoder:2116', // 字符串结尾匹配
      'atcoder:2080', // Precondition 字符串条件判断
      'atcoder:2086', // 字符串两两拼接去重计数
      'Level2:139',   // 字符串子串提取
    ],
    optional: [
      'atcoder:2024', // Not Found 查找缺失字母
      'atcoder:2099', // Pick Two 仓库包裹取出
    ],
  },
}

const courseLevelSchema = new mongoose.Schema({}, { collection: 'courselevels', strict: false })

async function main() {
  console.log(`mode=${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  const conn = mongoose.createConnection(APP_URI)
  const CourseLevel = conn.model('CourseLevel', courseLevelSchema)
  await conn.asPromise()

  const levels = await CourseLevel.find({ level: 3 })
  const cppLevel = levels.find(l => /C\+\+/.test(l.group || '') && !/Python/i.test(l.group || ''))
  if (!cppLevel) { console.error('no L3 C++ doc'); process.exit(1) }

  let dirty = false
  let touched = 0
  for (const topic of (cppLevel.topics || [])) {
    for (const ch of (topic.chapters || [])) {
      const plan = PLAN[ch.id]
      if (!plan) continue
      const oldR = (ch.problemIds || []).slice()
      const oldO = (ch.optionalProblemIds || []).slice()
      ch.problemIds = plan.required.slice()
      ch.optionalProblemIds = plan.optional.slice()
      console.log(`# ${ch.id} ${ch.title}`)
      console.log('  required:', oldR.join(', ') || '(empty)', '=>', ch.problemIds.join(', '))
      console.log('  optional:', oldO.join(', ') || '(empty)', '=>', ch.optionalProblemIds.join(', ') || '(empty)')
      dirty = true; touched++
    }
  }

  if (!dirty) { console.log('nothing to update'); await conn.close(); process.exit(0) }
  console.log(`\nTouched ${touched} chapters.`)

  if (APPLY) {
    cppLevel.markModified('topics')
    await cppLevel.save()
    console.log('Saved.')
  } else {
    console.log('(dry-run) pass --apply to write.')
  }
  await conn.close()
}

main().catch(e => { console.error(e); process.exit(1) })
