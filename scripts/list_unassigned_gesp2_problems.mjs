/**
 * 列出 gesp2 域所有题目，标记哪些已被 GESP 二级 (C++) 章节使用，哪些可补充。
 * 用法：node scripts/list_unassigned_gesp2_problems.mjs --out=changelogs/gesp2-unassigned-2026-04-30.json
 */
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const APP_URI = process.env.APP_MONGODB_URI || 'mongodb://localhost:27017/programtools'
const HYDRO_URI = process.env.HYDRO_MONGODB_URI || process.env.MONGODB_URI

function getArg(name, fallback = '') {
  const prefix = `--${name}=`
  const m = process.argv.find(a => a.startsWith(prefix))
  return m ? m.slice(prefix.length) : fallback
}

const outFile = getArg('out', 'changelogs/gesp2-unassigned-latest.json')

const chapterSchema = new mongoose.Schema({
  id: String, title: String,
  problemIds: [String], optionalProblemIds: [String]
}, { _id: false, strict: false })
const topicSchema = new mongoose.Schema({ title: String, chapters: [chapterSchema] }, { _id: false, strict: false })
const courseLevelSchema = new mongoose.Schema({
  level: Number, group: String, subject: String, title: String, topics: [topicSchema]
}, { collection: 'courselevels', strict: false })

async function main() {
  const appConn = mongoose.createConnection(APP_URI)
  const CourseLevel = appConn.model('CourseLevel', courseLevelSchema)
  await appConn.asPromise()

  const levels = await CourseLevel.find({ level: 2 }).lean()
  // pick the C++ doc (group includes "C++" 或 subject 为 'C++'，排除 Python)
  const cppLevel = levels.find(l => {
    const g = l.group || ''
    const s = l.subject || ''
    if (/Python/i.test(g) || /Python/i.test(s)) return false
    return /C\+\+/.test(g) || s === 'C++' || (!s && !g)
  })
  if (!cppLevel) {
    console.error('No C++ Level 2 doc found. Levels found:', levels.map(l => ({ id: l._id, group: l.group, subject: l.subject })))
    process.exit(1)
  }
  console.log(`Found C++ L2 doc: group="${cppLevel.group}" subject="${cppLevel.subject}" topics=${(cppLevel.topics || []).length}`)
  const usedSet = new Map() // pid -> {chapterId, kind}
  for (const t of cppLevel?.topics || []) {
    for (const c of t.chapters || []) {
      for (const pid of c.problemIds || []) usedSet.set(pid, { chapterId: c.id, chapterTitle: c.title, kind: 'required' })
      for (const pid of c.optionalProblemIds || []) {
        if (!usedSet.has(pid)) usedSet.set(pid, { chapterId: c.id, chapterTitle: c.title, kind: 'optional' })
      }
    }
  }
  await appConn.close()

  const hydroConn = mongoose.createConnection(HYDRO_URI)
  const Document = hydroConn.model('Document', new mongoose.Schema({}, { collection: 'document', strict: false }))
  await hydroConn.asPromise()

  const docs = await Document.find({ domainId: 'gesp2' })
    .select({ docId: 1, domainId: 1, title: 1, tag: 1, nAccept: 1, nSubmit: 1, content: 1 })
    .lean()

  function preview(content) {
    if (!content) return ''
    let s = String(content)
    try {
      const obj = JSON.parse(s)
      if (obj && typeof obj === 'object') s = obj.zh || obj.en || ''
    } catch {}
    return s.replace(/\s+/g, ' ').slice(0, 220)
  }

  const all = docs.map(d => {
    const pid = `${d.domainId}:${d.docId}`
    const used = usedSet.get(pid)
    return {
      pid,
      title: d.title,
      tags: Array.isArray(d.tag) ? d.tag : [],
      acRate: d.nSubmit ? Number((d.nAccept / d.nSubmit).toFixed(3)) : null,
      used: used || null,
      preview: preview(d.content)
    }
  }).sort((a, b) => Number(a.pid.split(':')[1]) - Number(b.pid.split(':')[1]))

  await hydroConn.close()

  const unassigned = all.filter(p => !p.used)
  const out = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalGesp2Problems: all.length,
      usedByCppL2: all.length - unassigned.length,
      unassigned: unassigned.length
    },
    unassigned,
    used: all.filter(p => p.used)
  }

  const outPath = path.isAbsolute(outFile) ? outFile : path.join(__dirname, '..', outFile)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2))
  console.log(`Wrote ${outPath}`)
  console.log(`Total gesp2 problems: ${all.length}`)
  console.log(`Used by C++ L2: ${all.length - unassigned.length}`)
  console.log(`Unassigned: ${unassigned.length}`)
}

main().catch(e => { console.error(e); process.exit(1) })
