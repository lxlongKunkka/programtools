import { normalizeProblemMetaTitle, normalizeProblemTitle } from './titleNormalization'

export function extractStreamingFieldPreview(rawBuffer, fieldName, startOffset = -1) {
  let nextStartOffset = startOffset

  if (nextStartOffset === -1) {
    const pattern = new RegExp(`"${fieldName}"\\s*:\\s*"`)
    const match = rawBuffer.match(pattern)
    if (match) {
      nextStartOffset = match.index + match[0].length
    }
  }

  if (nextStartOffset === -1) {
    return { startOffset: -1, preview: '' }
  }

  const partial = rawBuffer.slice(nextStartOffset)
  let index = 0
  let preview = ''

  while (index < partial.length) {
    if (partial[index] === '\\' && index + 1 < partial.length) {
      const next = partial[index + 1]
      if (next === 'n') preview += '\n'
      else if (next === '"') preview += '"'
      else if (next === '\\') preview += '\\'
      else if (next === 't') preview += '\t'
      else preview += next
      index += 2
    } else if (partial[index] === '"') {
      break
    } else {
      preview += partial[index]
      index += 1
    }
  }

  return {
    startOffset: nextStartOffset,
    preview,
  }
}

export function mergeTranslationMeta(existingMeta, incomingMeta) {
  const safeExistingMeta = normalizeProblemMetaTitle(existingMeta || {})
  if (!incomingMeta) return safeExistingMeta
  const safeIncomingMeta = normalizeProblemMetaTitle(incomingMeta)

  const existingTitle = safeExistingMeta.title
  const rawTitle = safeExistingMeta.rawTitle
  const hasChinese = /[\u4e00-\u9fa5]/.test(rawTitle || '')
  const isPlaceholder = !safeExistingMeta.titleFixed && (
    !existingTitle || existingTitle === '题目标题' || (existingTitle === rawTitle && !hasChinese)
  )

  return normalizeProblemMetaTitle({
    ...safeExistingMeta,
    tags: safeExistingMeta.titleFixed
      ? (safeExistingMeta.tags || [])
      : (safeIncomingMeta.tags && safeIncomingMeta.tags.length ? safeIncomingMeta.tags : (safeExistingMeta.tags || [])),
    title: isPlaceholder ? normalizeProblemTitle(safeIncomingMeta.title || existingTitle || '', '题目标题') : existingTitle,
  })
}

export function hasResolvedMetaTitle(meta) {
  return !!(meta?.title && meta.title !== '题目标题')
}

export function buildReportAutoSolutionPrompt(task) {
  let promptText = task?.problemText || ''
  if (task?.referenceText?.trim()) {
    promptText += `\n\n【参考解法/思路】\n${task.referenceText.trim()}\n\n请参考上述思路（如果有）编写 AC 代码。`
  }
  return promptText
}