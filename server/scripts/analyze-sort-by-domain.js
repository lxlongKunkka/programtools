#!/usr/bin/env node
/**
 * Analysis Script: Count incorrect sort values by domain
 * 
 * Usage: node server/scripts/analyze-sort-by-domain.js [--uri=mongodb://...]
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

// Helper: Calculate sort value - matches Hydro's sortable function
function calculateSort(source, namespaces = {}) {
  if (!source) return ''
  const [namespace, pidVal] = source.includes('-') ? source.split('-') : ['default', source]
  const prefix = namespaces?.[namespace] ? `${namespaces[namespace]}-` : ''
  return (prefix + pidVal).replace(/(\d+)/g, (str) => 
    str.length >= 6 ? str : ('0'.repeat(6 - str.length) + str)
  )
}

async function analyzeSortByDomain() {
  try {
    // Get MongoDB URI from command line or default
    let mongoUri = process.argv.find(arg => arg.startsWith('--uri='))
    mongoUri = mongoUri ? mongoUri.split('=')[1] : 'mongodb://localhost:27017/programtools'
    
    console.log('🔄 Connecting to MongoDB...')
    console.log(`   URI: ${mongoUri.replace(/:[^:]*@/, ':***@')}`)
    
    await mongoose.connect(mongoUri)
    console.log('✅ Connected to MongoDB\n')

    // Get all unique domains
    const domains = await Document.distinct('domainId', {
      docType: 10,  // TYPE_PROBLEM
      docId: { $exists: true, $ne: null }
    })

    console.log(`📊 Found ${domains.length} domains\n`)
    console.log('Domain Statistics:')
    console.log('─'.repeat(80))
    console.log('Domain'.padEnd(25) + 'Total'.padEnd(15) + 'Incorrect'.padEnd(15) + 'Error Rate'.padEnd(15))
    console.log('─'.repeat(80))

    const domainStats = []

    for (const domain of domains) {
      const allDocs = await Document.find({
        docType: 10,
        docId: { $exists: true, $ne: null },
        domainId: domain
      })
      .select('_id docId pid sort')
      .lean()

      const incorrectDocs = allDocs.filter(doc => {
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

      const errorRate = allDocs.length > 0 
        ? ((incorrectDocs.length / allDocs.length) * 100).toFixed(1)
        : '0.0'

      domainStats.push({
        domain,
        total: allDocs.length,
        incorrect: incorrectDocs.length,
        errorRate: parseFloat(errorRate)
      })

      const displayDomain = domain || '(empty)'
      console.log(
        displayDomain.padEnd(25) +
        allDocs.length.toString().padEnd(15) +
        incorrectDocs.length.toString().padEnd(15) +
        `${errorRate}%`.padEnd(15)
      )
    }

    console.log('─'.repeat(80))
    
    const totalAll = domainStats.reduce((sum, s) => sum + s.total, 0)
    const totalIncorrect = domainStats.reduce((sum, s) => sum + s.incorrect, 0)
    const totalErrorRate = totalAll > 0 ? ((totalIncorrect / totalAll) * 100).toFixed(1) : '0.0'

    console.log(
      'TOTAL'.padEnd(25) +
      totalAll.toString().padEnd(15) +
      totalIncorrect.toString().padEnd(15) +
      `${totalErrorRate}%`.padEnd(15)
    )
    console.log('─'.repeat(80))

    // Sort by incorrect count (descending)
    const sorted = domainStats.sort((a, b) => b.incorrect - a.incorrect)

    console.log('\n📌 Domains with most errors (top 10):')
    sorted.slice(0, 10).forEach((stat, i) => {
      const domain = stat.domain || '(empty)'
      console.log(`  ${i + 1}. ${domain.padEnd(20)} → ${stat.incorrect} errors`)
    })

    console.log('\n✅ Analysis complete!')
    console.log('\nNext: Run fix-sort-migration.js with --domain=<domain_name>')

    await mongoose.disconnect()
  } catch (e) {
    console.error('❌ Analysis failed:', e)
    process.exit(1)
  }
}

analyzeSortByDomain()
