// 为 GESP 四级冒泡/选择/插入空章节检索候选
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })
const APP_URI = process.env.APP_MONGODB_URI || 'mongodb://localhost:27017/programtools'
const HYDRO_URI = process.env.HYDRO_MONGODB_URI || process.env.MONGODB_URI

const CHAPTERS = [
  { id: 'cpp-4-6-1', title: '冒泡排序', tagRe: /(冒泡|排序)/ },
  { id: 'cpp-4-6-2', title: '选择排序', tagRe: /(选择排序|排序)/ },
  { id: 'cpp-4-6-3', title: '插入排序', tagRe: /(插入排序|排序)/ },
]

const courseLevelSchema = new mongoose.Schema({}, { collection: 'courselevels', strict: false })

async function main() {
  const appConn = mongoose.createConnection(APP_URI)
  const CourseLevel = appConn.model('CourseLevel', courseLevelSchema)
  await appConn.asPromise()
  const cppLevels = await CourseLevel.find({ level: { $in: [1, 2, 3, 4] }, group: /C\+\+/ }).lean()
  const usedSet = new Set()
  for (const lv of cppLevels) for (const t of (lv.topics||[])) for (const c of (t.chapters||[])) {
    for (const id of (c.problemIds||[])) usedSet.add(id)
    for (const id of (c.optionalProblemIds||[])) usedSet.add(id)
  }
  await appConn.close()
  console.error(`Used (cpp L1-L4): ${usedSet.size}`)

  const hydroConn = mongoose.createConnection(HYDRO_URI)
  const Document = hydroConn.model('Document', new mongoose.Schema({}, { collection: 'document', strict: false }))
  await hydroConn.asPromise()
  const cursor = Document.find({
    docType: 10,
    domainId: { $in: ['Level1', 'Level2', 'Level3', 'Level4', 'gesp3', 'gesp4', 'atcoder'] }
  }).select({ docId: 1, domainId: 1, title: 1, tag: 1, nAccept: 1, nSubmit: 1 }).lean().cursor()

  const buckets = {}
  for (const ch of CHAPTERS) buckets[ch.id] = []
  let scanned = 0
  for await (const doc of cursor) {
    scanned++
    const pid = `${doc.domainId}:${doc.docId}`
    if (usedSet.has(pid)) continue
    const tags = (doc.tag || []).map(String)
    if (!tags.length) continue
    if (doc.nSubmit < 5) continue
    const ac = doc.nAccept / doc.nSubmit
    if (ac < 0.2) continue
    const isAdvanced = tags.some(t => /(gesp[5-9]|NOIP|提高组|动态规划|图论|线段树|并查集|网络流|二分图)/i.test(t))
    if (isAdvanced) continue
    for (const ch of CHAPTERS) {
      if (!tags.some(t => ch.tagRe.test(t))) continue
      // 排序入门：偏好 Level2/Level3/gesp3/gesp4 + ac 0.3-0.85
      buckets[ch.id].push({ pid, title: doc.title, tags, ac: Number(ac.toFixed(3)), nSubmit: doc.nSubmit })
    }
  }
  await hydroConn.close()

  for (const ch of CHAPTERS) {
    buckets[ch.id].sort((a, b) => {
      const score = (x) => {
        let s = 0
        if (x.tags.some(t => /冒泡/.test(t))) s += (ch.id === 'cpp-4-6-1' ? 5 : -2)
        if (x.tags.some(t => /选择排序/.test(t))) s += (ch.id === 'cpp-4-6-2' ? 5 : 0)
        if (x.tags.some(t => /插入排序/.test(t))) s += (ch.id === 'cpp-4-6-3' ? 5 : 0)
        if (x.tags.some(t => /gesp4|Level4/.test(t))) s += 3
        if (x.tags.some(t => /gesp3|Level3/.test(t))) s += 2
        if (x.tags.some(t => /Level2/.test(t))) s += 1
        if (x.ac >= 0.35 && x.ac <= 0.85) s += 2
        return s
      }
      return score(b) - score(a)
    })
    buckets[ch.id] = buckets[ch.id].slice(0, 20)
  }

  const out = path.resolve(__dirname, '../changelogs/gesp4-sort-candidates.json')
  fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), scanned, buckets }, null, 2))
  console.error(`scanned=${scanned} -> ${out}`)
  for (const ch of CHAPTERS) {
    console.log(`\n## ${ch.id} ${ch.title} (${buckets[ch.id].length})`)
    for (const c of buckets[ch.id].slice(0, 12)) console.log(`  ${c.pid} | ac=${c.ac} | ${c.title} | tags=${c.tags.slice(0,6).join(',')}`)
  }
}
main().catch(e => { console.error(e); process.exit(1) })
