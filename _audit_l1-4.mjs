import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, 'server', '.env') })
const MONGODB_URI = process.env.APP_MONGODB_URI || 'mongodb://localhost:27017/programtools'
const s = new mongoose.Schema({ level: Number, title: String, topics: [{ title: String, chapters: [{ id: String, title: String }] }] })
const M = mongoose.model('CourseLevel', s)
await mongoose.connect(MONGODB_URI)
for (const lv of [1,2,3,4]) {
  const doc = await M.findOne({ level: lv })
  if (!doc) continue
  console.log(`\n=== Level ${lv}  ${doc.title} ===`)
  for (const t of doc.topics) {
    console.log(`  [专题] ${t.title}  (${t.chapters.length}章)`)
    for (const c of t.chapters) console.log(`    - ${c.title}`)
  }
}
await mongoose.disconnect()
