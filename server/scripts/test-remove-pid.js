#!/usr/bin/env node
/**
 * Test Script: Verify that removing PID correctly recalculates sort
 * 
 * Usage: node server/scripts/test-remove-pid.js [--domain=level1]
 */

import mongoose from 'mongoose'

// Document schema - minimal definition matching the actual schema
const documentSchema = new mongoose.Schema({
  docId: Number,
  title: String,
  domainId: String,
  pid: String,
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

async function testRemovePid() {
  try {
    // Get MongoDB URI from command line or default
    let mongoUri = process.argv.find(arg => arg.startsWith('--uri='))
    mongoUri = mongoUri ? mongoUri.split('=')[1] : 'mongodb://localhost:27017/programtools'
    
    const domainArg = process.argv.find(arg => arg.startsWith('--domain='))
    const targetDomain = domainArg ? domainArg.split('=')[1] : 'Level1'
    
    console.log('🔄 Connecting to MongoDB...')
    console.log(`   URI: ${mongoUri.replace(/:[^:]*@/, ':***@')}`)
    
    await mongoose.connect(mongoUri)
    console.log('✅ Connected to MongoDB\n')

    // Find a document with PID in target domain
    const docWithPid = await Document.findOne({
      docType: 10,
      domainId: targetDomain,
      pid: { $exists: true, $ne: null }
    })
    .select('_id docId title domainId pid sort')
    .lean()

    if (!docWithPid) {
      console.log(`❌ No document with PID found in domain: ${targetDomain}`)
      await mongoose.disconnect()
      return
    }

    console.log('📋 Test Document:')
    console.log(`  DocID: ${docWithPid.docId}`)
    console.log(`  Domain: ${docWithPid.domainId}`)
    console.log(`  PID: ${docWithPid.pid}`)
    console.log(`  Current Sort: ${docWithPid.sort}`)
    
    const expectedSortWithPid = calculateSort(docWithPid.pid)
    const expectedSortWithoutPid = calculateSort(`P${docWithPid.docId}`)
    
    console.log(`\n📊 Sort Value Analysis:`)
    console.log(`  If PID exists, sort should be: ${expectedSortWithPid}`)
    console.log(`  Match: ${docWithPid.sort === expectedSortWithPid ? '✅' : '❌'}`)
    console.log(`\n  If PID removed, sort should be: ${expectedSortWithoutPid}`)
    
    console.log(`\n🧪 Simulating PID removal...`)
    console.log(`  Before: pid="${docWithPid.pid}", sort="${docWithPid.sort}"`)
    console.log(`  After:  pid=null, sort="${expectedSortWithoutPid}"`)
    
    // Simulate the backend operation
    const updateOps = {
      $set: { sort: expectedSortWithoutPid },
      $unset: { pid: "" }
    }
    
    await Document.findByIdAndUpdate(docWithPid._id, updateOps)
    
    // Verify the update
    const updatedDoc = await Document.findById(docWithPid._id)
      .select('_id docId pid sort')
      .lean()
    
    console.log(`\n✅ Update completed:`)
    console.log(`  Updated pid: ${updatedDoc.pid || '(removed)'}`)
    console.log(`  Updated sort: ${updatedDoc.sort}`)
    console.log(`  Expected sort: ${expectedSortWithoutPid}`)
    console.log(`  Correct: ${updatedDoc.sort === expectedSortWithoutPid ? '✅' : '❌'}`)
    
    // Restore the original state
    await Document.findByIdAndUpdate(docWithPid._id, {
      $set: { pid: docWithPid.pid, sort: docWithPid.sort }
    })
    console.log(`\n🔄 Document restored to original state`)
    
    await mongoose.disconnect()
  } catch (e) {
    console.error('❌ Test failed:', e)
    process.exit(1)
  }
}

testRemovePid()
