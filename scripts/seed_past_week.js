import mongoose from 'mongoose'
import DailyProblem from '../server/models/DailyProblem.js'
import Document from '../server/models/Document.js'
import { MONGODB_URI } from '../server/config.js'

const getDateStr = (offsetDays) => {
  const now = new Date()
  const offset = 8
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
  const nd = new Date(utc + (3600000 * offset))
  nd.setDate(nd.getDate() + offsetDays)
  return nd.toISOString().split('T')[0]
}

const run = async () => {
  try {
    await mongoose.connect(MONGODB_URI)
    
    // Generate for past 6 days (Mon-Sat)
    // Assuming today is Sunday (simulated)
    // Mon: -6, Tue: -5, ... Sat: -1
    
    const camps = [
        { name: 'A', domain: 'gymA', start: 31 },
        { name: 'B', domain: 'gymB', start: 31 },
        { name: 'C', domain: 'gymC', start: 1 } // C camp logic unclear for past, assuming just some problems
    ]

    for (let i = 0; i < 6; i++) {
        // We want Dec 15 (Mon) to Dec 20 (Sat)
        // Today is Dec 22 (Mon)
        // Dec 15 is -7 days from today
        const dayOffset = -7 + i
        const dateStr = getDateStr(dayOffset)
        console.log(`Generating for ${dateStr}...`)

        for (const c of camps) {
            // A/B: 31 + i
            // C: 1 + i (assuming)
            let targetDocId = c.start + i
            
            // Special handling for C if needed, but let's stick to simple increment
            
            const doc = await Document.findOne({ 
                domainId: c.domain, 
                docId: targetDocId 
            })

            if (doc) {
                await DailyProblem.findOneAndUpdate(
                    { date: dateStr, camp: c.name },
                    {
                        problemId: doc._id,
                        docId: doc.docId,
                        title: doc.title,
                        domainId: doc.domainId,
                        tag: doc.tag || []
                    },
                    { upsert: true, new: true }
                )
                console.log(`  [${c.name}] Set to DocId ${doc.docId}`)
            } else {
                console.log(`  [${c.name}] DocId ${targetDocId} not found`)
            }
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
