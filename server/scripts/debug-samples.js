#!/usr/bin/env node
/**
 * Debug Script: Show sample documents from a domain
 * 
 * Usage: node server/scripts/debug-samples.js --domain=codeforces [--uri=mongodb://...]
 */

import mongoose from 'mongoose'

// Document schema
const documentSchema = new mongoose.Schema({
  docId: Number,
  title: String,
  domainId: String,
  docType: Number,
  pid: String,
  sort: String,
}, { collection: 'document', strict: false })

const Document = mongoose.model('Document', documentSchema)

async function debugSamples() {
  try {
    // Get MongoDB URI from command line or default
    let mongoUri = process.argv.find(arg => arg.startsWith('--uri='))
    mongoUri = mongoUri ? mongoUri.split('=')[1] : 'mongodb://localhost:27017/programtools'
    
    const domainArg = process.argv.find(arg => arg.startsWith('--domain='))
    const targetDomain = domainArg ? domainArg.split('=')[1] : 'codeforces'
    
    console.log('🔄 Connecting to MongoDB...')
    await mongoose.connect(mongoUri)
    console.log('✅ Connected to MongoDB\n')

    const docs = await Document.find({
      docType: 10,
      domainId: targetDomain
    })
    .select('_id docId title pid sort')
    .limit(10)
    .lean()

    console.log(`📋 Sample documents from domain: ${targetDomain}\n`)
    console.log('─'.repeat(120))
    console.log(
      'DocID'.padEnd(8) + 
      'Title'.padEnd(40) + 
      'PID'.padEnd(20) + 
      'Sort'.padEnd(20) + 
      'Match?'.padEnd(10)
    )
    console.log('─'.repeat(120))

    for (const doc of docs) {
      // Check if sort matches pid using proper sortable logic
      let match = '?'
      if (doc.pid) {
        // Calculate expected sort from PID using Hydro's sortable logic
        const pidValue = doc.pid.startsWith('P') ? doc.pid.substring(1) : doc.pid
        const expectedSort = pidValue.replace(/(\d+)/g, (str) => 
          str.length >= 6 ? str : ('0'.repeat(6 - str.length) + str)
        )
        match = doc.sort === expectedSort ? '✓' : '✗'
      } else {
        // If no PID, check if sort is based on docId
        const docIdSort = 'P' + String(doc.docId).padStart(6, '0')
        match = doc.sort === docIdSort ? '✓' : '✗'
      }

      const title = (doc.title || '').substring(0, 38)
      console.log(
        String(doc.docId).padEnd(8) +
        title.padEnd(40) +
        (doc.pid || 'none').padEnd(20) +
        (doc.sort || 'none').padEnd(20) +
        match.padEnd(10)
      )
    }

    console.log('─'.repeat(120))

    // Count statistics
    const allDocs = await Document.find({
      docType: 10,
      domainId: targetDomain
    })
    .select('docId pid sort')
    .lean()

    let withPid = 0
    let withoutPid = 0
    let pidMatch = 0
    let pidMismatch = 0

    for (const doc of allDocs) {
      if (doc.pid) {
        withPid++
        // Calculate expected sort from PID using Hydro's sortable logic
        const pidValue = doc.pid.startsWith('P') ? doc.pid.substring(1) : doc.pid
        const expectedSort = pidValue.replace(/(\d+)/g, (str) => 
          str.length >= 6 ? str : ('0'.repeat(6 - str.length) + str)
        )
        if (doc.sort === expectedSort) pidMatch++
        else pidMismatch++
      } else {
        withoutPid++
      }
    }

    console.log('\n📊 Statistics:')
    console.log(`  Documents with PID: ${withPid}`)
    console.log(`    - PID matches sort: ${pidMatch}`)
    console.log(`    - PID mismatches sort: ${pidMismatch}`)
    console.log(`  Documents without PID: ${withoutPid}`)

    await mongoose.disconnect()
  } catch (e) {
    console.error('❌ Error:', e)
    process.exit(1)
  }
}

debugSamples()
