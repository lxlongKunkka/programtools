function hashString(value) {
  let hash = 0
  const text = String(value || '')
  for (let index = 0; index < text.length; index++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function getTodayAnchor(today) {
  const normalized = String(today || '').trim()
  if (!normalized) return new Date()
  const anchor = new Date(`${normalized}T00:00:00.000Z`)
  if (Number.isNaN(anchor.getTime())) return new Date()
  return anchor
}

function getDiffDays(from, to) {
  const fromDate = toDate(from)
  const toDateValue = toDate(to)
  if (!fromDate || !toDateValue) return Number.POSITIVE_INFINITY
  const diffMs = toDateValue.getTime() - fromDate.getTime()
  return Math.max(0, Math.floor(diffMs / 86400000))
}

export function computeKnowledgeWeaknessScore(tags = [], tagSummaryMap = new Map(), { today } = {}) {
  const normalizedTags = Array.isArray(tags) ? tags.filter(Boolean) : []
  if (!normalizedTags.length || !(tagSummaryMap instanceof Map) || tagSummaryMap.size === 0) {
    return 0
  }

  const todayAnchor = getTodayAnchor(today)
  const tagScores = normalizedTags
    .map((tag) => {
      const summary = tagSummaryMap.get(tag)
      if (!summary) return 0

      const totalAttempts = Number(summary.totalAttempts || 0)
      const totalCorrect = Number(summary.totalCorrect || 0)
      const totalWrong = Number(summary.totalWrong || 0)
      const lastWrongAt = toDate(summary.lastWrongAt)
      const lastCorrectAt = toDate(summary.lastCorrectAt)
      const lastIsCorrect = summary.lastIsCorrect === true

      if (totalAttempts === 0) return 0

      const wrongRate = totalWrong / totalAttempts
      const recentWrongBoost = Math.max(0, 10 - Math.min(getDiffDays(lastWrongAt, todayAnchor), 10)) * 3
      const recentCorrectPenalty = Math.max(0, 10 - Math.min(getDiffDays(lastCorrectAt, todayAnchor), 10)) * 2
      const base = (wrongRate * 36) + (Math.min(totalWrong, 6) * 5) - (Math.min(totalCorrect, 6) * 2)

      if (!lastIsCorrect) {
        return base + recentWrongBoost
      }

      return base - recentCorrectPenalty
    })

  if (!tagScores.length) return 0
  return tagScores.reduce((sum, score) => sum + score, 0) / tagScores.length
}

export function computeMemoryCurveScore(summary, { today } = {}) {
  const todayAnchor = getTodayAnchor(today)
  if (!summary) return 90

  const totalAttempts = Number(summary.totalAttempts || 0)
  const totalCorrect = Number(summary.totalCorrect || 0)
  const totalWrong = Number(summary.totalWrong || 0)
  const lastAttemptAt = toDate(summary.lastAttemptAt)
  const lastCorrectAt = toDate(summary.lastCorrectAt)
  const lastWrongAt = toDate(summary.lastWrongAt)
  const lastIsCorrect = summary.lastIsCorrect === true

  if (!lastAttemptAt || totalAttempts === 0) return 90

  const recentWrongWindow = Math.max(0, 7 - Math.min(getDiffDays(lastWrongAt, todayAnchor), 7))
  const masteryLevel = Math.max(1, totalCorrect - totalWrong + 1)
  const reviewGapDays = Math.min(32, 2 ** Math.min(masteryLevel, 5))
  const daysSinceLastCorrect = getDiffDays(lastCorrectAt, todayAnchor)
  const daysSinceLastAttempt = getDiffDays(lastAttemptAt, todayAnchor)
  const accuracyPenalty = totalAttempts > 0 ? (totalWrong / totalAttempts) * 18 : 0

  if (!lastIsCorrect) {
    return 160
      + (Math.min(totalWrong, 5) * 10)
      + (recentWrongWindow * 8)
      + Math.min(daysSinceLastAttempt, 14)
      - (Math.min(totalCorrect, 5) * 2)
  }

  const overdueDays = Math.max(0, daysSinceLastCorrect - reviewGapDays)
  const freshnessPenalty = Math.max(0, reviewGapDays - daysSinceLastCorrect) * 8

  return 48
    + (overdueDays * 7)
    + Math.min(daysSinceLastAttempt, 14)
    + accuracyPenalty
    - freshnessPenalty
}

export function pickQuestionByMemoryCurve(questions, {
  today,
  subject = '',
  levelTag = '',
  tag = '',
  type = '',
  answeredQuestionUids = [],
  attemptSummaryMap = new Map(),
  tagSummaryMap = new Map()
} = {}) {
  if (!Array.isArray(questions) || questions.length === 0) return null

  const answeredSet = new Set(answeredQuestionUids)
  const seed = `${today}|${subject}|${levelTag}|${tag}|${type}`

  const rankedQuestions = questions
    .filter((question) => !answeredSet.has(question.questionUid))
    .map((question, index) => ({
      question,
      score: computeMemoryCurveScore(attemptSummaryMap.get(question.questionUid), { today })
        + computeKnowledgeWeaknessScore(question.tags || [], tagSummaryMap, { today }),
      tieBreaker: hashString(`${seed}|${question.questionUid}`),
      sourceOrder: index
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      if (left.tieBreaker !== right.tieBreaker) return left.tieBreaker - right.tieBreaker
      return left.sourceOrder - right.sourceOrder
    })

  return rankedQuestions[0]?.question || null
}