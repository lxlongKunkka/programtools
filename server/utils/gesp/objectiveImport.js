const CHINESE_LEVEL_MAP = {
  '一': 1,
  '二': 2,
  '三': 3,
  '四': 4,
  '五': 5,
  '六': 6,
  '七': 7,
  '八': 8,
  '九': 9,
  '十': 10
}

function pad2(value) {
  return String(value).padStart(2, '0')
}

export function parseLocalizedContent(rawContent) {
  if (!rawContent) return ''

  if (typeof rawContent === 'object') {
    if (typeof rawContent.zh === 'string') return rawContent.zh
    return String(rawContent)
  }

  const text = String(rawContent)
  const trimmed = text.trim()

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed.zh === 'string') return parsed.zh
    } catch {}
  }

  return text
}

export function parseObjectiveConfig(configText) {
  const answers = {}
  if (!configText || typeof configText !== 'string') return answers

  let currentQuestionNo = null
  let answerCaptured = false

  for (const rawLine of configText.split(/\r?\n/)) {
    const line = rawLine.replace(/\t/g, '    ')
    const trimmed = line.trim()

    const questionMatch = trimmed.match(/^['"]?(\d+)['"]?:\s*$/)
    if (questionMatch) {
      currentQuestionNo = Number(questionMatch[1])
      answerCaptured = false
      continue
    }

    if (currentQuestionNo !== null && !answerCaptured) {
      const answerMatch = trimmed.match(/^-\s*(.+?)\s*$/)
      if (answerMatch) {
        answers[currentQuestionNo] = normalizeAnswer(answerMatch[1])
        answerCaptured = true
      }
    }
  }

  return answers
}

export function parsePaperMeta(title, sourceDocId) {
  const fallback = {
    year: null,
    month: null,
    subject: 'C++',
    level: null
  }

  const text = String(title || '').trim()
  const directMatch = text.match(/GESP\s*(\d{4})年(\d{1,2})月认证(.+?)([一二三四五六七八九十]+)级/)
  const variantMatch = text.match(/GESP\s*[- ]?\s*(C\+\+|Python)\s*[- ]\s*(\d{4})年(\d{1,2})月([一二三四五六七八九十]+)级/i)

  if (!directMatch && !variantMatch) {
    const subjectSlug = slugifySubject(fallback.subject)
    return {
      ...fallback,
      paperUid: `gesp-doc-${sourceDocId}-${subjectSlug}`,
      levelTag: ''
    }
  }

  const year = Number(directMatch ? directMatch[1] : variantMatch[2])
  const month = Number(directMatch ? directMatch[2] : variantMatch[3])
  const subject = normalizePaperSubject(directMatch ? directMatch[3] : variantMatch[1])
  const level = CHINESE_LEVEL_MAP[directMatch ? directMatch[4] : variantMatch[4]] || null
  const subjectSlug = slugifySubject(subject)

  return {
    year,
    month,
    subject,
    level,
    paperUid: `gesp-${year}-${pad2(month)}-${subjectSlug}-${level || 'x'}`,
    levelTag: level ? `gesp${level}` : ''
  }
}

export function parseObjectiveQuestions(markdown, { answers = {}, paperUid, sourceDocId, sourceTitle, subject = 'C++', levelTag = '', tags = [] } = {}) {
  const content = String(markdown || '').replace(/\r\n/g, '\n')
  const headerPattern = /^(\d+)\),\s*/gm
  const headers = []
  let match

  while ((match = headerPattern.exec(content)) !== null) {
    headers.push({ questionNo: Number(match[1]), index: match.index })
  }

  const results = []
  for (let i = 0; i < headers.length; i++) {
    const start = headers[i].index
    const end = i + 1 < headers.length ? headers[i + 1].index : content.length
    const block = content.slice(start, end).trim()
    const parsed = parseQuestionBlock(block, {
      answers,
      paperUid,
      sourceDocId,
      sourceTitle,
      subject,
      levelTag,
      tags
    })
    if (parsed) results.push(parsed)
  }

  return results
}

export function parseObjectiveSolutions(markdown) {
  const content = String(markdown || '').replace(/\r\n/g, '\n')
  const headerPattern = /^(\d+)\),\s*/gm
  const headers = []
  let match

  while ((match = headerPattern.exec(content)) !== null) {
    headers.push({ questionNo: Number(match[1]), index: match.index })
  }

  const explanations = {}
  for (let i = 0; i < headers.length; i++) {
    const start = headers[i].index
    const end = i + 1 < headers.length ? headers[i + 1].index : content.length
    const block = content.slice(start, end).trim()
    const parsed = parseSolutionBlock(block)
    if (parsed) {
      explanations[parsed.questionNo] = parsed
    }
  }

  return explanations
}

export function extractMarkdownImages(markdown) {
  const images = []
  const pattern = /!\[[^\]]*\]\(([^)]+)\)/g
  let match

  while ((match = pattern.exec(String(markdown || ''))) !== null) {
    images.push(match[1].trim())
  }

  return [...new Set(images)]
}

