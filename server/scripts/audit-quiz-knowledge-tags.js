#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'
import { APP_MONGODB_URI } from '../config.js'
import {
  KNOWLEDGE_TAGS,
  extractQuizKnowledgeTagsFromText,
  normalizeQuizKnowledgeTags
} from '../utils/quizKnowledgeTags.js'

function getArg(name, fallback = '') {
  const prefix = `--${name}=`
  const match = process.argv.find((arg) => arg.startsWith(prefix))
  return match ? match.slice(prefix.length) : fallback
}

function toTagList(value) {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : []
}

function uniqueList(values = []) {
  return [...new Set(values.map((item) => String(item || '').trim()).filter(Boolean))]
}

function addCount(map, key, amount = 1) {
  if (!key) return
  map.set(key, Number(map.get(key) || 0) + amount)
}

function pickTopEntries(map, limit = 20, keyName = 'name', valueName = 'count') {
  return [...map.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]
      return String(a[0]).localeCompare(String(b[0]), 'zh-CN')
    })
    .slice(0, limit)
    .map(([key, value]) => ({ [keyName]: key, [valueName]: value }))
}

function pickQuestionSample(question, extra = {}) {
  const stem = String(question?.stemText || question?.stem || '')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    questionUid: question?.questionUid || '',
    source: question?.source || '',
    type: question?.type || '',
    levelTag: question?.levelTag || '',
    sourceTitle: question?.sourceTitle || '',
    rawTags: toTagList(question?.tags),
    stemPreview: stem.slice(0, 120),
    ...extra
  }
}

