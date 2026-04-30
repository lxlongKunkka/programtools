// 修复 GESP 三级 cpp-3-* 章节中的 4 处 pid 重复
import dotenv from 'dotenv'
import path from 'path'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })
const APP_URI = process.env.APP_MONGODB_URI || 'mongodb://localhost:27017/programtools'
const APPLY = process.argv.includes('--apply')

// chapterId -> { removeRequired:[], removeOptional:[] }
const FIXES = {
  'cpp-3-2-5': { removeOptional: ['gesp3:31'] }, // 与 cpp-3-2-2 必做重复
  'cpp-3-2-6': { removeOptional: ['gesp3:88', 'gesp3:150'] }, // 88 与 3-2-5 选做重复；150 与 3-2-6 必做自重复
  'cpp-3-3-1': { removeRequired: ['Level3:32'] }, // 与 cpp-3-3-2 必做重复
}

const courseLevelSchema = new mongoose.Schema({}, { collection: 'courselevels', strict: false })

async function main() {
  console.log(`mode=${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  const conn = mongoose.createConnection(APP_URI)
  const CourseLevel = conn.model('CourseLevel', courseLevelSchema)
  await conn.asPromise()

  const levels = await CourseLevel.find({ level: 3 })
  const cppLevel = levels.find(l => /C\+\+/.test(l.group || '') && !/Python/i.test(l.group || ''))
  if (!cppLevel) { console.error('no L3 C++ doc'); process.exit(1) }

  let dirty = false
  for (const topic of (cppLevel.topics || [])) {
    for (const ch of (topic.chapters || [])) {
      const fix = FIXES[ch.id]
      if (!fix) continue
      const before = { R: (ch.problemIds||[]).slice(), O: (ch.optionalProblemIds||[]).slice() }
      if (fix.removeRequired) ch.problemIds = (ch.problemIds || []).filter(id => !fix.removeRequired.includes(id))
      if (fix.removeOptional) ch.optionalProblemIds = (ch.optionalProblemIds || []).filter(id => !fix.removeOptional.includes(id))
      console.log(`# ${ch.id} ${ch.title}`)
      console.log('  required:', before.R.join(', '), '=>', ch.problemIds.join(', '))
      console.log('  optional:', before.O.join(', '), '=>', ch.optionalProblemIds.join(', '))
      dirty = true
    }
  }

  if (!dirty) { console.log('nothing to update'); await conn.close(); process.exit(0) }
  if (APPLY) {
    cppLevel.markModified('topics')
    await cppLevel.save()
    console.log('Saved.')
  } else {
    console.log('(dry-run) pass --apply to write.')
  }
  await conn.close()
}

main().catch(e => { console.error(e); process.exit(1) })
