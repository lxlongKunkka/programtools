// 五级 cpp 去重 + 主题归位
// A) 5-1-1 思维训练 移除 gesp5:193-212（保留在 5-12-1 过关测试）
// B) 5-10-1 递归基本概念:O 移除 gesp5:38（递归GCD保留在 5-3-2:R）
// C) 5-6-2 二分答案:O 移除 gesp5:226/227/233（保留在 5-9-2 滑动窗口:O）
// D) 5-6-2 二分答案:O 移除 gesp5:243（保留在 5-9-1 相向双指针:O）
// E) 5-10-2:O 移除 gesp5:182（保留在 5-10-2:R）
import path from 'path'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })
const APPLY = process.argv.includes('--apply')

const PLAN = {
  'cpp-5-1-1': { removeRequired: ['gesp5:193','gesp5:194','gesp5:195','gesp5:196','gesp5:197','gesp5:198','gesp5:199','gesp5:200','gesp5:201','gesp5:202','gesp5:203','gesp5:204','gesp5:205','gesp5:206','gesp5:207','gesp5:208','gesp5:209','gesp5:210','gesp5:211','gesp5:212'] },
  'cpp-5-10-1': { removeOptional: ['gesp5:38'] },
  'cpp-5-6-2':  { removeOptional: ['gesp5:226','gesp5:227','gesp5:233','gesp5:243'] },
  'cpp-5-10-2': { removeOptional: ['gesp5:182'] },
}

async function main() {
  const conn = mongoose.createConnection(process.env.APP_MONGODB_URI)
  const CL = conn.model('CourseLevel', new mongoose.Schema({}, { collection: 'courselevels', strict: false }))
  await conn.asPromise()
  const lv = await CL.findOne({ level: 5, group: /C\+\+/ })
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
