// 一次性补题：GESP 五/六/七级空章节
import path from 'path'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })
const APPLY = process.argv.includes('--apply')

const PLANS = {
  5: {
    'cpp-5-1-1': { addRequired: ['atcoder:2203','atcoder:2165','atcoder:2146','atcoder:2140','atcoder:2112'] },
    'cpp-5-4-1': { addRequired: ['Level3:350'] },
    'cpp-5-4-2': { addRequired: ['Level3:351'] },
    'cpp-5-4-3': { addRequired: ['Level3:352'] },
    'cpp-5-7-1': { addRequired: ['atcoder:2166','Level4:25'] },
    'cpp-5-7-2': { addRequired: ['atcoder:1159','atcoder:426'] },
  },
  6: {
    'cpp-6-2-2': { addRequired: ['atcoder:114','Level3:110'] },
    'cpp-6-2-3': { addRequired: ['Level3:125','atcoder:2011','atcoder:1921','atcoder:2147'] },
    'cpp-6-3-1': { addRequired: ['atcoder:825','Level3:126','Level4:398','Level4:395'] },
    'cpp-6-4-2': { addRequired: ['atcoder:1819','atcoder:1852','atcoder:1832','atcoder:2222'] },
    'cpp-6-8-1': { addRequired: ['atcoder:2173','atcoder:2114','atcoder:2091'] },
    'cpp-6-9-1': { addRequired: ['atcoder:1395','atcoder:633','atcoder:264','Level4:298'] },
  },
  7: {
    'cpp-7-1-1': { addRequired: ['Level4:209','Level4:213','atcoder:2082'] },
    'cpp-7-1-2': { addRequired: ['Level4:210','Level4:222'] },
    'cpp-7-1-3': { addRequired: ['Level4:219'] },
    'cpp-7-2-1': { addRequired: ['atcoder:2183','atcoder:1342'] },
    'cpp-7-5-1': { addRequired: ['atcoder:1423','Level6:18','atcoder:1124'] },
    'cpp-7-5-3': { addRequired: ['Level5:156','Level4:65','Level4:67'] },
    'cpp-7-7-1': { addRequired: ['Level4:33'] },
    'cpp-7-7-2': { addRequired: ['Level4:36'] },
    'cpp-7-7-3': { addRequired: ['Level4:119','atcoder:798','atcoder:1129'] },
  },
}

async function main() {
  const conn = mongoose.createConnection(process.env.APP_MONGODB_URI)
  const CL = conn.model('CourseLevel', new mongoose.Schema({}, { collection: 'courselevels', strict: false }))
  await conn.asPromise()
  // 获取已用 pid（避免跨章重复）
  const allCpp = await CL.find({ group: /C\+\+/ }).lean()
  const used = new Set()
  for (const lv of allCpp) for (const t of lv.topics||[]) for (const c of t.chapters||[]) {
    for (const id of c.problemIds||[]) used.add(id)
    for (const id of c.optionalProblemIds||[]) used.add(id)
  }
  for (const [level, plan] of Object.entries(PLANS)) {
    const lv = await CL.findOne({ level: Number(level), group: /C\+\+/ })
    let touched = 0
    for (const t of lv.topics||[]) for (const c of t.chapters||[]) {
      const p = plan[c.id]; if (!p) continue
      const bR = (c.problemIds||[]).length
      const adds = (p.addRequired||[]).filter(x => !used.has(x))
      const skips = (p.addRequired||[]).filter(x => used.has(x))
      c.problemIds = [...(c.problemIds||[]), ...adds]
      adds.forEach(x => used.add(x))
      console.log(`L${level} [${c.id}] R: ${bR}->${c.problemIds.length}  add=[${adds.join(',')}]${skips.length?'  SKIP=['+skips.join(',')+']':''}`)
      touched++
    }
    if (APPLY) { lv.markModified('topics'); await lv.save(); console.log(`  L${level} saved (${touched})`) }
  }
  if (!APPLY) console.log('\n[DRY-RUN] rerun with --apply')
  await conn.close()
}
main().catch(e=>{console.error(e);process.exit(1)})
