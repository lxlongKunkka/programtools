/**
 * fetch_atcoder_batch_content.mjs
 * 用法: node scripts/fetch_atcoder_batch_content.mjs --from=1967 --to=1996
 * 输出: changelogs/atcoder-batch-content-XXXX-YYYY.json
 */
import path from 'path'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const fromArg = parseInt(process.argv.find(a => a.startsWith('--from='))?.split('=')[1] || '1967')
const toArg   = parseInt(process.argv.find(a => a.startsWith('--to='))?.split('=')[1]   || '1996')

const HYDRO_URI = process.env.HYDRO_MONGODB_URI || process.env.MONGODB_URI
const conn = mongoose.createConnection(HYDRO_URI)
const Doc = conn.model('Document', new mongoose.Schema({}, { collection: 'document', strict: false }))
await conn.asPromise()

const docs = await Doc.find(
  { domainId: 'atcoder', docType: 10, docId: { $gte: fromArg, $lte: toArg } },
  { docId: 1, title: 1, tag: 1, content: 1, _id: 0 }
).sort({ docId: 1 }).lean()

const rows = docs.map(d => ({
  pid: `atcoder:${d.docId}`,
  title: d.title || '',
  tags: (d.tag || []).join(','),
  content: (d.content || '').slice(0, 800),  // 截取前800字符够判断
}))

const outFile = path.join(__dirname, `../changelogs/atcoder-batch-content-${fromArg}-${toArg}.json`)
fs.writeFileSync(outFile, JSON.stringify(rows, null, 2))
console.log(`✅ 已写出 ${rows.length} 题 → ${outFile}`)
rows.forEach(r => {
  console.log(`\n─── ${r.pid} ${r.title}`)
  console.log(`    tags: ${r.tags}`)
  console.log(`    ${r.content.replace(/\n/g, ' ').slice(0, 200)}`)
})

await conn.close()
