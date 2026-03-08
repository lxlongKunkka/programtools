import mongoose from 'mongoose'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, 'server', '.env') })

const CL = mongoose.model('CourseLevel', new mongoose.Schema({
  level: Number,
  topics: [{
    title: String, description: String,
    chapters: [{ _id: false, id: String, title: String, content: String, contentType: String, resourceUrl: String, problemIds: [String], optionalProblemIds: [String], optional: Boolean }]
  }]
}))

await mongoose.connect(process.env.APP_MONGODB_URI)
const doc9 = await CL.findOne({ level: 9 })

// 1. 异或线性基 → 并入 数学进阶
const linearTopic = doc9.topics.find(t => t.title.includes('线性数据结构'))
const xorChapter = linearTopic.chapters.find(c => c.title?.includes('异或'))
const mathTopic = doc9.topics.find(t => t.title.includes('数学进阶'))
mathTopic.chapters.push(xorChapter)
console.log('异或线性基 并入 数学进阶，现有', mathTopic.chapters.length, '章')

// 2. 删除 线性数据结构 专题（已清空）
const linearIdx = doc9.topics.findIndex(t => t.title.includes('线性数据结构'))
doc9.topics.splice(linearIdx, 1)
console.log('删除 线性数据结构 专题')

// 3. 删除 L9/线段树 专题（与L8重复）
const segIdx = doc9.topics.findIndex(t => t.title === '线段树')
if (segIdx !== -1) {
  console.log('删除 L9/线段树（重复）:', doc9.topics[segIdx].chapters.length, '章')
  doc9.topics.splice(segIdx, 1)
}

// 4. 删除 Tarjan算法 专题（与图论进阶重复）
const tarjanIdx = doc9.topics.findIndex(t => t.title === 'Tarjan 算法')
if (tarjanIdx !== -1) {
  console.log('删除 Tarjan算法（与图论进阶重复）')
  doc9.topics.splice(tarjanIdx, 1)
}

await doc9.save()

console.log('\nLevel 9 最终结构:')
doc9.topics.forEach((t, i) => {
  console.log(`${i + 1}. ${t.title} (${t.chapters.length}章)`)
  t.chapters.forEach(c => console.log('   ' + c.title))
})

await mongoose.disconnect()
