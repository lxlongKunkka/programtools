/**
 * 在 GESP 二级 (C++) "一维数组入门" 专题中新增 3 个章节并绑题。
 * 用法：
 *   node scripts/apply_gesp2_array_chapters.mjs           ← dry-run
 *   node scripts/apply_gesp2_array_chapters.mjs --apply
 */
import dotenv from 'dotenv'
import path from 'path'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const APP_URI = process.env.APP_MONGODB_URI || 'mongodb://localhost:27017/programtools'
const APPLY = process.argv.includes('--apply')

// 第 6 个 topic（0-indexed: 5），章节索引 1..3 → cpp-2-6-1 / cpp-2-6-2 / cpp-2-6-3
const TOPIC_TITLE = '一维数组入门'
const CHAPTERS = [
  {
    title: '数组的定义与初始化',
    problemIds: [
      'Level1:282', // 数列偶数筛选 (ac 1.0)
      'Level1:399', // 长老清醒状态判断 (ac 1.0)
      'Level1:275', // 按序输出偶数 (ac 0.77)
      'Level1:318'  // 编程竞赛低分题总分统计 (ac 0.61)
    ],
    optionalProblemIds: [
      'Level1:339' // 神秘按钮与糖果奖励
    ]
  },
  {
    title: '数组的输入与输出',
    problemIds: [
      'Level1:332', // 序列子段反转
      'Level1:279', // 筛选K的倍数并升序输出商
      'Level1:382', // 序列一次相邻交换能否排序
      'Level1:329'  // 寻找首个更高建筑
    ],
    optionalProblemIds: [
      'Level1:367' // 最长连续签到天数比较
    ]
  },
  {
    title: '数组遍历：求和与最值',
    problemIds: [
      'Level1:283', // 每周步数记录求和 (ac 0.64)
      'Level1:402', // 奇数位置元素求和 (ac 0.5)
      'Level1:298', // 寻找数组最小值 (ac 0.37)
      'Level1:394', // 序列奇数位求和 (ac 0.38)
      'Level1:172'  // 序列最大跨度值计算 (ac 0.36)
    ],
    optionalProblemIds: [
      'atcoder:12', // [ABC102B] Maximum Difference
      'Level1:327'  // 棒球赛Elsa队第九局获胜得分
    ]
  }
]

const courseLevelSchema = new mongoose.Schema({}, { collection: 'courselevels', strict: false })

async function main() {
  console.log(`mode=${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  const conn = mongoose.createConnection(APP_URI)
  const CourseLevel = conn.model('CourseLevel', courseLevelSchema)
  await conn.asPromise()

  const levels = await CourseLevel.find({ level: 2 })
  const cppLevel = levels.find(l => /C\+\+/.test(l.group || '') && !/Python/i.test(l.group || ''))
  if (!cppLevel) { console.error('no L2 C++ doc'); process.exit(1) }

  const topicIdx = cppLevel.topics.findIndex(t => String(t.title).trim() === TOPIC_TITLE)
  if (topicIdx < 0) { console.error('topic not found'); process.exit(1) }
  const topic = cppLevel.topics[topicIdx]
  const topicNumber = topicIdx + 1
  console.log(`Found topic "${topic.title}" at index ${topicIdx} → cpp-2-${topicNumber}-x`)
  console.log(`Existing chapters in this topic: ${(topic.chapters || []).length}`)

  if (topic.chapters && topic.chapters.length > 0) {
    console.log('Topic already has chapters:')
    for (const c of topic.chapters) console.log(' ', c.id, c.title)
    console.log('Refusing to add duplicates. Exit.')
    process.exit(1)
  }

  for (let i = 0; i < CHAPTERS.length; i++) {
    const cfg = CHAPTERS[i]
    const id = `cpp-2-${topicNumber}-${i + 1}`
    const chapter = {
      id,
      title: cfg.title,
      content: '',
      contentType: 'markdown',
      problemIds: cfg.problemIds,
      optionalProblemIds: cfg.optionalProblemIds || [],
      homeworkIds: [],
      examIds: [],
      optional: false
    }
    topic.chapters.push(chapter)
    console.log(`+ [${id}] ${cfg.title}: ${cfg.problemIds.length} required + ${(cfg.optionalProblemIds||[]).length} optional`)
  }

  if (APPLY) {
    cppLevel.markModified('topics')
    await cppLevel.save()
    console.log('Saved.')
  } else {
    console.log('(dry-run)')
  }
  await conn.close()
}

main().catch(e => { console.error(e); process.exit(1) })
