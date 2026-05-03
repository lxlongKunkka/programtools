// 六级 cpp 去重
import path from 'path'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })
const APPLY = process.argv.includes('--apply')

const PLAN = {
  'cpp-6-7-3': { removeRequired: ['gesp6:21','gesp6:24','gesp6:26','gesp6:28','gesp6:29'] },
  'cpp-6-9-2': { removeRequired: ['gesp6:10','gesp6:11','gesp6:13'], removeOptional: ['gesp6:122'] },
  'cpp-6-8-5': { removeOptional: ['gesp6:144'] },
}

async function main() {
  const conn = mongoose.createConnection(process.env.APP_MONGODB_URI)
  const CL = conn.model('CourseLevel', new mongoose.Schema({}, { collection: 'courselevels', strict: false }))
  await conn.asPromise()
  const lv = await CL.findOne({ level: 6, group: /C\+\+/ })
  let touched = 0
  for (const t of lv.topics||[]) for (const c of t.chapters||[]) {
    const p = PLAN[c.id]; if (!p) continue
    const bR = (c.problemIds||[]).length, bO = (c.optionalProblemIds||[]).length
    if (p.removeRequired) c.problemIds = (c.problemIds||[]).filter(x=>!p.removeRequired.includes(x))
    if (p.removeOptional) c.optionalProblemIds = (c.optionalProblemIds||[]).filter(x=>!p.removeOptional.includes(x))
    console.log(`[${c.id}] R: ${bR}->${(c.problemIds||[]).length}  O: ${bO}->${(c.optionalProblemIds||[]).length}`)
    touched++
  }
  if (APPLY) { lv.markModified('topics'); await lv.save(); console.log(`Saved (${touched}).`) }
  else console.log(`[DRY-RUN] ${touched}`)
  await conn.close()
}
main().catch(e=>{console.error(e);process.exit(1)})
