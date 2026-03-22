function hashString(value) {
  let hash = 0
  const text = String(value || '')
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function pickQuestionByDailySequence(questions, {
  today,
  subject = '',
  levelTag = '',
  tag = '',
  type = '',
  answeredQuestionUids = []
} = {}) {
  if (!Array.isArray(questions) || questions.length === 0) return null

  const answeredSet = new Set(answeredQuestionUids)
  const seed = `${today}|${subject}|${levelTag}|${tag}|${type}`
  const startIndex = hashString(seed) % questions.length

  for (let offset = 0; offset < questions.length; offset++) {
    const question = questions[(startIndex + offset) % questions.length]
    if (!answeredSet.has(question.questionUid)) return question
  }

  return null
}