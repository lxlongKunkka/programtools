#!/usr/bin/env node

import mongoose from 'mongoose'
import { APP_MONGODB_URI } from '../config.js'

async function main() {
  const conn = mongoose.createConnection(APP_MONGODB_URI)
  try {
    await conn.asPromise()
    const coll = conn.collection('quiz_questions')
    const total = await coll.countDocuments({ source: 'downloads' })
    const enabled = await coll.countDocuments({ source: 'downloads', enabled: true })
    const disabled = await coll.countDocuments({ source: 'downloads', enabled: { $ne: true } })
    console.log(JSON.stringify({ total, enabled, disabled }, null, 2))
  } finally {
    await conn.close().catch(() => {})
  }
}

main().catch((error) => {
  console.error('[count-downloads-enabled] fatal:', error)
  process.exit(1)
})