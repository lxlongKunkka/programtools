import mongoose from 'mongoose'

const MONGODB_URI = process.env.APP_MONGODB_URI || 'mongodb://programtools:896b825efdb92b30989538ed3a6b167f324d4e2081adf040d91eadfd0be35b03@localhost:27017/programtools'

const conn = mongoose.createConnection(MONGODB_URI)
const schema = new mongoose.Schema({ id: String, chapter: mongoose.Schema.Types.Mixed, sortOrder: Number }, { strict: false })
const Level = conn.model('CodebotLevel', schema, 'lightbotlevels')

conn.once('open', async () => {
  const chapters = await Level.aggregate([
    { $group: { _id: '$chapter.id', title: { $first: '$chapter.title' }, order: { $first: '$chapter.order' }, count: { $sum: 1 } } },
    { $sort: { order: 1 } }
  ])
  for (const c of chapters) {
    console.log(`order=${c.order}  id=${c._id}  title=${c.title}  levels=${c.count}`)
  }
  await conn.close()
})
