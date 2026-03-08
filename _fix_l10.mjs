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
const doc = await CL.findOne({ level: 10 })

// 1. 删除可持久化数据结构前两章（主席树原理+区间第k小），改名
const persTopic = doc.topics.find(t => t.title.includes('可持久化'))
persTopic.chapters = persTopic.chapters.filter(c => !c.id.match(/10-2-1|10-2-2/))
persTopic.title = '可持久化数据结构进阶'
persTopic.description = '在掌握可持久化线段树（主席树）基础后，深入可持久化并查集的版本回退技巧，并综合应用各类可持久化结构解决带版本查询的复杂问题。'
console.log('可持久化数据结构进阶 剩余:', persTopic.chapters.length, '章')
persTopic.chapters.forEach(c => console.log('  ', c.title))

// 2. 从 树上高级算法 摘出 KD树，插入 高级数据结构
const treeAdvTopic = doc.topics.find(t => t.title.includes('树上高级'))
const kdChapter = treeAdvTopic.chapters.find(c => c.title?.includes('KD'))
treeAdvTopic.chapters = treeAdvTopic.chapters.filter(c => !c.title?.includes('KD'))
console.log('\n树上高级算法 删除 KD树，剩', treeAdvTopic.chapters.length, '章')

const advDsTopic = doc.topics.find(t => t.title.includes('高级数据结构'))
advDsTopic.chapters.push(kdChapter)
console.log('高级数据结构 加入 KD树，现有', advDsTopic.chapters.length, '章')

await doc.save()

console.log('\nLevel 10 最终结构:')
doc.topics.forEach((t, i) => {
  console.log(`${i + 1}. ${t.title} (${t.chapters.length}章)`)
  t.chapters.forEach(c => console.log('   ' + c.title))
})

await mongoose.disconnect()
