import dotenv from 'dotenv'
import { MongoClient } from 'mongodb'
import { writeFileSync } from 'fs'
dotenv.config({ path: './server/.env' })

const uri = process.env.APP_MONGODB_URI || 'mongodb://localhost:27017/programtools'
const client = new MongoClient(uri)

async function main() {
  await client.connect()
  const db = client.db()
  const col = db.collection('courselevels')

  // 查看 level 8 的 topic 3（即 8-3-x 的内容）
  const lv8 = await col.findOne({ group: 'GESP C++ 认证课程', level: 8 })
  if (lv8 && lv8.topics) {
    const topic3 = lv8.topics[2] // 0-indexed, topic3 = index 2
    if (topic3) {
      console.log('Level 8 Topic 3:', topic3.title)
      topic3.chapters?.forEach((c, i) => console.log(`  8-3-${i+1}: [${c.id}] ${c.title}`))
    }
    // also list all topics for reference
    console.log('\nAll level 8 topics:')
    lv8.topics.forEach((t, i) => console.log(`  ${i+1}: ${t.title} (${t.chapters?.length || 0} ch)`))
  }

  await client.close()
}
main().catch(console.error)
