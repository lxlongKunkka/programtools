// 导出所有 GESP C++ 课程大纲到 Markdown 文件
import mongoose from 'mongoose'
import { createConnection } from 'mongoose'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const { APP_MONGODB_URI } = await import('../server/config.js')

const conn = createConnection(APP_MONGODB_URI)
await new Promise((resolve, reject) => {
  conn.once('connected', resolve)
  conn.once('error', reject)
})

const chapterSchema = new mongoose.Schema({
  id: String, title: String, content: String, contentType: String,
  resourceUrl: String, problemIds: [String], optionalProblemIds: [String], optional: Boolean
})
const topicSchema = new mongoose.Schema({ title: String, description: String, chapters: [chapterSchema] })
const courseLevelSchema = new mongoose.Schema({
  level: Number, group: String, label: String, subject: String,
  title: String, description: String, topics: [topicSchema], chapters: [chapterSchema]
})
const CourseLevel = conn.model('CourseLevel', courseLevelSchema)

const levels = await CourseLevel.find({ group: 'GESP C++ 认证课程' }).sort({ level: 1 }).lean()

let md = `# GESP C++ 课程体系备份\n\n> 导出时间：${new Date().toLocaleString('zh-CN')}\n\n---\n\n`

for (const lv of levels) {
  md += `## Level ${lv.level}：${lv.title}\n\n`
  if (lv.description) {
    const firstLine = lv.description.trim().split('\n').find(l => l.trim()) || ''
    md += `> ${firstLine.replace(/^##\s*/, '')}\n\n`
  }

  if (lv.topics && lv.topics.length) {
    lv.topics.forEach((topic, ti) => {
      md += `### 专题 ${ti + 1}：${topic.title}\n\n`
      if (topic.description) {
        const desc = topic.description.trim().split('\n').find(l => l.trim()) || ''
        md += `> ${desc.replace(/^##\s*/, '').replace(/^#+\s*/, '')}\n\n`
      }
      if (topic.chapters && topic.chapters.length) {
        topic.chapters.forEach(ch => {
          const optional = ch.optional ? ' *(选修)*' : ''
          md += `#### \`${ch.id || '?'}\` ${ch.title}${optional}\n\n`
          if (ch.problemIds && ch.problemIds.length) {
            md += `**必做题（${ch.problemIds.length}）：** \`${ch.problemIds.join('` `')}\`\n\n`
          }
          if (ch.optionalProblemIds && ch.optionalProblemIds.length) {
            md += `**选做题（${ch.optionalProblemIds.length}）：** \`${ch.optionalProblemIds.join('` `')}\`\n\n`
          }
          if (ch.content && ch.content.trim()) {
            md += `<details>\n<summary>📄 教案内容</summary>\n\n${ch.content.trim()}\n\n</details>\n\n`
          }
          if (ch.resourceUrl) {
            md += `**资源链接：** \`${ch.resourceUrl}\`\n\n`
          }
        })
      } else {
        md += `*(暂无章节)*\n\n`
      }
    })
  }

  if (lv.chapters && lv.chapters.length) {
    md += `### 顶层章节（旧结构）\n\n`
    lv.chapters.forEach(ch => {
      md += `#### \`${ch.id || '?'}\` ${ch.title}\n\n`
      if (ch.problemIds && ch.problemIds.length) {
        md += `**必做题：** \`${ch.problemIds.join('` `')}\`\n\n`
      }
      if (ch.content && ch.content.trim()) {
        md += `<details>\n<summary>📄 教案内容</summary>\n\n${ch.content.trim()}\n\n</details>\n\n`
      }
    })
  }

  md += `---\n\n`
}

const outPath = join(__dirname, '../GESP_CURRICULUM_BACKUP.md')
writeFileSync(outPath, md, 'utf-8')
console.log(`✅ 已写入: ${outPath}`)
console.log(`共 ${levels.length} 个等级，文档总行数: ${md.split('\n').length}`)

await conn.close()
