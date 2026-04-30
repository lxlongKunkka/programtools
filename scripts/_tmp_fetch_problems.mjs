/**
 * 拉取指定 pid 列表的题目正文（中文），输出到 stdout。
 * 用法：node scripts/_tmp_fetch_problems.mjs Level1:282 Level1:399 ...
 */
import dotenv from 'dotenv'
import path from 'path'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const HYDRO_URI = process.env.HYDRO_MONGODB_URI || process.env.MONGODB_URI

const pids = process.argv.slice(2)
if (!pids.length) { console.error('usage: pids...'); process.exit(1) }

const conn = mongoose.createConnection(HYDRO_URI)
const Document = conn.model('Document', new mongoose.Schema({}, { collection: 'document', strict: false }))
await conn.asPromise()

const groups = new Map()
for (const pid of pids) {
  const [d, n] = pid.split(':')
  if (!groups.has(d)) groups.set(d, [])
  groups.get(d).push(Number(n))
}

const found = new Map()
for (const [domain, ids] of groups) {
  const docs = await Document.find({ domainId: domain, docId: { $in: ids } })
    .select({ docId: 1, domainId: 1, title: 1, tag: 1, content: 1, nAccept: 1, nSubmit: 1 }).lean()
  for (const d of docs) found.set(`${d.domainId}:${d.docId}`, d)
}

for (const pid of pids) {
  const d = found.get(pid)
  if (!d) { console.log(`\n##### ${pid} NOT FOUND #####`); continue }
  let zh = ''
  try { const o = JSON.parse(d.content || ''); zh = o.zh || o.en || d.content } catch { zh = d.content || '' }
  console.log(`\n##### ${pid} | ${d.title} | tags=[${(d.tag||[]).join(',')}] | ac=${d.nSubmit?(d.nAccept/d.nSubmit).toFixed(3):'N/A'} #####`)
  console.log(String(zh).slice(0, 1800))
}
await conn.close()
