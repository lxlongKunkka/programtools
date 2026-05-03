import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const pid = process.argv[2]
if (!pid) { console.error('Usage: node _find_pid.mjs atcoder:XXXX'); process.exit(1) }

const conn = mongoose.createConnection(process.env.APP_MONGODB_URI)
const CL = conn.model('CL', new mongoose.Schema({}, { collection: 'courselevels', strict: false }))
await conn.asPromise()
const all = await CL.find({ group: /C\+\+/ }).lean()
let found = false
for (const lv of all)
  for (const t of lv.topics || [])
    for (const c of t.chapters || []) {
      const ids = [...(c.optionalProblemIds || []), ...(c.problemIds || [])]
      if (ids.includes(pid)) { console.log(c.id); found = true }
    }
if (!found) console.log('NOT FOUND in any chapter')
await conn.close()
