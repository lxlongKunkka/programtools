import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const uri = process.env.HYDRO_MONGODB_URI || process.env.MONGODB_URI
const conn = mongoose.createConnection(uri)
const Doc = conn.model('Doc', new mongoose.Schema({}, { collection: 'document', strict: false }))
await conn.asPromise()

const byType = await Doc.aggregate([
  { $match: { domainId: 'atcoder' } },
  { $group: { _id: '$docType', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
console.log('domainId=atcoder 按 docType 分布:')
byType.forEach(r => console.log(`  docType ${r._id} → ${r.count} 条`))

// 题目通常是 docType=1，单独确认
const prob = await Doc.countDocuments({ domainId: 'atcoder', docType: 1 })
console.log(`\ndocType=1（题目）: ${prob}`)

await conn.close()
