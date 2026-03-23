import axios from 'axios'
import mongoose from 'mongoose'
import { APP_MONGODB_URI, YUN_API_KEY, YUN_API_URL } from '../config.js'
import {
  buildQuizKnowledgeTaggingPrompt,
  normalizeQuizKnowledgeTags,
  parseQuizKnowledgeTaggingResult
} from '../utils/quizKnowledgeTags.js'

function getArg(name, fallback = '') {
  const prefix = `--${name}=`
  const match = process.argv.find((arg) => arg.startsWith(prefix))
  return match ? match.slice(prefix.length) : fallback
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`)
}

function shouldRetag(question, force) {
  if (force) return true
  const tags = normalizeQuizKnowledgeTags(question?.tags || [])
  return tags.length === 0
}

function mergeKnowledgeTags(existingTags, newKnowledgeTags) {
  const current = Array.isArray(existingTags) ? existingTags : []
  const preserved = current.filter((tag) => !normalizeQuizKnowledgeTags([tag]).length)
  return [...new Set([...preserved, ...newKnowledgeTags])]
}

function buildQuestionText(question) {
  const optionLines = Array.isArray(question?.options)
    ? question.options.map((option) => `${option.key}. ${option.textPlain || option.text || ''}`)
    : []

  return [
    question?.stemText || question?.stem || '',
    optionLines.join('\n')
  ].filter(Boolean).join('\n')
}

async function generateKnowledgeTags(question, model) {
  const prompt = buildQuizKnowledgeTaggingPrompt({
    levelTag: question.levelTag,
    sourceTitle: question.sourceTitle,
    type: question.type,
    text: buildQuestionText(question)
  })
  const payload = {
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 400
  }
  const response = await axios.post(YUN_API_URL, payload, {
    headers: {
      Authorization: `Bearer ${YUN_API_KEY}`,
      'Content-Type': 'application/json'
    },
    timeout: 60000
  })
  const content = response?.data?.choices?.[0]?.message?.content || ''
  return parseQuizKnowledgeTaggingResult(content)
}

async function runWithConcurrency(items, concurrency, worker) {
  const queue = [...items]
  const runners = Array.from({ length: Math.max(concurrency, 1) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()
      if (!item) break
      await worker(item)
    }
  })
  await Promise.all(runners)
}

async function main() {
  if (!YUN_API_KEY) {
    throw new Error('缺少 YUN_API_KEY，无法执行知识点打标')
  }

  const limit = Math.max(Number(getArg('limit', '0')) || 0, 0)
  const batchSize = Math.max(Number(getArg('batch-size', '100')) || 100, 1)
  const concurrency = Math.max(Number(getArg('concurrency', '6')) || 6, 1)
  const model = getArg('model', 'gemini-3-flash-preview')
  const source = getArg('source', 'gesp')
  const force = hasFlag('force')
  const dryRun = hasFlag('dry-run')

  const conn = await mongoose.createConnection(APP_MONGODB_URI).asPromise()
  const coll = conn.collection('quiz_questions')
  const cursor = coll.find(
    { enabled: true, source },
    {
      projection: {
        _id: 1,
        questionUid: 1,
        stem: 1,
        stemText: 1,
        options: 1,
        tags: 1,
        type: 1,
        levelTag: 1,
        sourceTitle: 1
      },
      sort: { sourceDocId: 1, paperQuestionNo: 1 },
      batchSize
    }
  )

  const questions = await cursor.toArray()
  const selectedQuestions = limit > 0 ? questions.slice(0, limit) : questions

  let scanned = 0
  let updated = 0
  let skipped = 0
  let failed = 0

  await runWithConcurrency(selectedQuestions, concurrency, async (question) => {
    scanned += 1

    if (!shouldRetag(question, force)) {
      skipped += 1
      return
    }

    try {
      const tags = await generateKnowledgeTags(question, model)
      if (tags.length === 0) {
        failed += 1
        console.warn(`[WARN] ${question.questionUid} 未解析出知识点标签`)
        return
      }

      if (!dryRun) {
        await coll.updateOne(
          { _id: question._id },
          {
            $set: {
              tags: mergeKnowledgeTags(question.tags, tags),
              updatedAt: new Date()
            }
          }
        )
      }

      updated += 1
      console.log(`[OK] ${question.questionUid} -> ${mergeKnowledgeTags(question.tags, tags).join(', ')}`)
    } catch (error) {
      failed += 1
      console.warn(`[FAIL] ${question.questionUid} -> ${error?.message || error}`)
    }
  })

  console.log(JSON.stringify({ scanned, updated, skipped, failed, dryRun, force, model, source, concurrency, selected: selectedQuestions.length }, null, 2))
  await conn.close()
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error))
  process.exit(1)
})