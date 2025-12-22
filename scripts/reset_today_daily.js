import mongoose from 'mongoose'
import DailyProblem from '../server/models/DailyProblem.js'
import { MONGODB_URI } from '../server/config.js'

// Helper to get today's date string YYYY-MM-DD (UTC+8)
const getTodayDate = () => {
  const now = new Date()
  const offset = 8
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
  const nd = new Date(utc + (3600000 * offset))
  return nd.toISOString().split('T')[0]
}

const run = async () => {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('Connected.')

    const today = getTodayDate()
    console.log(`Deleting daily problems for date: ${today}...`)
    
    const result = await DailyProblem.deleteMany({ date: today })
    console.log(`Deleted ${result.deletedCount} records.`)
    
    console.log('Done.')
    process.exit(0)
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}

run()
