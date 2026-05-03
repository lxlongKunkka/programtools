/**
 * list_chapter_ids.mjs
 * 从 APP DB 的 courselevels 集合中导出所有有效的 chapterId，方便 batch 分类时查阅
 */
import path from 'path'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const APP_URI = process.env.APP_MONGODB_URI || process.env.MONGODB_URI
const conn = mongoose.createConnection(APP_URI)
const CL = conn.model('CourseLevel', new mongoose.Schema({}, { collection: 'courselevels', strict: false }))
await conn.asPromise()

const levels = await CL.find({ group: /C\+\+/ }, { level: 1, title: 1, topics: 1 }).sort({ level: 1 }).lean()

const result = []
for (const lv of levels) {
  for (const t of lv.topics || []) {
    for (const c of t.chapters || []) {
      result.push({
        chapterId: c.id,
        level: lv.level,
        topic: t.title,
        chapter: c.title,
      })
    }
  }
}

fs.writeFileSync('/tmp/chapter_ids.json', JSON.stringify(result, null, 2))
console.log(`Total chapters: ${result.length}`)
result.forEach(r => console.log(`${r.chapterId}\tL${r.level} ${r.topic} > ${r.chapter}`))
await conn.close()
