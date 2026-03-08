import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), 'server/.env') })
import { MongoClient, ObjectId } from 'mongodb'

const uri = process.env.APP_MONGODB_URI
const client = new MongoClient(uri)

await client.connect()
const db = client.db()

// Check level 1 topics _id
const level1 = await db.collection('courselevels').findOne(
  { level: 1 },
  { projection: { 'topics._id': 1, 'topics.title': 1, level: 1, group: 1, subject: 1 } }
)

if (level1?.topics) {
  console.log(`Level ${level1.level}, Group: ${level1.group}, Subject: ${level1.subject}`)
  level1.topics.forEach(t => {
    console.log(`  topic: "${t.title}" | _id: ${t._id} | type: ${typeof t._id} | isObjectId: ${t._id instanceof ObjectId}`)
  })
} else {
  console.log('No topics found for level 1. Data:', JSON.stringify(level1, null, 2).substring(0, 300))
}

// Also check: what does the /api/course/levels API actually return for topics?
// Simulate the query
const allLevels = await db.collection('courselevels').find({}).project({ 'topics.chapters.content': 0, 'chapters.content': 0 }).sort({ level: 1 }).toArray()
console.log('\n=== All levels topic _id summary ===')
for (const l of allLevels.slice(0, 3)) {
  console.log(`Level ${l.level} (${l.group || 'no group'}): topics=${l.topics?.length || 0}, chapters=${l.chapters?.length || 0}`)
  if (l.topics?.length) {
    l.topics.forEach(t => console.log(`  - "${t.title}" _id=${t._id}`))
  }
}

await client.close()
