#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'
import { APP_MONGODB_URI } from '../config.js'
import {
  extractQuizKnowledgeTagsFromText,
  normalizeQuizKnowledgeTags
} from '../utils/quizKnowledgeTags.js'

const DEFAULT_EXCLUDED_TAGS = new Set(['环', '函数', '字符串', '模拟', '构造'])

function getArg(name, fallback = '') {
  const prefix = `--${name}=`
  const match = process.argv.find((arg) => arg.startsWith(prefix))
  return match ? match.slice(prefix.length) : fallback
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`)
}

function uniqueList(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).map((item) => String(item || '').trim()).filter(Boolean))]
}

function buildQuestionSample(question, suggestedTags) {
  const stem = String(question?.stemText || question?.stem || '')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    questionUid: question?.questionUid || '',
    source: question?.source || '',
    type: question?.type || '',
    levelTag: question?.levelTag || '',
    sourceTitle: question?.sourceTitle || '',
    rawTags: uniqueList(question?.tags || []),
    suggestedTags,
    stemPreview: stem.slice(0, 120)
  }
}

function buildMergedTags(existingTags, suggestedTags) {
  return uniqueList([...(Array.isArray(existingTags) ? existingTags : []), ...suggestedTags])
}

function addCount(map, key, amount = 1) {
  if (!key) return
  map.set(key, Number(map.get(key) || 0) + amount)
}

function getExcludedTags() {
  const configured = String(getArg('exclude-tags', '')).trim()
  if (!configured) return new Set(DEFAULT_EXCLUDED_TAGS)
  return new Set(configured.split(',').map((item) => item.trim()).filter(Boolean))
}

function pickTopEntries(map, limit = 20) {
  return [...map.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]
      return String(a[0]).localeCompare(String(b[0]), 'zh-CN')
    })
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }))
}

async function main() {
  const source = String(getArg('source', 'gesp')).trim() || 'gesp'
  const limit = Math.max(Number(getArg('limit', '0')) || 0, 0)
  const sampleLimit = Math.max(Number(getArg('sample-limit', '30')) || 30, 1)
  const outFile = String(getArg('out', '')).trim()
  const apply = hasFlag('apply')
  const excludedTags = getExcludedTags()

  const conn = await mongoose.createConnection(APP_MONGODB_URI).asPromise()

  try {
    const filter = {
      enabled: true,
      type: { $in: ['single', 'judge'] },
      source
    }

    const cursor = conn.collection('quiz_questions').find(
      filter,
      {
        projection: {
          _id: 1,
          questionUid: 1,
          source: 1,
          sourceTitle: 1,
          type: 1,
          tags: 1,
          levelTag: 1,
          stem: 1,
          stemText: 1,
          explanation: 1,
          explanationText: 1,
          options: 1
        },
        sort: { sourceDocId: 1, paperQuestionNo: 1 }
      }
    )

    const allQuestions = await cursor.toArray()
    const questions = limit > 0 ? allQuestions.slice(0, limit) : allQuestions

    let scanned = 0
    let candidates = 0
    let updated = 0
    const suggestedCounts = new Map()
    const samples = []

    for (const question of questions) {
      scanned += 1
      const storedKnowledgeTags = normalizeQuizKnowledgeTags(question?.tags || [])
      if (storedKnowledgeTags.length > 0) {
        continue
      }

      const optionTexts = Array.isArray(question?.options)
        ? question.options.flatMap((option) => [option?.textPlain, option?.text])
        : []
      const suggestedTags = extractQuizKnowledgeTagsFromText(
        question?.stemText,
        question?.stem,
        question?.explanationText,
        question?.explanation,
        question?.sourceTitle,
        optionTexts
      ).filter((tag) => !excludedTags.has(tag))

      if (!suggestedTags.length) {
        continue
      }

      candidates += 1
      for (const tag of suggestedTags) addCount(suggestedCounts, tag)

      if (samples.length < sampleLimit) {
        samples.push(buildQuestionSample(question, suggestedTags))
      }

      if (!apply) {
        continue
      }

      const mergedTags = buildMergedTags(question?.tags || [], suggestedTags)
      await conn.collection('quiz_questions').updateOne(
        { _id: question._id },
        {
          $set: {
            tags: mergedTags,
            updatedAt: new Date()
          }
        }
      )
      updated += 1
    }

    const report = {
      generatedAt: new Date().toISOString(),
      source,
      apply,
      excludedTags: [...excludedTags],
      limit: limit || null,
      summary: {
        scanned,
        candidates,
        updated,
        skipped: scanned - candidates
      },
      topSuggestedTags: pickTopEntries(suggestedCounts, 30),
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