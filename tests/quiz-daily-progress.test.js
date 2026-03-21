import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDailyProgressUpdate } from '../server/utils/quizDailyProgress.js'

test('buildDailyProgressUpdate initializes first daily answer without conflicting operators', () => {
  const now = new Date('2026-03-22T00:00:00.000Z')
  const update = buildDailyProgressUpdate({
    existingProgress: null,
    assignedQuestion: { subject: 'C++', source: 'gesp' },
    now,
    questionUid: 'gesp-doc-47-cpp-q15',
    isCorrect: true,
    streakBase: 2
  })

  assert.deepEqual(update.$set, {
    subject: 'C++',
    source: 'gesp',
    completed: true,
    lastAnsweredAt: now,
    streak: 3
  })
  assert.deepEqual(update.$setOnInsert, {
    firstAnsweredAt: now,
    answeredCount: 1,
    correctCount: 1,
    questionUids: ['gesp-doc-47-cpp-q15']
  })
  assert.equal('$inc' in update, false)
})

test('buildDailyProgressUpdate keeps repeat submissions idempotent for existing progress', () => {
  const now = new Date('2026-03-22T00:00:00.000Z')
  const update = buildDailyProgressUpdate({
    existingProgress: {
      streak: 3,
      questionUids: ['gesp-doc-47-cpp-q15']
    },
    assignedQuestion: { subject: 'C++', source: 'gesp' },
    now,
    questionUid: 'gesp-doc-47-cpp-q15',
    isCorrect: true,
    streakBase: 2
  })

  assert.deepEqual(update.$set, {
    subject: 'C++',
    source: 'gesp',
    completed: true,
    lastAnsweredAt: now,
    streak: 3
  })
  assert.deepEqual(update.$addToSet, {
    questionUids: 'gesp-doc-47-cpp-q15'
  })
  assert.deepEqual(update.$inc, {
    answeredCount: 0,
    correctCount: 0
  })
  assert.equal('$setOnInsert' in update, false)
})