async function main() {
  const source = String(getArg('source', '')).trim()
  const sampleLimit = Math.max(Number(getArg('sample-limit', '30')) || 30, 1)
  const outFile = String(getArg('out', '')).trim()
  const conn = await mongoose.createConnection(APP_MONGODB_URI).asPromise()

  try {
    const filter = {
      enabled: true,
      type: { $in: ['single', 'judge'] }
    }
    if (source) filter.source = source

    const questions = await conn.collection('quiz_questions').find(
      filter,
      {
        projection: {
          questionUid: 1,
          source: 1,
          sourceTitle: 1,
          sourceDocId: 1,
          paperQuestionNo: 1,
          type: 1,
          tags: 1,
          levelTag: 1,
          stem: 1,
          stemText: 1,
          explanation: 1,
          explanationText: 1,
          options: 1
        }
      }
    ).toArray()

    const knowledgeTagSet = new Set(KNOWLEDGE_TAGS)
    const sourceStats = new Map()
    const rawNonKnowledgeCounts = new Map()
    const normalizedKnowledgeCounts = new Map()
    const extractedKnowledgeCounts = new Map()

    const samples = {
      withoutKnowledge: [],
      nonKnowledgeOnly: [],
      missingButExtractable: [],
      mismatchedKnowledge: []
    }

    let withStoredKnowledge = 0
    let withoutStoredKnowledge = 0
    let nonKnowledgeOnly = 0
    let missingButExtractable = 0
    let mismatchedKnowledge = 0

    for (const question of questions) {
      const rawTags = uniqueList(question?.tags || [])
      const storedKnowledgeTags = normalizeQuizKnowledgeTags(rawTags)
      const nonKnowledgeTags = rawTags.filter((tag) => !knowledgeTagSet.has(tag) && !normalizeQuizKnowledgeTags([tag]).length)
      const optionTexts = Array.isArray(question?.options)
        ? question.options.flatMap((option) => [option?.textPlain, option?.text])
        : []
      const extractedKnowledgeTags = extractQuizKnowledgeTagsFromText(
        question?.stemText,
        question?.stem,
        question?.explanationText,
        question?.explanation,
        question?.sourceTitle,
        optionTexts
      )
      const overlap = storedKnowledgeTags.filter((tag) => extractedKnowledgeTags.includes(tag))

      if (!sourceStats.has(question.source || 'unknown')) {
        sourceStats.set(question.source || 'unknown', {
          total: 0,
          withStoredKnowledge: 0,
          withoutStoredKnowledge: 0,
          missingButExtractable: 0,
          mismatchedKnowledge: 0
        })
      }
      const sourceItem = sourceStats.get(question.source || 'unknown')
      sourceItem.total += 1

      for (const tag of storedKnowledgeTags) addCount(normalizedKnowledgeCounts, tag)
      for (const tag of extractedKnowledgeTags) addCount(extractedKnowledgeCounts, tag)
      for (const tag of nonKnowledgeTags) addCount(rawNonKnowledgeCounts, tag)

      if (storedKnowledgeTags.length > 0) {
        withStoredKnowledge += 1
        sourceItem.withStoredKnowledge += 1
      } else {
        withoutStoredKnowledge += 1
        sourceItem.withoutStoredKnowledge += 1

        if (samples.withoutKnowledge.length < sampleLimit) {
          samples.withoutKnowledge.push(
            pickQuestionSample(question, {
              extractedKnowledgeTags,
              nonKnowledgeTags
            })
          )
        }
      }

      if (!storedKnowledgeTags.length && nonKnowledgeTags.length > 0) {
        nonKnowledgeOnly += 1
        if (samples.nonKnowledgeOnly.length < sampleLimit) {
          samples.nonKnowledgeOnly.push(
            pickQuestionSample(question, {
              nonKnowledgeTags,
              extractedKnowledgeTags
            })
          )
        }
      }

      if (!storedKnowledgeTags.length && extractedKnowledgeTags.length > 0) {
        missingButExtractable += 1
        sourceItem.missingButExtractable += 1
        if (samples.missingButExtractable.length < sampleLimit) {
          samples.missingButExtractable.push(
            pickQuestionSample(question, {
              suggestedKnowledgeTags: extractedKnowledgeTags,
              nonKnowledgeTags
            })
          )
        }
      }

      if (storedKnowledgeTags.length > 0 && extractedKnowledgeTags.length > 0 && overlap.length === 0) {
        mismatchedKnowledge += 1
        sourceItem.mismatchedKnowledge += 1
        if (samples.mismatchedKnowledge.length < sampleLimit) {
          samples.mismatchedKnowledge.push(
            pickQuestionSample(question, {
              storedKnowledgeTags,
              extractedKnowledgeTags,
              nonKnowledgeTags
            })
          )
        }
      }
    }

    const report = {
      generatedAt: new Date().toISOString(),
      filter: {
        source: source || null,
        types: ['single', 'judge']
      },
      summary: {
        totalQuestions: questions.length,
        withStoredKnowledge,
        withoutStoredKnowledge,
        nonKnowledgeOnly,
        missingButExtractable,
        mismatchedKnowledge
      },
      bySource: [...sourceStats.entries()]
        .sort((a, b) => a[0].localeCompare(b[0], 'zh-CN'))
        .map(([name, item]) => ({ source: name, ...item })),
      topStoredKnowledgeTags: pickTopEntries(normalizedKnowledgeCounts, 30, 'tag', 'count'),
      topExtractedKnowledgeTags: pickTopEntries(extractedKnowledgeCounts, 30, 'tag', 'count'),
      topRawNonKnowledgeTags: pickTopEntries(rawNonKnowledgeCounts, 40, 'tag', 'count'),
      samples
    }

    if (outFile) {
      const outputPath = path.isAbsolute(outFile) ? outFile : path.join(process.cwd(), outFile)
      fs.mkdirSync(path.dirname(outputPath), { recursive: true })
      fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8')
    }

    console.log(JSON.stringify(report, null, 2))
  } finally {
    await conn.close().catch(() => {})
  }
}

main().catch(async (error) => {
  console.error(error?.stack || error?.message || String(error))
  try {
    await mongoose.disconnect()
  } catch {}
  process.exit(1)
})