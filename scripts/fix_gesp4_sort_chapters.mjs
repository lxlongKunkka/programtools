// 修复 GESP 四级排序三章
// cpp-4-6-1 冒泡：移除 CF800L:44, CF800L:55；新增 R: Level2:8, atcoder:2237
// cpp-4-6-2 选择：新增 R: atcoder:1675, Level2:267
// cpp-4-6-3 插入：新增 R: atcoder:1682, atcoder:1458
import path from 'path'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const APPLY = process.argv.includes('--apply')

const PLAN = {
  'cpp-4-6-1': { addRequired: ['Level2:8', 'atcoder:2237'], removeOptional: ['CF800L:44', 'CF800L:55'] },
  'cpp-4-6-2': { addRequired: ['atcoder:1675', 'Level2:267'] },
  'cpp-4-6-3': { addRequired: ['atcoder:1682', 'atcoder:1458'] },
}

async function main() {
  const conn = mongoose.createConnection(process.env.APP_MONGODB_URI)
  const CL = conn.model('CourseLevel', new mongoose.Schema({}, { collection: 'courselevels', strict: false }))
  await conn.asPromise()
  const lv = await CL.findOne({ level: 4, group: /C\+\+/ })
  if (!lv) throw new Error('no L4 cpp')

  let touched = 0
  for (const t of lv.topics || []) {
    for (const c of t.chapters || []) {
      const plan = PLAN[c.id]
      if (!plan) continue
      const before = { R: [...(c.problemIds||[])], O: [...(c.optionalProblemIds||[])] }
      let R = c.problemIds || []
      let O = c.optionalProblemIds || []
      if (plan.removeRequired) R = R.filter(p => !plan.removeRequired.includes(p))
      if (plan.removeOptional) O = O.filter(p => !plan.removeOptional.includes(p))
      if (plan.addRequired) for (const p of plan.addRequired) if (!R.includes(p) && !O.includes(p)) R.push(p)
      if (plan.addOptional) for (const p of plan.addOptional) if (!R.includes(p) && !O.includes(p)) O.push(p)
      c.problemIds = R
      c.optionalProblemIds = O
      console.log(`[${c.id}] R: ${before.R.length}->${R.length}  O: ${before.O.length}->${O.length}`)
      console.log(`  R now: ${R.join(', ')}`)
      console.log(`  O now: ${O.join(', ')}`)
      touched++
    }
  }
  if (APPLY) { lv.markModified('topics'); await lv.save(); console.log(`Saved (${touched} chapters).`) }
  else console.log(`\n[DRY-RUN] ${touched} chapters; rerun with --apply`)
  await conn.close()
}
main().catch(e=>{console.error(e);process.exit(1)})
