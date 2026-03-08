import { MongoClient } from 'mongodb'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../server/.env')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => l.split('=').map(s => s.trim()))
)

const c = new MongoClient(env.APP_MONGODB_URI)
await c.connect()
const lv = await c.db().collection('courselevels').findOne({ level: 10, subject: { $ne: 'python' } })
console.log(`Level ${lv.level}: ${lv.title}`)
for (const t of lv.topics) {
  console.log(`\n[${t.title}]`)
  t.chapters.forEach((ch, i) => console.log(`  ${i+1}. ${ch.title}`))
}
await c.close()
