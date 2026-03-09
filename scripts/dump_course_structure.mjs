/**
 * 诊断脚本：打印指定课程分组的所有 topic→chapter 结构
 * 用法：node scripts/dump_course_structure.mjs [group名称]
 * 示例：node scripts/dump_course_structure.mjs "GESPC认证课程"
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const APP_MONGODB_URI = process.env.APP_MONGODB_URI || 'mongodb://localhost:27017/programtools'

const chapterSchema = new mongoose.Schema({
  id: String, title: String, resourceUrl: String, problemIds: [String]
})
const topicSchema = new mongoose.Schema({
  title: String, chapters: [chapterSchema]
})
const courseLevelSchema = new mongoose.Schema({
  level: Number, group: String, label: String, subject: String, title: String, topics: [topicSchema]
})

const conn = mongoose.createConnection(APP_MONGODB_URI)
const CourseLevel = conn.model('CourseLevel', courseLevelSchema)

const groupFilter = process.argv[2] || 'GESPC认证课程'

conn.once('open', async () => {
  try {
    const levels = await CourseLevel.find({ group: groupFilter }).sort({ level: 1 })

    if (!levels.length) {
      console.log(`❌ 没找到 group="${groupFilter}" 的课程，检查名称是否正确`)
      const all = await CourseLevel.distinct('group')
      console.log('现有 group 列表:', all)
      process.exit(1)
    }

    console.log(`\n✅ 找到 ${levels.length} 个 Level，group="${groupFilter}"\n`)
    console.log('=' .repeat(80))

    for (const lv of levels) {
      console.log(`\n📘 Level ${lv.level}  [${lv._id}]  ${lv.title}`)
      if (!lv.topics || lv.topics.length === 0) {
        console.log('   （无 topic）')
        continue
      }
      for (const topic of lv.topics) {
        console.log(`\n  📂 Topic [${topic._id}]  "${topic.title}"`)
        if (!topic.chapters || topic.chapters.length === 0) {
          console.log('     （无章节）')
          continue
        }
        for (const ch of topic.chapters) {
          console.log(`     📄 [${ch.id || '-'}]  "${ch.title}"`)
        }
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log('\n如需修复，请告知：哪个章节（id/title）应该移动到哪个 topic\n')
  } catch (err) {
    console.error('错误:', err)
  } finally {
    await conn.close()
  }
})
