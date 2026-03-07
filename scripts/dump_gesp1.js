// 导出 GESP1 课程大纲及题目清单
import mongoose from 'mongoose'
import { createConnection } from 'mongoose'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 读取配置
const configPath = join(__dirname, '../server/config.js')
const { APP_MONGODB_URI } = await import('../server/config.js')

const conn = createConnection(APP_MONGODB_URI)
await new Promise((resolve, reject) => {
  conn.once('connected', resolve)
  conn.once('error', reject)
})

const chapterSchema = new mongoose.Schema({
  id: String,
  title: String,
  content: String,
  contentType: String,
  resourceUrl: String,
  problemIds: [String],
  optionalProblemIds: [String],
  optional: Boolean
})
const topicSchema = new mongoose.Schema({
  title: String,
  description: String,
  chapters: [chapterSchema]
})
const courseLevelSchema = new mongoose.Schema({
  level: Number,
  group: String,
  label: String,
  subject: String,
  title: String,
  description: String,
  topics: [topicSchema],
  chapters: [chapterSchema]
})
const CourseLevel = conn.model('CourseLevel', courseLevelSchema)

// 查询所有 GESP C++ 课程，按 level 排序
const levels = await CourseLevel.find({ group: 'GESP C++ 认证课程' }).sort({ level: 1 }).lean()

if (!levels.length) {
  console.log('未找到 GESP1 课程数据')
  process.exit(0)
}

for (const lv of levels) {
  console.log('='.repeat(60))
  console.log(`课程: ${lv.title}`)
  console.log(`level: ${lv.level}  group: ${lv.group || '(无)'}  label: ${lv.label || '(无)'}`)
  console.log(`描述: ${lv.description || '(无)'}`)
  console.log()

  if (lv.topics && lv.topics.length) {
    lv.topics.forEach((topic, ti) => {
      console.log(`  【专题 ${ti + 1}】${topic.title}`)
      if (topic.description) console.log(`    描述: ${topic.description}`)
      if (topic.chapters && topic.chapters.length) {
        topic.chapters.forEach((ch, ci) => {
          console.log(`    [章节 ${ch.id || ci + 1}] ${ch.title}${ch.optional ? ' (选修)' : ''}`)
          if (ch.problemIds && ch.problemIds.length) {
            console.log(`      必做题 (${ch.problemIds.length}):`)
            ch.problemIds.forEach(pid => console.log(`        - ${pid}`))
          }
          if (ch.optionalProblemIds && ch.optionalProblemIds.length) {
            console.log(`      选做题 (${ch.optionalProblemIds.length}):`)
            ch.optionalProblemIds.forEach(pid => console.log(`        - ${pid}`))
          }
        })
      } else {
        console.log('    (无章节)')
      }
      console.log()
    })
  }

  // 兼容旧的顶层 chapters
  if (lv.chapters && lv.chapters.length) {
    console.log('  【顶层章节（旧结构）】')
    lv.chapters.forEach((ch, ci) => {
      console.log(`    [章节 ${ch.id || ci + 1}] ${ch.title}`)
      if (ch.problemIds && ch.problemIds.length) {
        console.log(`      必做题: ${ch.problemIds.join(', ')}`)
      }
    })
  }
}

await conn.close()
