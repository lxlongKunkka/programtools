import mongoose from 'mongoose'
import DailyProblem from '../server/models/DailyProblem.js'
import Document from '../server/models/Document.js'
import { MONGODB_URI } from '../server/config.js'

const getTodayDate = () => {
  const now = new Date()
  const offset = 8
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
  const nd = new Date(utc + (3600000 * offset))
  return nd.toISOString().split('T')[0]
}

const run = async () => {
  try {
    await mongoose.connect(MONGODB_URI)
    const today = getTodayDate()
    
    const camps = [
        { name: 'A', domain: 'gymA', start: 37 },
        { name: 'B', domain: 'gymB', start: 37 },
        { name: 'C', domain: 'gymC', start: 1 }
    ]

    for (const c of camps) {
        // Find the document
        // We look for >= start, just in case 37 is missing, we take 38.
        const doc = await Document.findOne({ 
            domainId: c.domain, 
            docId: { $gte: c.start } 
        }).sort({ docId: 1 })

        if (doc) {
            console.log(`Setting Camp ${c.name} to DocId ${doc.docId} (${doc.title})`)
            
            await DailyProblem.findOneAndUpdate(
                { date: today, camp: c.name },
                {
                    problemId: doc._id,
                    docId: doc.docId,
                    title: doc.title,
                    domainId: doc.domainId,
                    tag: doc.tag || []
                },
                { upsert: true, new: true }
            )
        } else {
            console.log(`Could not find start doc for Camp ${c.name}`)
        }
    }
    
    console.log('Done')
    process.exit(0)
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}

run()
