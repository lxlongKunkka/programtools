import mongoose from 'mongoose'

const MONGODB_URI = process.env.APP_MONGODB_URI || 'mongodb://localhost:27017/programtools'

async function main() {
  await mongoose.connect(MONGODB_URI)
  const docs = await mongoose.connection.db.collection('lightbotlevels')
    .find({ id: 'swf-02-001' }, { projection: { _id: 0, id: 1, title: 1, sortOrder: 1, chapter: 1 } })
    .toArray()
  console.log(JSON.stringify({ count: docs.length, docs }, null, 2))
  await mongoose.disconnect()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
