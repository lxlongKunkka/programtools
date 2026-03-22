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

async function main() {
  if (!YUN_API_KEY) {
    throw new Error('缺少 YUN_API_KEY，无法执行知识点打标')
  }

  const limit = Math.max(Number(getArg('limit', '0')) || 0, 0)
  const batchSize = Math.max(Number(getArg('batch-size', '100')) || 100, 1)
  const model = getArg('model', 'gemini-2.0-flash')
  const force = hasFlag('force')
  const dryRun = hasFlag('dry-run')

  const conn = await mongoose.createConnection(APP_MONGODB_URI).asPromise()
  const coll = conn.collection('quiz_questions')
  const cursor = coll.find(
    { enabled: true, source: 'gesp' },
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

  let scanned = 0
  let updated = 0
  let skipped = 0
  let failed = 0

  for await (const question of cursor) {
    scanned += 1

    if (!shouldRetag(question, force)) {
      skipped += 1
      continue
    }

    if (limit > 0 && updated + failed >= limit) break

    try {
      const tags = await generateKnowledgeTags(question, model)
      if (tags.length === 0) {
        failed += 1
        console.warn(`[WARN] ${question.questionUid} 未解析出知识点标签`)
        continue
      }

      if (!dryRun) {
        await coll.updateOne(
          { _id: question._id },
          {
            $set: {
              tags,
              updatedAt: new Date()
            }
          }
        )
      }

      updated += 1
      console.log(`[OK] ${question.questionUid} -> ${tags.join(', ')}`)
    } catch (error) {
      failed += 1
      console.warn(`[FAIL] ${question.questionUid} -> ${error?.message || error}`)
    }
  }

  console.log(JSON.stringify({ scanned, updated, skipped, failed, dryRun, force, model }, null, 2))
  await conn.close()
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error))
  process.exit(1)
})