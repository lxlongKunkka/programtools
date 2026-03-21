#!/usr/bin/env node

import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import { HYDRO_MONGODB_URI, APP_MONGODB_URI } from '../config.js'
import {
  parseLocalizedContent,
  parseObjectiveConfig,
  parsePaperMeta,
  parseObjectiveQuestions
} from '../utils/gesp/objectiveImport.js'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const limitArg = args.find((arg) => arg.startsWith('--limit='))
const docIdArg = args.find((arg) => arg.startsWith('--doc-id='))
const hydroUriArg = args.find((arg) => arg.startsWith('--hydro-uri='))
const appUriArg = args.find((arg) => arg.startsWith('--app-uri='))
const outDirArg = args.find((arg) => arg.startsWith('--out-dir='))
const exportOnly = args.includes('--export-only')

const limit = limitArg ? Number(limitArg.split('=')[1]) : null
const targetDocIds = docIdArg
  ? docIdArg.split('=')[1].split(',').map((item) => Number(item.trim())).filter(Boolean)
  : []
const hydroUri = hydroUriArg ? hydroUriArg.split('=')[1] : HYDRO_MONGODB_URI
const appUri = appUriArg ? appUriArg.split('=')[1] : APP_MONGODB_URI
const outDir = outDirArg ? path.resolve(outDirArg.split('=')[1]) : ''

async function main() {
  const hydroConn = mongoose.createConnection(hydroUri)
  let appConn = null

  try {
    await hydroConn.asPromise()

    const query = {
      domainId: 'gesp',
      docId: { $exists: true, $ne: null },
      config: /type:\s*objective/
    }
    if (targetDocIds.length > 0) {
      query.docId = { $in: targetDocIds }
    }

    let cursor = hydroConn.collection('document')
      .find(query, {
        projection: {
          docId: 1,
          title: 1,
          content: 1,
          tag: 1,
          config: 1,
          domainId: 1
        }
      })
      .sort({ docId: 1 })

    if (limit && Number.isFinite(limit) && limit > 0) {
      cursor = cursor.limit(limit)
    }

    const docs = await cursor.toArray()
    console.log(`[import-gesp-objective-bank] matched papers: ${docs.length}`)

    const papers = []
    const questions = []
    const failures = []

    for (const doc of docs) {
      try {
        const markdown = parseLocalizedContent(doc.content)
        const answers = parseObjectiveConfig(doc.config)
        const meta = parsePaperMeta(doc.title, doc.docId)
        const parsedQuestions = parseObjectiveQuestions(markdown, {
          answers,
          paperUid: meta.paperUid,
          sourceDocId: doc.docId,
          sourceTitle: doc.title,
          subject: meta.subject,
          levelTag: meta.levelTag,
          tags: doc.tag || []
        })

        papers.push({
          paperUid: meta.paperUid,
          source: 'gesp',
          sourceDomainId: doc.domainId || 'gesp',
          sourceDocId: doc.docId,
          title: doc.title,
          year: meta.year,
          month: meta.month,
          subject: meta.subject,
          level: meta.level,
          paperType: 'exam',
          rawContentZh: markdown,
          questionCount: parsedQuestions.length,
          status: 'active'
        })
        questions.push(...parsedQuestions)
      } catch (error) {
        failures.push({ docId: doc.docId, title: doc.title, error: error.message })
      }
    }

    console.log(`[import-gesp-objective-bank] parsed papers: ${papers.length}`)
    console.log(`[import-gesp-objective-bank] parsed questions: ${questions.length}`)
    if (failures.length > 0) {
      console.log(`[import-gesp-objective-bank] failures: ${failures.length}`)
      console.log(JSON.stringify(failures.slice(0, 10), null, 2))
    }

    if (questions.length > 0) {
      console.log('[import-gesp-objective-bank] sample question:')
      console.log(JSON.stringify({
        questionUid: questions[0].questionUid,
        type: questions[0].type,
        answer: questions[0].answer,
        stem: questions[0].stem.slice(0, 120),
        options: questions[0].options
      }, null, 2))
    }

    if (outDir) {
      fs.mkdirSync(outDir, { recursive: true })
      fs.writeFileSync(path.join(outDir, 'quiz_papers.json'), JSON.stringify(papers, null, 2), 'utf-8')
      fs.writeFileSync(path.join(outDir, 'quiz_questions.json'), JSON.stringify(questions, null, 2), 'utf-8')
      fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify({
        papers: papers.length,
        questions: questions.length,
        failures
      }, null, 2), 'utf-8')
      console.log(`[import-gesp-objective-bank] exported JSON to ${outDir}`)
    }

    if (dryRun) {
      console.log('[import-gesp-objective-bank] dry run complete, no data written')
      return
    }

    if (exportOnly) {
      console.log('[import-gesp-objective-bank] export-only complete, skipped database write')
      return
    }

    appConn = mongoose.createConnection(appUri)
    await appConn.asPromise()

    const now = new Date()
    const paperOps = papers.map((paper) => ({
      updateOne: {
        filter: { paperUid: paper.paperUid },
        update: {
          $set: {
            ...paper,
            updatedAt: now
          },
          $setOnInsert: {
            createdAt: now
          }
        },
        upsert: true
      }
    }))

    const questionOps = questions.map((question) => ({
      updateOne: {
        filter: { questionUid: question.questionUid },
        update: {
          $set: {
            ...question,
            updatedAt: now
          },
          $setOnInsert: {
            createdAt: now
          }
        },
        upsert: true
      }
    }))

    if (paperOps.length > 0) {
      await appConn.collection('quiz_papers').bulkWrite(paperOps, { ordered: false })
    }
    if (questionOps.length > 0) {
      await appConn.collection('quiz_questions').bulkWrite(questionOps, { ordered: false })
    }

    console.log('[import-gesp-objective-bank] import complete')
    console.log(JSON.stringify({
      papersUpserted: paperOps.length,
      questionsUpserted: questionOps.length,
      failures: failures.length
    }, null, 2))
  } finally {
    await hydroConn.close().catch(() => {})
    if (appConn) {
      await appConn.close().catch(() => {})
    }
  }
}

main().catch((error) => {
  console.error('[import-gesp-objective-bank] fatal:', error)
  process.exit(1)
})