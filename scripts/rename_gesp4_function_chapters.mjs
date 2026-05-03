// 重命名 cpp-4-1-2 / cpp-4-1-3 章节标题
import path from 'path'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const APPLY = process.argv.includes('--apply')
const RENAMES = {
  'cpp-4-1-2': '函数与数学应用',
  'cpp-4-1-3': '函数与数论应用',
}

async function main() {
  const conn = mongoose.createConnection(process.env.APP_MONGODB_URI)
  const CL = conn.model('CourseLevel', new mongoose.Schema({}, { collection: 'courselevels', strict: false }))
  await conn.asPromise()
  const lv = await CL.findOne({ level: 4, group: /C\+\+/ })
  let touched = 0
  for (const t of lv.topics || []) {
    for (const c of t.chapters || []) {
      if (RENAMES[c.id]) {
        console.log(`[${c.id}] "${c.title}" -> "${RENAMES[c.id]}"`)
        c.title = RENAMES[c.id]
        touched++
      }
    }
  }
  if (APPLY) { lv.markModified('topics'); await lv.save(); console.log(`Saved (${touched}).`) }
  else console.log(`[DRY-RUN] ${touched}`)
  await conn.close()
}
main().catch(e=>{console.error(e);process.exit(1)})
