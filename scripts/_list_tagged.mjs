import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })
const HYDRO_URI = process.env.HYDRO_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/hydro'
const GESP_LEVELS = new Set(['gesp1','gesp2','gesp3','gesp4','gesp5','gesp6','gesp7','gesp8','gesp9','gesp10'])
const conn = mongoose.createConnection(HYDRO_URI)
const Document = conn.model('Document', new mongoose.Schema({}, { collection: 'document', strict: false }))
await conn.asPromise()

const docs = await Document.find({ domainId: 'atcoder', docType: 10 }).select({ docId: 1, title: 1, tag: 1 }).lean()
const tagged = docs.filter(d => (d.tag || []).some(t => !GESP_LEVELS.has(t)))
tagged.sort((a, b) => (a.title || '').localeCompare(b.title || ''))

const lines = tagged.map(d => {
  const kp = (d.tag || []).filter(t => !GESP_LEVELS.has(t))
  return `${d.docId}\t${(d.title || '')}\t${kp.join(', ')}`
})

console.log(`共 ${tagged.length} 道题有知识点标签\n`)
fs.writeFileSync(path.join(__dirname, 'atcoder_tagged_problems.tsv'), 'docId\ttitle\t知识点标签\n' + lines.join('\n'), 'utf-8')
console.log('已写入 scripts/atcoder_tagged_problems.tsv')
lines.slice(0, 30).forEach(l => console.log(l))

await conn.close()
