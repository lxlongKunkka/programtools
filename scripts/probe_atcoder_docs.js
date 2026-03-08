/**
 * probe_atcoder_docs.js
 * 查询 DB 中 AtCoder 题目的实际结构（title/tag/pid/domainId）
 * 用法：node scripts/probe_atcoder_docs.js
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const HYDRO_URI = process.env.HYDRO_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/hydro'

const conn = mongoose.createConnection(HYDRO_URI)
const Document = conn.model('Document', new mongoose.Schema({}, { collection: 'document', strict: false }))

await conn.asPromise()
console.log('Connected:', HYDRO_URI.replace(/:[^:@]*@/, ':***@'))

// 找标题含 [ABC 的题目
const docs = await Document.find(
  { title: { $regex: '\\[ABC', $options: 'i' } },
  { _id: 0, docId: 1, title: 1, pid: 1, domainId: 1, tag: 1 }
).limit(15).lean()

console.log(`\n找到 ${docs.length} 道 AtCoder 题目样本：\n`)
for (const d of docs) {
  console.log({
    docId:    d.docId,
    pid:      d.pid,
    domainId: d.domainId,
    title:    d.title,
    tag:      d.tag,
  })
}

// 统计总量
const total = await Document.countDocuments({ title: { $regex: '\\[ABC', $options: 'i' } })
console.log(`\n总计 [ABC...] 格式题目：${total} 道`)

await conn.close()
