const mongoose = require('/var/www/programtools/node_modules/mongoose')
const fs = require('fs')
const levels = JSON.parse(fs.readFileSync('/tmp/lightbot-levels-dump.json', 'utf8'))
const schema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: String,
  chapter: mongoose.Schema.Types.Mixed,
  teachingGoal: String,
  availableBlocks: [String],
  grid: mongoose.Schema.Types.Mixed,
  robot: mongoose.Schema.Types.Mixed,
  winCondition: mongoose.Schema.Types.Mixed,
  constraints: mongoose.Schema.Types.Mixed,
  hints: [String],
  sortOrder: { type: Number, default: 0 }
})
const MONGO_URI = process.env.APP_MONGODB_URI || 'mongodb://localhost:27017/programtools'
console.log('[import] URI:', MONGO_URI.replace(/:([^@/]+)@/, ':***@'))
const conn = mongoose.createConnection(MONGO_URI)
conn.on('connected', async () => {
  const LightbotLevel = conn.model('LightbotLevel', schema)
  let ok = 0, fail = 0
  for (let i = 0; i < levels.length; i++) {
    const l = levels[i]
    try {
      await LightbotLevel.findOneAndUpdate({ id: l.id }, { $set: { ...l, sortOrder: i } }, { upsert: true, new: true })
      process.stdout.write('.')
      ok++
    } catch (e) {
      console.error('\n' + l.id, e.message)
      fail++
    }
  }
  console.log('\nDone: ok=' + ok + ' fail=' + fail)
  await conn.close()
  process.exit(0)
})
conn.on('error', e => { console.error(e.message); process.exit(1) })
