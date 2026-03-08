import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), 'server/.env') })

import { MongoClient, ObjectId } from 'mongodb'

const uri = process.env.APP_MONGODB_URI
const client = new MongoClient(uri)
await client.connect()
const db = client.db()

const levels = await db.collection('courselevels').find({}).toArray()

let fixedCount = 0
for (const level of levels) {
  if (!level.topics?.length) continue

  let needsUpdate = false
  const updatedTopics = level.topics.map(t => {
    if (!t._id) {
      needsUpdate = true
      fixedCount++
      console.log(`  [FIX] Level ${level.level} (${level.group || 'no group'}): topic "${t.title}" missing _id → assigning ${new ObjectId()}`)
      return { ...t, _id: new ObjectId() }
    }
    return t
  })

  if (needsUpdate) {
    await db.collection('courselevels').updateOne(
      { _id: level._id },
      { $set: { topics: updatedTopics } }
    )
    console.log(`  → Updated level ${level.level} (${level.group})`)
  }
}

console.log(`\nDone. Fixed ${fixedCount} topics missing _id.`)
await client.close()