export function markdownToPlainText(markdown) {
  return String(markdown || '')
    .replace(/!\[[^\]]*\]\(([^)]+)\)/g, ' ')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/^(#{1,6})\s*/gm, '')
    .replace(/^>\s*/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)([^\s][\s\S]*?[^\s])\1/g, '$2')
    .replace(/`{1,3}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseQuestionBlock(block, { answers, paperUid, sourceDocId, sourceTitle, subject, levelTag, tags }) {
  const headerMatch = block.match(/^(\d+)\),\s*/)
  if (!headerMatch) return null

  const questionNo = Number(headerMatch[1])
  const body = block.slice(headerMatch[0].length)
  const selectMatch = body.match(/\{\{\s*select\((\d+)\)\s*\}\}/)
  if (!selectMatch) return null

  const stem = body.slice(0, selectMatch.index).trim()
  const optionsPart = body.slice(selectMatch.index + selectMatch[0].length).trim()
  const options = parseOptions(optionsPart)
  if (options.length === 0) return null

  const isJudge = options.length === 2 && options.every((item) => ['true', 'false'].includes(item.key))
  const type = isJudge ? 'judge' : 'single'
  const normalizedAnswer = normalizeObjectiveAnswer(answers[questionNo] || '', options, type)

  return {
    questionUid: `${paperUid}-q${questionNo}`,
    paperUid,
    source: 'gesp',
    sourceDomainId: 'gesp',
    sourceDocId,
    paperQuestionNo: questionNo,
    type,
    stem,
    stemText: markdownToPlainText(stem),
    options: options.map((option) => ({
      ...option,
      textPlain: markdownToPlainText(option.text),
      images: extractMarkdownImages(option.text)
    })),
    answer: normalizedAnswer,
    explanation: '',
    explanationText: '',
    images: extractMarkdownImages(stem),
    tags: [...new Set(tags || [])],
    levelTag,
    subject,
    difficulty: null,
    sourceTitle,
    enabled: true,
    reviewStatus: 'pending',
    stats: {
      totalAttempts: 0,
      totalCorrect: 0,
      accuracy: 0,
      totalWrong: 0
    }
  }
}

function parseOptions(optionsPart) {
  const options = []
  let current = null

  for (const rawLine of String(optionsPart || '').split('\n')) {
    const line = rawLine.replace(/\r/g, '')
    const trimmed = line.trim()

    if (/^#{1,6}\s+/.test(trimmed)) {
      break
    }

    const optionMatch = line.match(/^\s*-\s*(true|false|[A-Z])(?:[\.．、])?\s*(.*)$/i)

    if (optionMatch) {
      if (current) {
        current.text = current.text.trim()
        options.push(current)
      }

      const keyRaw = optionMatch[1]
      const key = /^[A-Z]$/i.test(keyRaw) ? keyRaw.toUpperCase() : keyRaw.toLowerCase()
      current = {
        key,
        text: optionMatch[2] || ''
      }
      continue
    }

    if (current) {
      current.text += `${current.text ? '\n' : ''}${line}`
    }
  }

  if (current) {
    current.text = current.text.trim()
    options.push(current)
  }

  return options.filter((item) => item.text || ['true', 'false'].includes(item.key))
}

function normalizeObjectiveAnswer(answer, options, type) {
  const normalized = normalizeAnswer(answer)

  if (type !== 'judge') {
    return normalized
  }

  if (/^(true|false)$/i.test(normalized)) {
    return normalized.toLowerCase()
  }

  if (/^[A-Z]$/.test(normalized)) {
    const optionIndex = normalized.charCodeAt(0) - 65
    if (optionIndex >= 0 && optionIndex < options.length) {
      return options[optionIndex].key
    }
  }

  return normalized.toLowerCase()
}

function normalizeAnswer(answer) {
  const text = String(answer || '').trim()
  if (!text) return ''
  if (/^(true|false)$/i.test(text)) return text.toLowerCase()
  return text.toUpperCase()
}

function slugifySubject(subject) {
  const normalized = String(subject || '').trim().toLowerCase()
  if (normalized.includes('c++')) return 'cpp'
  if (normalized.includes('python')) return 'python'
  return normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unknown'
}

function normalizePaperSubject(subject) {
  const text = String(subject || '').trim()
  if (/^c\+\+$/i.test(text)) return 'C++'
  if (/^python$/i.test(text)) return 'Python'
  return text
}

function parseSolutionBlock(block) {
  const headerMatch = block.match(/^(\d+)\),\s*/)
  if (!headerMatch) return null

  const questionNo = Number(headerMatch[1])
  const answerMatch = block.match(/>\s*\*\*答案\*\*\s*:\s*([^\n]+)/)
  const explanationMatch = block.match(/>\s*\*\*解析\*\*\s*:\s*([\s\S]*?)$/)

  const explanation = explanationMatch
    ? explanationMatch[1]
        .replace(/^>\s?/gm, '')
        .replace(/\n---\s*$/m, '')
        .trim()
    : ''

  return {
    questionNo,
    answer: answerMatch ? normalizeAnswer(answerMatch[1]) : '',
    explanation,
    explanationText: markdownToPlainText(explanation)
  }
}