import test from 'node:test'
import assert from 'node:assert/strict'
import { pickQuestionByDailySequence } from '../server/utils/quizDailySequence.js'

const sampleQuestions = [
  { questionUid: 'q1' },
  { questionUid: 'q2' },
  { questionUid: 'q3' }
]

test('pickQuestionByDailySequence returns deterministic first question for the same seed', () => {
  const first = pickQuestionByDailySequence(sampleQuestions, { today: '2026-03-22' })
  const second = pickQuestionByDailySequence(sampleQuestions, { today: '2026-03-22' })

  assert.ok(first)
  assert.equal(first.questionUid, second.questionUid)
})

test('pickQuestionByDailySequence skips answered questions and returns the next one', () => {
  const first = pickQuestionByDailySequence(sampleQuestions, { today: '2026-03-22' })
  const next = pickQuestionByDailySequence(sampleQuestions, {
    today: '2026-03-22',
    answeredQuestionUids: [first.questionUid]
  })

  assert.ok(next)
  assert.notEqual(next.questionUid, first.questionUid)
})

test('pickQuestionByDailySequence returns null after all questions are answered', () => {
  const picked = pickQuestionByDailySequence(sampleQuestions, { today: '2026-03-22' })
  const second = pickQuestionByDailySequence(sampleQuestions, {
    today: '2026-03-22',
    answeredQuestionUids: [picked.questionUid]
  })
  const third = pickQuestionByDailySequence(sampleQuestions, {
    today: '2026-03-22',
    answeredQuestionUids: [picked.questionUid, second.questionUid]
  })
  const none = pickQuestionByDailySequence(sampleQuestions, {
    today: '2026-03-22',
    answeredQuestionUids: [picked.questionUid, second.questionUid, third.questionUid]
  })

  assert.equal(none, null)
})

test('pickQuestionByDailySequence changes seed when knowledge tag changes', () => {
  const withSorting = pickQuestionByDailySequence(sampleQuestions, {
    today: '2026-03-22',
    tag: '排序'
  })
  const withDp = pickQuestionByDailySequence(sampleQuestions, {
    today: '2026-03-22',
    tag: 'DP'
  })

  assert.ok(withSorting)
  assert.ok(withDp)
  assert.notEqual(withSorting.questionUid, withDp.questionUid)
})