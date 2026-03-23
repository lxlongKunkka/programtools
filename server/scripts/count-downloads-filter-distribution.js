#!/usr/bin/env node

import mongoose from 'mongoose'
import { APP_MONGODB_URI } from '../config.js'

async function main() {
  const conn = mongoose.createConnection(APP_MONGODB_URI)
  try {
    await conn.asPromise()
    const coll = conn.collection('quiz_questions')

    const levelTagDistribution = await coll.aggregate([
      { $match: { source: 'downloads' } },
      { $group: { _id: '$levelTag', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } }
    ]).toArray()

    const topTagDistribution = await coll.aggregate([
      { $match: { source: 'downloads', tags: { $exists: true, $ne: [] } } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 20 }
    ]).toArray()

    console.log(JSON.stringify({
      levelTagDistribution,
      topTagDistribution
    }, null, 2))
  } finally {
    await conn.close().catch(() => {})
  }
}

main().catch((error) => {
  console.error('[count-downloads-filter-distribution] fatal:', error)
  process.exit(1)
})