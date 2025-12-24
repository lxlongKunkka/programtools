import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import User from './server/models/User.js'
import { MONGODB_URI, DIRS } from './server/config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB')

    // 1. Read Teachers
    const teacherFile = path.join(path.dirname(DIRS.models), 'teachers.json')
    let teachers = []
    if (fs.existsSync(teacherFile)) {
      teachers = JSON.parse(fs.readFileSync(teacherFile, 'utf8'))
    }
    console.log(`Found ${teachers.length} teachers in JSON`)

    // 2. Read Premium Users
    const premiumFile = path.join(path.dirname(DIRS.models), 'premium_users.json')
    let premiums = []
    if (fs.existsSync(premiumFile)) {
      premiums = JSON.parse(fs.readFileSync(premiumFile, 'utf8'))
    }
    console.log(`Found ${premiums.length} premium users in JSON`)

    // 3. Update DB
    // Priority: Teacher > Premium > User
    
    // Set all to 'user' first (optional, but safer if re-running)
    // await User.updateMany({}, { role: 'user' })

    // Update Teachers
    if (teachers.length > 0) {
      const res = await User.updateMany(
        { _id: { $in: teachers } },
        { $set: { role: 'teacher' } }
      )
      console.log(`Updated ${res.modifiedCount} users to 'teacher'`)
    }

    // Update Premium (only if not already teacher)
    if (premiums.length > 0) {
      // We need to be careful not to overwrite 'teacher' with 'premium' if a user is in both lists
      // But usually teacher implies premium.
      // Let's filter out teachers from premium list
      const purePremiums = premiums.filter(id => !teachers.includes(id))
      
      if (purePremiums.length > 0) {
        const res = await User.updateMany(
          { _id: { $in: purePremiums } },
          { $set: { role: 'premium' } }
        )
        console.log(`Updated ${res.modifiedCount} users to 'premium'`)
      }
    }
    
    // Also ensure Admins have role='admin' if they have priv=-1
    const adminRes = await User.updateMany(
        { $or: [{ priv: -1 }, { uname: 'admin' }] },
        { $set: { role: 'admin' } }
    )
    console.log(`Updated ${adminRes.modifiedCount} users to 'admin'`)

    console.log('Migration complete')
    process.exit(0)
  } catch (e) {
    console.error('Migration failed:', e)
    process.exit(1)
  }
}

migrate()
