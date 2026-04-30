import dotenv from 'dotenv'
import path from 'path'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })
const conn = mongoose.createConnection(process.env.APP_MONGODB_URI || 'mongodb://127.0.0.1/programtools')
const M = conn.model('CourseLevel', new mongoose.Schema({}, { collection: 'courselevels', strict: false }))
await conn.asPromise()
const docs = await M.find({ level: 2 }).lean()
for (const d of docs) {
  console.log('===', d.group, '/ subject=', d.subject, '===')
  for (const t of (d.topics || [])) {
    console.log(' topic:', JSON.stringify(t.title), 'chapters=', (t.chapters || []).length)
    for (const c of (t.chapters || [])) console.log('   ch:', c.id, c.title)
  }
}
await conn.close()
