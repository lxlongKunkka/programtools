import { MongoClient } from 'mongodb'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
const __dir = dirname(fileURLToPath(import.meta.url))
const uri = readFileSync(join(__dir,'server/.env'),'utf8').match(/APP_MONGODB_URI=(.+)/)?.[1]?.trim()
const c = new MongoClient(uri)
await c.connect()
const levels = await c.db().collection('courselevels').find({ group: 'GESP C++ 认证课程' }).toArray()
levels.sort((a,b)=>a.level-b.level)
for (const lv of levels.filter(l=>l.level>=5)) {
  console.log('\n── Level ' + lv.level + ' ──')
  lv.topics?.forEach((t, ti) => {
    t.chapters?.forEach((ch, ci) => {
      console.log(`  ${lv.level}-${ti+1}-${ci+1}  ${ch.title}`)
    })
  })
}
await c.close()
