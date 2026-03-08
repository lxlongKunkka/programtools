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

const doc7 = await CL.findOne({ level: 7 })
const doc9 = await CL.findOne({ level: 9 })

// 1. 从 L9/线性数据结构 摘出单调栈、单调队列两章
const linearTopic = doc9.topics.find(t => t.title.includes('线性数据结构'))
const monoChapters = linearTopic.chapters.filter(c => c.title?.includes('单调'))
linearTopic.chapters = linearTopic.chapters.filter(c => !c.title?.includes('单调'))
console.log('从L9摘出:', monoChapters.map(c => c.title))
console.log('L9/线性数据结构 剩余:', linearTopic.chapters.length, '章')

// 2. L7 新增 单调栈与单调队列 专题
const monoTopic = {
  title: '单调栈与单调队列',
  description: '在栈与队列基础上维护单调性：单调栈 O(n) 解决下一个更大/更小元素与柱状图最大矩形；单调队列 O(n) 求滑动窗口最值，并作为区间DP和斜率优化DP的核心工具。',
  chapters: monoChapters
}

// 插入表达式求值之后
const exprIdx = doc7.topics.findIndex(t => t.title.includes('表达式'))
doc7.topics.splice(exprIdx + 1, 0, monoTopic)

// 3. 重排 L7 保证顺序
const f7 = kw => doc7.topics.find(t => new RegExp(kw).test(t.title))
doc7.topics = ['DFS', 'BFS', '快速幂', '倍增', '离散', '哈希', '表达式', '单调', '区间', '树上', '二维']
  .map(f7).filter(Boolean)

await doc7.save()
await doc9.save()

console.log('\nLevel 7 最终结构:')
doc7.topics.forEach((t, i) => console.log(`${i + 1}. ${t.title} (${t.chapters.length}章)`))
console.log('\nL9/线性数据结构 剩余章节:')
linearTopic.chapters.forEach(c => console.log(' ', c.title))

await mongoose.disconnect()
