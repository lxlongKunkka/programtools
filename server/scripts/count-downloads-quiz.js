#!/usr/bin/env node

import mongoose from 'mongoose'
import { APP_MONGODB_URI } from '../config.js'

async function main() {
  const conn = mongoose.createConnection(APP_MONGODB_URI)
  try {
    await conn.asPromise()
    const papers = await conn.collection('quiz_papers').countDocuments({ source: 'downloads' })
    const questions = await conn.collection('quiz_questions').countDocuments({ source: 'downloads' })
    console.log(JSON.stringify({ papers, questions }, null, 2))
  } finally {
    await conn.close().catch(() => {})
  }
}

main().catch((error) => {
  console.error('[count-downloads-quiz] fatal:', error)
  process.exit(1)
})