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

  const sourceTag = typeof input.sourceTag === 'string'
    ? input.sourceTag.trim()
    : ''

  const requiredTags = [selectedTag, sourceTag].filter(Boolean)

  if (requiredTags.length === 1) {
    filter.tags = requiredTags[0]
  } else if (requiredTags.length > 1) {
    filter.tags = { $all: requiredTags }
  }

  return filter
}