import mongoose from 'mongoose'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, 'server', '.env') })

const CL = mongoose.model('CourseLevel', new mongoose.Schema({
  level: Number, title: String, description: String,
  topics: [{
    title: String, description: String,
    chapters: [{ _id: false, id: String, title: String }]
  }]
}))

await mongoose.connect(process.env.APP_MONGODB_URI)
const docs = await CL.find({}).sort({ level: 1 })

let md = `# GESP C++ 课程体系 — 完整大纲\n\n`
md += `> 导出时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n\n`

let totalTopics = 0, totalChapters = 0

for (const doc of docs) {
  const topicsCount = doc.topics.length
  const chaptersCount = doc.topics.reduce((s, t) => s + t.chapters.length, 0)
  totalTopics += topicsCount
  totalChapters += chaptersCount

  md += `---\n\n## Level ${doc.level}：${doc.title || ''}\n\n`
  if (doc.description) md += `> ${doc.description}\n\n`
  md += `**${topicsCount} 专题 · ${chaptersCount} 章节**\n\n`

  doc.topics.forEach((t, ti) => {
    md += `### ${ti + 1}. ${t.title}（${t.chapters.length} 章）\n\n`
    if (t.description) md += `_${t.description}_\n\n`
    t.chapters.forEach((c, ci) => {
      md += `${ci + 1}. \`${c.id}\` ${c.title}\n`
    })
    md += '\n'
  })
}

md += `---\n\n## 汇总\n\n`
md += `| 统计项 | 数量 |\n|--------|------|\n`
md += `| 总级别 | ${docs.length} |\n`
md += `| 总专题 | ${totalTopics} |\n`
md += `| 总章节 | ${totalChapters} |\n`

const outPath = path.join(__dirname, 'curriculum_export.md')
fs.writeFileSync(outPath, md, 'utf8')
console.log(`✓ 已导出到 curriculum_export.md`)
console.log(`  总级别: ${docs.length}，总专题: ${totalTopics}，总章节: ${totalChapters}`)

await mongoose.disconnect()
