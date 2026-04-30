// 临时脚本：拉取题面用于人工复核
import dotenv from 'dotenv'
import path from 'path'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })
const HYDRO_URI = process.env.HYDRO_MONGODB_URI || process.env.MONGODB_URI
await mongoose.connect(HYDRO_URI)
const Doc = mongoose.model('Document', new mongoose.Schema({}, { collection: 'document', strict: false }))
for (const arg of process.argv.slice(2)) {
  const [domainId, docIdStr] = arg.split(':')
  const docId = Number(docIdStr)
  const doc = await Doc.findOne({ domainId, docId, docType: 10 }).lean()
  if (!doc) { console.log(`\n##### ${arg} | NOT FOUND #####`); continue }
  const tags = (doc.tag || []).join(',')
  const ac = doc.nSubmit > 0 ? (doc.nAccept / doc.nSubmit).toFixed(3) : 'N/A'
  console.log(`\n##### ${arg} | ${doc.title} | tags=[${tags}] | ac=${ac} #####`)
  let content = doc.content || ''
  try { const c = JSON.parse(content); content = c.zh || c.en || content } catch {}
  console.log(String(content).slice(0, 1500))
}
process.exit(0)
