#!/usr/bin/env node

import mongoose from 'mongoose'
import { APP_MONGODB_URI } from '../config.js'

async function main() {
  const conn = mongoose.createConnection(APP_MONGODB_URI)
  try {
    await conn.asPromise()
    const coll = conn.collection('quiz_questions')

    const total = await coll.countDocuments({ source: 'downloads' })
    const withStem = await coll.countDocuments({
      source: 'downloads',
      stem: { $type: 'string', $nin: [''] }
    })
    const withExplanation = await coll.countDocuments({
      source: 'downloads',
      explanation: { $type: 'string', $nin: [''] }
    })
    const withTags = await coll.countDocuments({
      source: 'downloads',
      'tags.0': { $exists: true }
    })

    const sample = await coll.findOne(
      {
        source: 'downloads',
        stem: { $type: 'string', $nin: [''] },
        explanation: { $type: 'string', $nin: [''] },
        'tags.0': { $exists: true }
      },
      {
        projection: {
          _id: 0,
          questionUid: 1,
          sourceTitle: 1,
          stem: 1,
          explanation: 1,
          tags: 1
        }
      }
    )

    console.log(JSON.stringify({
      total,
      withStem,
      withExplanation,
      withTags,
      sample: sample
        ? {
            questionUid: sample.questionUid,
            sourceTitle: sample.sourceTitle,
            stemPreview: String(sample.stem || '').slice(0, 80),
            explanationPreview: String(sample.explanation || '').slice(0, 120),
            tags: sample.tags || []
          }
        : null
    }, null, 2))
  } finally {
    await conn.close().catch(() => {})
  }
}

main().catch((error) => {
  console.error('[count-downloads-coverage] fatal:', error)
  process.exit(1)
})