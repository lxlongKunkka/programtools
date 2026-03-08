import dotenv from 'dotenv'
import { MongoClient } from 'mongodb'
import { writeFileSync } from 'fs'
dotenv.config({ path: './server/.env' })

const uri = process.env.APP_MONGODB_URI || 'mongodb://localhost:27017/programtools'
const client = new MongoClient(uri)

async function main() {
  await client.connect()
  const db = client.db()
  const docs = await db.collection('courselevels')
    .find({ group: 'GESP C++ 认证课程', level: 6 })
    .sort({ topicIdx: 1 })
    .toArray()

  let out = ''
  docs.forEach(d => {
    const topics = d.topics || []
    if (topics.length) {
      topics.forEach((t, ti) => {
        const chs = (t.chapters || []).map((c, ci) => `    ch${ci+1}: [${c.id}] ${c.title}`).join('\n')
        out += `  [6-${ti+1}] ${t.title}\n${chs}\n`
      })
    } else {
      // flat chapters
      const chs = (d.chapters || []).map((c, i) => `    ch${i+1}: [${c.id}] ${c.title}`).join('\n')
      out += `  [6-${d.topicIdx}] ${d.title}\n${chs}\n`
    }
    out += '\n'
  })
  writeFileSync('lv6.txt', out, 'utf8')
  console.log('done, topics:', docs.length)
  await client.close()
}
main().catch(console.error)
