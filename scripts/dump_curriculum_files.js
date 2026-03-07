// 导出每个章节教案为独立 Markdown 文件
import mongoose from 'mongoose'
import { createConnection } from 'mongoose'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
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

// 根目录
const outRoot = join(__dirname, '../curriculum_export')
mkdirSync(outRoot, { recursive: true })

// 清理文件名中的非法字符
function safeName(s) {
  return s.replace(/[\\/:*?"<>|]/g, '_').trim()
}

let totalFiles = 0
let skippedEmpty = 0

for (const lv of levels) {
  const levelDir = join(outRoot, `Level${lv.level}_${safeName(lv.title)}`)
  mkdirSync(levelDir, { recursive: true })

  // 写一个该等级的 README
  let readme = `# Level ${lv.level}：${lv.title}\n\n`
  if (lv.description) readme += `${lv.description.trim()}\n\n`
  readme += `---\n\n## 专题目录\n\n`

  const allChapters = []

  if (lv.topics && lv.topics.length) {
    lv.topics.forEach((topic, ti) => {
      const topicDir = join(levelDir, `${String(ti + 1).padStart(2, '0')}_${safeName(topic.title)}`)
      mkdirSync(topicDir, { recursive: true })

      readme += `### 专题 ${ti + 1}：${topic.title}\n\n`
      if (topic.description) readme += `> ${topic.description.trim().split('\n').find(l => l.trim()) || ''}\n\n`

      if (topic.chapters && topic.chapters.length) {
        topic.chapters.forEach((ch, ci) => {
          const chName = `${String(ci + 1).padStart(2, '0')}_${safeName(ch.title)}.md`
          readme += `- [\`${ch.id || '?'}\` ${ch.title}](./${`${String(ti + 1).padStart(2, '0')}_${safeName(topic.title)}`}/${chName})\n`

          // 构建章节文件内容
          let chMd = `# ${ch.title}\n\n`
          chMd += `> **章节 ID：** \`${ch.id || '?'}\`  \n`
          chMd += `> **所属专题：** 专题 ${ti + 1} — ${topic.title}  \n`
          chMd += `> **所属等级：** Level ${lv.level} — ${lv.title}\n\n`
          if (ch.optional) chMd += `> *(本章节为选修)*\n\n`
          chMd += `---\n\n`

          if (ch.problemIds && ch.problemIds.length) {
            chMd += `## 必做题（${ch.problemIds.length}）\n\n`
            ch.problemIds.forEach(pid => { chMd += `- \`${pid}\`\n` })
            chMd += '\n'
          }
          if (ch.optionalProblemIds && ch.optionalProblemIds.length) {
            chMd += `## 选做题（${ch.optionalProblemIds.length}）\n\n`
            ch.optionalProblemIds.forEach(pid => { chMd += `- \`${pid}\`\n` })
            chMd += '\n'
          }
          if (ch.resourceUrl) {
            chMd += `## 资源链接\n\n\`${ch.resourceUrl}\`\n\n`
          }
          if (ch.content && ch.content.trim()) {
            chMd += `## 教案内容\n\n${ch.content.trim()}\n`
            totalFiles++
          } else {
            chMd += `## 教案内容\n\n*(暂无教案)*\n`
            skippedEmpty++
            totalFiles++
          }

          writeFileSync(join(topicDir, chName), chMd, 'utf-8')
          allChapters.push({ topicDir, chName })
        })
      }
      readme += '\n'
    })
  }

  writeFileSync(join(levelDir, 'README.md'), readme, 'utf-8')
}

console.log(`✅ 导出完成`)
console.log(`📁 输出目录: ${outRoot}`)
console.log(`📄 共生成章节文件: ${totalFiles} 个（含 ${skippedEmpty} 个暂无教案）`)

await conn.close()
