// 一次性脚本：把某个 pid 从旧章节迁移到新章节（optionalProblemIds）
// 用法： node scripts/fix_chapter_move.mjs --pid=atcoder:2320 --from=cpp-6-7-1 --to=cpp-6-8-1 [--apply]
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const APPLY = process.argv.includes('--apply')
const argPid   = process.argv.find(a => a.startsWith('--pid='))?.split('=')[1]
const argFrom  = process.argv.find(a => a.startsWith('--from='))?.split('=')[1]
const argTo    = process.argv.find(a => a.startsWith('--to='))?.split('=')[1]

if (!argPid || !argFrom || !argTo) {
  console.error('Usage: node fix_chapter_move.mjs --pid=atcoder:XXX --from=cpp-L-T-C --to=cpp-L-T-C [--apply]')
  process.exit(2)
}

function levelOf(chapterId) {
  const m = chapterId.match(/^cpp-(\d+)-/)
  return m ? Number(m[1]) : null
}

async function main() {
  const conn = mongoose.createConnection(process.env.APP_MONGODB_URI)
  const CL = conn.model('CourseLevel', new mongoose.Schema({}, { collection: 'courselevels', strict: false }))
  await conn.asPromise()

  const fromLevel = levelOf(argFrom)
  const toLevel   = levelOf(argTo)

  // 处理 from
  const fromDoc = await CL.findOne({ level: fromLevel, group: /C\+\+/ })
  if (!fromDoc) { console.error(`Level ${fromLevel} not found`); process.exit(1) }
  let removedFrom = false
  for (const t of fromDoc.topics || []) {
    for (const c of t.chapters || []) {
      if (c.id === argFrom) {
        const ids = c.optionalProblemIds || []
        const idx = ids.indexOf(argPid)
        if (idx !== -1) {
          console.log(`FROM ${argFrom}: remove ${argPid}`)
          ids.splice(idx, 1)
          c.optionalProblemIds = ids
          removedFrom = true
        } else {
          console.warn(`${argPid} not found in ${argFrom} optionalProblemIds`)
        }
      }
    }
  }

  // 处理 to（可能不同 level doc）
  const toDoc = fromLevel === toLevel ? fromDoc : await CL.findOne({ level: toLevel, group: /C\+\+/ })
  if (!toDoc) { console.error(`Level ${toLevel} not found`); process.exit(1) }
  let addedTo = false
  for (const t of toDoc.topics || []) {
    for (const c of t.chapters || []) {
      if (c.id === argTo) {
        const ids = c.optionalProblemIds || []
        if (!ids.includes(argPid)) {
          console.log(`TO   ${argTo}: add ${argPid}`)
          ids.push(argPid)
          c.optionalProblemIds = ids
          addedTo = true
        } else {
          console.warn(`${argPid} already in ${argTo}`)
        }
      }
    }
  }

  if (APPLY) {
    if (removedFrom) { fromDoc.markModified('topics'); await fromDoc.save(); console.log(`  L${fromLevel} saved`) }
    if (addedTo && toDoc !== fromDoc) { toDoc.markModified('topics'); await toDoc.save(); console.log(`  L${toLevel} saved`) }
    if (addedTo && toDoc === fromDoc && removedFrom) { /* already saved above */ }
    if (addedTo && toDoc === fromDoc && !removedFrom) { toDoc.markModified('topics'); await toDoc.save(); console.log(`  L${toLevel} saved`) }
    console.log('APPLIED')
  } else {
    console.log('[DRY-RUN] rerun with --apply')
  }

  await conn.close()
}
main().catch(e => { console.error(e); process.exit(1) })
