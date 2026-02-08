#!/usr/bin/env node
/**
 * Migration Script: Fix incorrect sort values for documents
 * 
 * Problem: Sort values may not match the PID/docId values
 * 
 * Solution: Recalculate sort using Hydro's sortable function logic
 * 
 * Usage: node server/scripts/fix-sort-migration.js [--dry-run] [--domain=level4] [--uri=mongodb://...]
 */

import mongoose from 'mongoose'

// Document schema - minimal definition matching the actual schema
const documentSchema = new mongoose.Schema({
  docId: Number,
  title: String,
  content: String,
  contentbak: String,
  domainId: String,
  pid: String,
  tag: [String],
  sort: String,
}, { collection: 'document', strict: false })

const Document = mongoose.model('Document', documentSchema)

// Helper: Calculate sort value - matches Hydro's sortable function
function calculateSort(source, namespaces = {}) {
  if (!source) return ''
  const [namespace, pidVal] = source.includes('-') ? source.split('-') : ['default', source]
  const prefix = namespaces?.[namespace] ? `${namespaces[namespace]}-` : ''
  return (prefix + pidVal).replace(/(\d+)/g, (str) => 
    str.length >= 6 ? str : ('0'.repeat(6 - str.length) + str)
  )
}

async function fixSortMigration() {
  try {
    // Get MongoDB URI from command line or default
    let mongoUri = process.argv.find(arg => arg.startsWith('--uri='))
    mongoUri = mongoUri ? mongoUri.split('=')[1] : 'mongodb://localhost:27017/programtools'
    
    const dryRun = process.argv.includes('--dry-run')
    const domainArg = process.argv.find(arg => arg.startsWith('--domain='))
    const targetDomain = domainArg ? domainArg.split('=')[1] : null
    
    console.log('🔄 Connecting to MongoDB...')
    console.log(`   URI: ${mongoUri.replace(/:[^:]*@/, ':***@')}`)  // Hide password
    
    await mongoose.connect(mongoUri)
    console.log('✅ Connected to MongoDB')

    console.log(`\n📋 Mode: ${dryRun ? 'DRY RUN (no changes)' : 'ACTUAL RUN (will modify DB)'}`)
    if (targetDomain) {
      console.log(`📍 Target domain: ${targetDomain}`)
    }

    // Build query
    const query = {
      docType: 10,  // TYPE_PROBLEM
      docId: { $exists: true, $ne: null }  // Must have docId
    }
    if (targetDomain) {
      query.domainId = targetDomain
    }

    // Find all documents
    const allDocs = await Document.find(query)
    .select('_id docId title domainId sort pid')
    .lean()

    console.log(`\n📊 Found ${allDocs.length} documents`)

    // Filter to those with incorrect sort
    const toFix = allDocs.filter(doc => {
      let expectedSort
      if (doc.pid) {
        // If document has a PID, sort should be calculated using sortable(pid)
        expectedSort = calculateSort(doc.pid)
      } else {
        // If document has no PID, sort should be calculated using sortable(`P${docId}`)
        expectedSort = calculateSort(`P${doc.docId}`)
      }
      const currentSort = doc.sort || ''
      return currentSort !== expectedSort
    })

    console.log(`⚠️  ${toFix.length} documents have incorrect sort values\n`)

    if (toFix.length === 0) {
      console.log('✅ All sort values are correct')
      await mongoose.disconnect()
      return
    }

    // Display sample of what will change
    console.log('📝 Sample of changes:')
    toFix.slice(0, 5).forEach(doc => {
      let newSort
      if (doc.pid) {
        newSort = calculateSort(doc.pid)
      } else {
        newSort = calculateSort(`P${doc.docId}`)
      }
      console.log(`  - DocID ${doc.docId} (PID: ${doc.pid || 'none'}): "${doc.sort || '(empty)'}" → "${newSort}"`)
    })

    if (toFix.length > 5) {
      console.log(`  ... and ${toFix.length - 5} more`)
    }

    if (dryRun) {
      console.log(`\n✅ Dry run complete. Would update ${toFix.length} documents`)
      await mongoose.disconnect()
      return
    }

    // Actual update
    console.log(`\n⏳ Fixing ${toFix.length} documents...`)
    
    let successCount = 0
    let errorCount = 0

    for (const doc of toFix) {
      try {
        let newSort
        if (doc.pid) {
          // If document has a PID, calculate sort from PID
          newSort = calculateSort(doc.pid)
        } else {
          // If document has no PID, use P{docId}
          newSort = calculateSort(`P${doc.docId}`)
        }
        await Document.findByIdAndUpdate(
          doc._id,
          { $set: { sort: newSort } }
        )
        successCount++
      } catch (e) {
        console.error(`  ❌ Error updating ${doc._id}: ${e.message}`)
        errorCount++
      }
    }

    console.log(`\n✅ Migration complete!`)
    console.log(`  ✅ Successfully updated: ${successCount}`)
    console.log(`  ❌ Failed: ${errorCount}`)

    if (errorCount === 0) {
      console.log('\n🎉 All documents fixed successfully!')
    }

    await mongoose.disconnect()
  } catch (e) {
    console.error('❌ Migration failed:', e)
    process.exit(1)
  }
}

fixSortMigration()
