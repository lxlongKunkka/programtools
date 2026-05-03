// 列出 GESP 四级 cpp 章节所有题目 pid+标题
import path from 'path'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

async function main() {
  const app = mongoose.createConnection(process.env.APP_MONGODB_URI)
  const CL = app.model('CourseLevel', new mongoose.Schema({}, { collection: 'courselevels', strict: false }))
  await app.asPromise()
  const lv = await CL.findOne({ level: 4, group: /C\+\+/ }).lean()
  const allPids = new Set()
  for (const t of lv.topics||[]) for (const c of t.chapters||[]) {
    for (const id of c.problemIds||[]) allPids.add(id)
    for (const id of c.optionalProblemIds||[]) allPids.add(id)
  }
  await app.close()

  const hy = mongoose.createConnection(process.env.HYDRO_MONGODB_URI)
  const D = hy.model('Doc', new mongoose.Schema({}, { collection: 'document', strict: false }))
  await hy.asPromise()
  const titleMap = {}
  for (const pid of allPids) {
    const [domain, docId] = pid.split(':')
    const d = await D.findOne({ domainId: domain, docId: Number(docId), docType: 10 }).select({ title:1, tag:1, nAccept:1, nSubmit:1 }).lean()
    if (d) titleMap[pid] = { title: d.title, tags: d.tag || [], ac: d.nSubmit ? +(d.nAccept/d.nSubmit).toFixed(2) : null, ns: d.nSubmit }
  }
  await hy.close()

  for (const t of lv.topics||[]) for (const c of t.chapters||[]) {
    if (!c.id?.startsWith('cpp-4-')) continue
    if (!(c.problemIds||[]).length && !(c.optionalProblemIds||[]).length) continue
    console.log(`\n[${c.id}] ${c.title}`)
    for (const pid of c.problemIds||[]) {
      const m = titleMap[pid]; console.log(`  R ${pid} | ac=${m?.ac} ns=${m?.ns} | ${m?.title} | ${(m?.tags||[]).slice(0,5).join(',')}`)
    }
    for (const pid of c.optionalProblemIds||[]) {
      const m = titleMap[pid]; console.log(`  O ${pid} | ac=${m?.ac} ns=${m?.ns} | ${m?.title} | ${(m?.tags||[]).slice(0,5).join(',')}`)
    }
  }
}
main().catch(e=>{console.error(e);process.exit(1)})
