/**
 * 修复脚本：将所有章节的 resourceUrl 更新为基于当前 topic 位置的正确 COS 路径
 * 用法：node scripts/fix_resource_urls.mjs [group] [--dry-run]
 * --dry-run: 只打印将要修改的内容，不实际写入数据库
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const APP_MONGODB_URI = process.env.APP_MONGODB_URI || 'mongodb://localhost:27017/programtools'
const COS_BASE = 'https://qimai-1312947209.cos.ap-shanghai.myqcloud.com/'

const chapterSchema = new mongoose.Schema({ id: String, title: String, resourceUrl: String, problemIds: [String], optional: Boolean })
const topicSchema = new mongoose.Schema({ title: String, chapters: [chapterSchema] })
const courseLevelSchema = new mongoose.Schema({ level: Number, group: String, label: String, subject: String, title: String, topics: [topicSchema] })

const conn = mongoose.createConnection(APP_MONGODB_URI)
const CourseLevel = conn.model('CourseLevel', courseLevelSchema)

function sanitize(str = '') {
  return str.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, '')
}

const isDryRun = process.argv.includes('--dry-run')
const groupArg = process.argv.slice(2).find(a => !a.startsWith('--'))
const groupFilter = groupArg || 'GESP C++ 认证课程'

conn.once('open', async () => {
  try {
    const levels = await CourseLevel.find({ group: groupFilter }).sort({ level: 1 })

    if (!levels.length) {
      const all = await CourseLevel.distinct('group')
      console.log('没找到该 group，现有:', all)
      process.exit(1)
    }

    const safeGroup = sanitize(groupFilter)
    let fixCount = 0
    let skipCount = 0

    console.log(`\n${isDryRun ? '[DRY RUN] ' : ''}开始修复 group="${groupFilter}"...`)
    console.log('─'.repeat(100))

    for (const lv of levels) {
      const safeLevel = sanitize(lv.title)
      let dirty = false

      for (const topic of lv.topics || []) {
        const safeTopic = sanitize(topic.title)

        for (let i = 0; i < topic.chapters.length; i++) {
          const ch = topic.chapters[i]
          if (!ch.resourceUrl) continue

          const safeChapter = sanitize(ch.title) + '.html'
          const correctKey = `courseware/${safeGroup}/${safeLevel}/${safeTopic}/${safeChapter}`
          const correctUrl = COS_BASE + correctKey

          // 如果已经正确，跳过
          if (ch.resourceUrl === correctUrl) {
            skipCount++
            continue
          }

          console.log(`\n[${ch.id}] "${ch.title}"`)
          console.log(`  旧: ${ch.resourceUrl}`)
          console.log(`  新: ${correctUrl}`)

          if (!isDryRun) {
            ch.resourceUrl = correctUrl
            dirty = true
          }

          fixCount++
        }
      }

      if (!isDryRun && dirty) {
        lv.markModified('topics')
        await lv.save()
      }
    }

    console.log('\n' + '─'.repeat(100))
    if (isDryRun) {
      console.log(`\n[DRY RUN] 将修复 ${fixCount} 个章节，跳过 ${skipCount} 个（已正确）`)
      console.log('如确认无误，去掉 --dry-run 参数重新运行以实际修复')
    } else {
      console.log(`\n✅ 修复完成：更新了 ${fixCount} 个章节，跳过 ${skipCount} 个（已正确）`)
    }

  } catch (err) {
    console.error('错误:', err)
  } finally {
    await conn.close()
  }
})
