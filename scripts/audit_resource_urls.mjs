/**
 * 审计脚本：找出所有 resourceUrl 路径与当前 topic 位置不匹配的章节
 * 用法：node scripts/audit_resource_urls.mjs [group]
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const APP_MONGODB_URI = process.env.APP_MONGODB_URI || 'mongodb://localhost:27017/programtools'

const chapterSchema = new mongoose.Schema({ id: String, title: String, resourceUrl: String, problemIds: [String], optional: Boolean })
const topicSchema = new mongoose.Schema({ title: String, chapters: [chapterSchema] })
const courseLevelSchema = new mongoose.Schema({ level: Number, group: String, label: String, subject: String, title: String, topics: [topicSchema] })

const conn = mongoose.createConnection(APP_MONGODB_URI)
const CourseLevel = conn.model('CourseLevel', courseLevelSchema)

function sanitize(str = '') {
  return str.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, '')
}

conn.once('open', async () => {
  try {
    const groupFilter = process.argv[2] || 'GESP C++ 认证课程'
    const levels = await CourseLevel.find({ group: groupFilter }).sort({ level: 1 })

    if (!levels.length) {
      const all = await CourseLevel.distinct('group')
      console.log('没找到该 group，现有:', all)
      process.exit(1)
    }

    const mismatch = []
    const noUrl = []
    const correct = []

    for (const lv of levels) {
      const safeLevel = sanitize(lv.title)
      const safeGroup = sanitize(groupFilter)

      for (const topic of lv.topics || []) {
        const safeTopic = sanitize(topic.title)

        for (const ch of topic.chapters || []) {
          if (!ch.resourceUrl) {
            noUrl.push({ level: lv.title, topic: topic.title, chapter: ch.title, id: ch.id })
            continue
          }

          const safeChapter = sanitize(ch.title) + '.html'
          const expectedKey = `courseware/${safeGroup}/${safeLevel}/${safeTopic}/${safeChapter}`

          // Check if the current resourceUrl contains the expected path segments
          const url = ch.resourceUrl
          const hasCorrectPath = url.includes(safeTopic) && url.includes(safeChapter)

          if (!hasCorrectPath) {
            // Extract what topic is actually in the URL
            const cosBase = 'qimai-1312947209.cos.ap-shanghai.myqcloud.com/'
            const urlPath = url.includes(cosBase) ? url.split(cosBase)[1] : url
            mismatch.push({
              level: lv.title,
              topic: topic.title,
              chapterId: ch.id,
              chapterTitle: ch.title,
              currentUrl: url,
              expectedKey,
              urlPath
            })
          } else {
            correct.push({ id: ch.id, title: ch.title })
          }
        }
      }
    }

    console.log(`\n📊 统计 (group="${groupFilter}")`)
    console.log(`  ✅ 路径正确: ${correct.length} 个章节`)
    console.log(`  ❌ 路径错误: ${mismatch.length} 个章节`)
    console.log(`  ⚪ 无 URL:   ${noUrl.length} 个章节`)

    if (mismatch.length > 0) {
      console.log('\n\n❌ 路径错误的章节：')
      console.log('─'.repeat(100))
      for (const m of mismatch) {
        console.log(`\n[${m.chapterId}] "${m.chapterTitle}"`)
        console.log(`  所在 Level : ${m.level}`)
        console.log(`  所在 Topic : ${m.topic}`)
        console.log(`  当前 URL   : ${m.currentUrl}`)
        console.log(`  正确路径   : ${m.expectedKey}`)
      }
    }

  } catch (err) {
    console.error('错误:', err)
  } finally {
    await conn.close()
  }
})
