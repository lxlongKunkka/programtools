// 找出 GESP 五级 cpp 内重复 pid 及其所在章节
import path from 'path'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

async function main() {
  const conn = mongoose.createConnection(process.env.APP_MONGODB_URI)
  const CL = conn.model('CourseLevel', new mongoose.Schema({}, { collection: 'courselevels', strict: false }))
  await conn.asPromise()
  const lv = await CL.findOne({ level: 5, group: /C\+\+/ }).lean()
  const map = new Map() // pid -> [{chId, kind}]
  for (const t of lv.topics||[]) for (const c of t.chapters||[]) {
    for (const p of c.problemIds||[]) { if(!map.has(p)) map.set(p,[]); map.get(p).push(`${c.id}:R`) }
    for (const p of c.optionalProblemIds||[]) { if(!map.has(p)) map.set(p,[]); map.get(p).push(`${c.id}:O`) }
  }
  await conn.close()
  const dups = [...map.entries()].filter(([,v])=>v.length>1)
  console.log(`Duplicates: ${dups.length}`)
  for (const [pid, locs] of dups) console.log(`  ${pid}  ->  ${locs.join('  |  ')}`)
}
main().catch(e=>{console.error(e);process.exit(1)})
