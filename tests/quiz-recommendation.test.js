import test from 'node:test'
import assert from 'node:assert/strict'
import { computeKnowledgeWeaknessScore, computeMemoryCurveScore, pickQuestionByMemoryCurve } from '../server/utils/quizRecommendation.js'

const sampleQuestions = [
  { questionUid: 'new-question' },
  { questionUid: 'wrong-question' },
  { questionUid: 'correct-question' }
]

test('computeMemoryCurveScore prioritizes wrong answers above new questions', () => {
  const wrongScore = computeMemoryCurveScore({
    totalAttempts: 2,
    totalCorrect: 0,
    totalWrong: 2,
    lastIsCorrect: false,
    lastAttemptAt: '2026-03-21T00:00:00.000Z',
    lastWrongAt: '2026-03-21T00:00:00.000Z'
  }, { today: '2026-03-22' })

  const newScore = computeMemoryCurveScore(null, { today: '2026-03-22' })
  assert.ok(wrongScore > newScore)
})

test('computeMemoryCurveScore lowers frequency for recently correct questions', () => {
  const correctScore = computeMemoryCurveScore({
    totalAttempts: 3,
    totalCorrect: 3,
    totalWrong: 0,
    lastIsCorrect: true,
    lastAttemptAt: '2026-03-22T00:00:00.000Z',
    lastCorrectAt: '2026-03-22T00:00:00.000Z'
  }, { today: '2026-03-22' })

  const newScore = computeMemoryCurveScore(null, { today: '2026-03-22' })
  assert.ok(correctScore < newScore)
})

test('pickQuestionByMemoryCurve prefers wrong questions over new and correct ones', () => {
  const picked = pickQuestionByMemoryCurve(sampleQuestions, {
    today: '2026-03-22',
    attemptSummaryMap: new Map([
      ['wrong-question', {
        totalAttempts: 1,
        totalCorrect: 0,
        totalWrong: 1,
        lastIsCorrect: false,
        lastAttemptAt: '2026-03-21T00:00:00.000Z',
        lastWrongAt: '2026-03-21T00:00:00.000Z'
      }],
      ['correct-question', {
        totalAttempts: 2,
        totalCorrect: 2,
        totalWrong: 0,
        lastIsCorrect: true,
        lastAttemptAt: '2026-03-22T00:00:00.000Z',
        lastCorrectAt: '2026-03-22T00:00:00.000Z'
      }]
    ])
  })

  assert.equal(picked?.questionUid, 'wrong-question')
})

test('pickQuestionByMemoryCurve can revisit old correct answers after interval', () => {
  const picked = pickQuestionByMemoryCurve([
    { questionUid: 'old-correct' },
    { questionUid: 'mastered-correct' }
  ], {
    today: '2026-03-22',
    attemptSummaryMap: new Map([
      ['old-correct', {
        totalAttempts: 1,
        totalCorrect: 1,
        totalWrong: 0,
        lastIsCorrect: true,
        lastAttemptAt: '2026-03-10T00:00:00.000Z',
        lastCorrectAt: '2026-03-10T00:00:00.000Z'
      }],
      ['mastered-correct', {
        totalAttempts: 4,
        totalCorrect: 4,
        totalWrong: 0,
        lastIsCorrect: true,
        lastAttemptAt: '2026-03-21T00:00:00.000Z',
        lastCorrectAt: '2026-03-21T00:00:00.000Z'
      }]
    ])
  })

  assert.equal(picked?.questionUid, 'old-correct')
})

test('computeKnowledgeWeaknessScore boosts weak knowledge tags', () => {
  const weakScore = computeKnowledgeWeaknessScore(['DP'], new Map([
    ['DP', {
      totalAttempts: 4,
      totalCorrect: 1,
      totalWrong: 3,
      lastIsCorrect: false,
      lastWrongAt: '2026-03-21T00:00:00.000Z',
      lastAttemptAt: '2026-03-21T00:00:00.000Z'
    }]
  ]), { today: '2026-03-22' })

  const strongScore = computeKnowledgeWeaknessScore(['排序'], new Map([
    ['排序', {
      totalAttempts: 4,
      totalCorrect: 4,
      totalWrong: 0,
      lastIsCorrect: true,
      lastCorrectAt: '2026-03-22T00:00:00.000Z',
      lastAttemptAt: '2026-03-22T00:00:00.000Z'
    }]
  ]), { today: '2026-03-22' })

  assert.ok(weakScore > strongScore)
})

test('pickQuestionByMemoryCurve prefers weaker knowledge areas when question history is similar', () => {
  const picked = pickQuestionByMemoryCurve([
    { questionUid: 'dp-question', tags: ['DP'] },
    { questionUid: 'sort-question', tags: ['排序'] }
  ], {
    today: '2026-03-22',
    attemptSummaryMap: new Map(),
    tagSummaryMap: new Map([
      ['DP', {
        totalAttempts: 5,
        totalCorrect: 1,
        totalWrong: 4,
        lastIsCorrect: false,
        lastWrongAt: '2026-03-21T00:00:00.000Z',
        lastAttemptAt: '2026-03-21T00:00:00.000Z'
      }],
      ['排序', {
        totalAttempts: 5,
        totalCorrect: 5,
        totalWrong: 0,
        lastIsCorrect: true,
        lastCorrectAt: '2026-03-22T00:00:00.000Z',
        lastAttemptAt: '2026-03-22T00:00:00.000Z'
      }]
    ])
  })

  assert.equal(picked?.questionUid, 'dp-question')
})