import { normalizeQuizKnowledgeTags } from './quizKnowledgeTags.js'

export function buildQuizCollectionFilter(userId, input = {}) {
  const filter = {
    userId,
    active: true
  }

  if (typeof input.levelTag === 'string' && input.levelTag.trim()) {
    filter.levelTag = input.levelTag.trim()
  }

  const selectedTag = normalizeQuizKnowledgeTags([
    input.tag,
    input.knowledgeTag
  ])[0]

  if (selectedTag) {
    filter.tags = selectedTag
  }

  return filter
}