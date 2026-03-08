import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, 'server/.env') })
const DRY_RUN = process.argv.includes('--dry-run')
const chapterSchema = new mongoose.Schema({ id: String, title: String, content: String, contentType: String, resourceUrl: String, problemIds: [String], optionalProblemIds: [String], optional: Boolean }, { _id: false })
const topicSchema = new mongoose.Schema({ title: String, description: String, chapters: [chapterSchema] }, { _id: false })
const courseLevelSchema = new mongoose.Schema({ level: Number, group: String, label: String, subject: String, title: String, description: String, topics: [topicSchema], chapters: [chapterSchema] })
const CourseLevel = mongoose.model('CourseLevel', courseLevelSchema)

await mongoose.connect(process.env.APP_MONGODB_URI)
const doc = await CourseLevel.findOne({ level: 2 })
const topics = doc.topics

const loopTopic = topics.find(t => t.title === '循环进阶')
const nestTopic = topics.find(t => t.title?.includes('嵌套结构'))

if (!loopTopic || !nestTopic) { console.log('未找到专题'); process.exit(1) }

console.log(`循环进阶: ${loopTopic.chapters.length} 章`)
console.log(`嵌套结构: ${nestTopic.chapters.length} 章 →`, nestTopic.chapters.map(c => c.title).join(', '))

if (!DRY_RUN) {
  // 将嵌套结构的章节追加到循环进阶末尾
  loopTopic.chapters.push(...nestTopic.chapters)
  loopTopic.description = '深入掌握 while/do-while 循环，学习循环累加、统计与数位拆解，再通过双层循环、九九乘法表等嵌套结构例题，全面强化循环的实战能力。'
  // 删除嵌套结构专题
  const idx = topics.findIndex(t => t.title?.includes('嵌套结构'))
  topics.splice(idx, 1)
  doc.topics = topics
  await doc.save()
  console.log(`\n合并后循环进阶: ${loopTopic.chapters.length} 章`)
  console.log('专题列表:')
  topics.forEach((t, i) => console.log(`  ${i+1}. ${t.title} (${t.chapters.length}章)`))
  console.log('\n✓ 已保存')
} else {
  console.log(`\n合并后循环进阶将有 ${loopTopic.chapters.length + nestTopic.chapters.length} 章`)
}
await mongoose.disconnect()
