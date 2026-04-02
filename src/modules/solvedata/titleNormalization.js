export function normalizeProblemTitle(value, fallback = '') {
  const text = String(value || '').replace(/\./g, ' ')
  const normalized = text.replace(/\s+/g, ' ').trim()
  return normalized || fallback
}

export function normalizeProblemMetaTitle(meta) {
  if (!meta) return meta
  const nextMeta = { ...meta }
  if (Object.prototype.hasOwnProperty.call(nextMeta, 'title')) {
    nextMeta.title = normalizeProblemTitle(nextMeta.title, '题目标题')
  }
  if (Object.prototype.hasOwnProperty.call(nextMeta, 'rawTitle')) {
    nextMeta.rawTitle = normalizeProblemTitle(nextMeta.rawTitle, nextMeta.title || '题目标题')
  }
  return nextMeta
}
