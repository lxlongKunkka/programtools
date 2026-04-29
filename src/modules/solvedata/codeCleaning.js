import { normalizeProblemTitle } from './titleNormalization'

// 从大段教案/AI输出中提取 AC 纯代码
export function extractPureCode(content) {
  if (!content) return ''

  let code = ''
  const codeBlockPatterns = [
    /```(?:cpp|c\+\+)\s*\n([\s\S]*?)```/i,
    /```(?:python|py)\s*\n([\s\S]*?)```/i,
    /```java\s*\n([\s\S]*?)```/i,
    /```\s*\n([\s\S]*?)```/
  ]

  // ── 优先级 1：起止双标记（最可靠）
  const startMarker = '<!-- AC_CODE_START -->'
  const endMarker = '<!-- AC_CODE_END -->'
  const startIdx = content.indexOf(startMarker)
  const endIdx = content.indexOf(endMarker)
  if (startIdx !== -1) {
    const region = endIdx !== -1 && endIdx > startIdx
      ? content.substring(startIdx + startMarker.length, endIdx)
      : content.substring(startIdx + startMarker.length)
    for (const pattern of codeBlockPatterns) {
      const match = region.match(pattern)
      if (match && match[1]) { code = match[1].trim(); break }
    }
  }

  // ── 优先级 2：旧式单标记 <!-- AC_CODE -->
  if (!code) {
    const markerIndex = content.indexOf('<!-- AC_CODE -->')
    if (markerIndex !== -1) {
      const afterMarker = content.substring(markerIndex)
      for (const pattern of codeBlockPatterns) {
        const match = afterMarker.match(pattern)
        if (match && match[1]) { code = match[1].trim(); break }
      }
    }
  }

  // ── 优先级 3：固定节标题
  if (!code) {
    const sectionTitles = [
      '## 4. 核心代码', '## 核心代码',
      '## 代码实现', '## 完整代码', '## AC代码',
      '## 参考代码', '## 标准代码',
      '### 代码实现', '### 完整代码'
    ]
    for (const title of sectionTitles) {
      const secIdx = content.indexOf(title)
      if (secIdx !== -1) {
        const nextH2 = content.indexOf('\n## ', secIdx + title.length)
        const region = nextH2 !== -1
          ? content.substring(secIdx, nextH2)
          : content.substring(secIdx)
        for (const pattern of codeBlockPatterns) {
          const match = region.match(pattern)
          if (match && match[1]) { code = match[1].trim(); break }
        }
        if (code) break
      }
    }
  }

  // ── 优先级 4（兜底）：取最后一个代码块
  if (!code) {
    const codeBlockPatternsGlobal = [
      /```(?:cpp|c\+\+)\s*\n([\s\S]*?)```/ig,
      /```(?:python|py)\s*\n([\s\S]*?)```/ig,
      /```java\s*\n([\s\S]*?)```/ig,
      /```\s*\n([\s\S]*?)```/g
    ]
    for (const pattern of codeBlockPatternsGlobal) {
      const matches = [...content.matchAll(pattern)]
      if (matches.length > 0) {
        code = matches[matches.length - 1][1].trim()
        break
      }
    }
  }

  if (!code && content.trim() && !content.includes('```')) {
    code = content.trim()
  }

  if (code) {
    code = code.replace(/<!--\s*AC_CODE(?:_START|_END)?\s*-->/g, '').trim()
    const lines = code.split('\n')
    if (lines.length > 0 && /^(c\+\+|cpp|python|py|java|javascript|js)$/i.test(lines[0].trim())) {
      code = lines.slice(1).join('\n').trim()
    }
    return code
  }

  return ''
}

// 清理 dataOutput 中的 markdown / 语言标识
export function cleanDataOutput(content) {
  if (!content) return ''
  let cleaned = content.replace(/<!--\s*AC_CODE\s*-->/g, '').trim()

  const codeBlockMatch = cleaned.match(/^```(python|py)?\s*\n([\s\S]*?)```$/)
  if (codeBlockMatch) {
    let codeContent = codeBlockMatch[2]
    const lang = codeBlockMatch[1] || 'python'
    const lines = codeContent.split('\n')
    if (lines.length > 0 && /^(python|py)$/i.test(lines[0].trim())) {
      codeContent = lines.slice(1).join('\n')
    }
    return '```' + lang + '\n' + codeContent.trim() + '\n```'
  }

  if (cleaned.startsWith('```')) {
    const firstLineEnd = cleaned.indexOf('\n')
    if (firstLineEnd !== -1) {
      const firstLine = cleaned.substring(0, firstLineEnd).trim()
      let rest = cleaned.substring(firstLineEnd + 1)
      const restLines = rest.split('\n')
      if (restLines.length > 0 && /^(python|py)$/i.test(restLines[0].trim())) {
        rest = restLines.slice(1).join('\n')
      }
      return firstLine + '\n' + rest
    }
  }

  const lines = cleaned.split('\n')
  if (lines.length > 0 && /^(python|py)$/i.test(lines[0].trim())) {
    cleaned = lines.slice(1).join('\n').trim()
  }

  return cleaned
}

// 处理数据生成脚本：去除 markdown、修正路径与执行命令
export function processDataScript(scriptContent, language) {
  if (!scriptContent) return ''

  let script = ''
  const scriptPatterns = [
    /```python\s*\n([\s\S]*?)```/i,
    /```python([\s\S]*?)```/i,
    /```py\s*\n([\s\S]*?)```/i,
    /```py([\s\S]*?)```/i,
    /```\s*\n([\s\S]*?)```/
  ]

  for (const pattern of scriptPatterns) {
    const match = scriptContent.match(pattern)
    if (match && match[1]) {
      script = match[1].trim()
      script = script.replace(/^(?:python|py)\s+/i, '')
      script = script.replace(/^#!\/usr\/bin\/env python[0-9]?\s*\n/, '')
      break
    }
  }

  if (!script && scriptContent.trim()) {
    script = scriptContent.trim()
  }

  if (script) {
    const lines = script.split('\n')
    const cleanedLines = []
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()
      if (!trimmed.startsWith('#') && !trimmed.startsWith('"""') && !trimmed.startsWith("'''")) {
        if (/^##\s+/.test(trimmed) || /^\*\*说明[：:]\*\*/.test(trimmed)) {
          break
        }
      }
      cleanedLines.push(line)
    }
    script = cleanedLines.join('\n').trim()
  }

  let modifiedScript = script.replace(/file_prefix\s*=\s*['"].*?['"]/g, `file_prefix='./testdata/data'`)

  if (language === 'C++') {
    modifiedScript = modifiedScript.replace(/output_gen\s*\(\s*['"].*?['"]\s*\)/g, `output_gen('std.exe')`)
  } else if (language === 'Python') {
    modifiedScript = modifiedScript.replace(/output_gen\s*\(\s*['"].*?['"]\s*\)/g, `output_gen('python std.py')`)
  } else if (language === 'Java') {
    modifiedScript = modifiedScript.replace(/output_gen\s*\(\s*['"].*?['"]\s*\)/g, `output_gen('java Main')`)
  }

  return modifiedScript
}

// 通过代码块语言标识检测主语言
export function detectLanguage(codeOutput) {
  if (!codeOutput) return { ext: 'cpp', lang: 'C++' }
  if (codeOutput.includes('```python') || codeOutput.includes('```py')) {
    return { ext: 'py', lang: 'Python' }
  }
  if (codeOutput.includes('```java')) {
    return { ext: 'java', lang: 'Java' }
  }
  return { ext: 'cpp', lang: 'C++' }
}

// 将翻译文本中的第一个 # 标题替换为 metaTitle
export function applyTitleToTranslation(text, metaTitle) {
  if (!text || !metaTitle) return text
  return text.replace(/^(#{1,3} ).+/m, `$1${metaTitle}`)
}

// 启发式从 meta/正文中智能提取标题
export function getSmartTitle(meta, text, id) {
  let title = `task_${id}`
  if (meta && meta.title && meta.title !== '题目标题') {
    title = meta.title
  } else {
    const src = (text || '').trim()
    const lines = src.split('\n').map(s => s.trim()).filter(Boolean)
    const badKeywords = /(题目背景|题面背景|题目描述|题面描述|背景|说明|介绍|题目标题)/
    const stripMd = (s) => s.replace(/^#{1,6}\s*/, '')

    for (let j = 0; j < lines.length; j++) {
      const m = lines[j].match(/^#{1,3}\s*(.+)$/)
      if (m) {
        const t = stripMd(m[1]).trim()
        if (t && !badKeywords.test(t)) { title = t; break }
      }
    }
    if (title === `task_${id}`) {
      for (let j = 0; j < lines.length; j++) {
        const t = stripMd(lines[j]).trim()
        if (!t) continue
        if (/^(输入|输出|数据范围|样例|说明)/.test(t)) continue
        if (badKeywords.test(t)) continue
        const cleaned = t.replace(/^[-*\s]+/, '')
        if (cleaned) { title = cleaned; break }
      }
    }
  }
  return normalizeProblemTitle(title.replace(/[\\/:*?"<>|]/g, '_').trim(), `task_${id}`)
}

// 启发式从 codeOutput / manualCode 中挑出最佳代码内容
export function getBestCodeContent(codeOutput, manualCode) {
  if (codeOutput && codeOutput.trim()) {
    const extracted = extractPureCode(codeOutput)
    if (extracted) return stripFreopenStatements(extracted)
    return stripFreopenStatements(codeOutput)
  }

  if (manualCode && manualCode.trim()) {
    const manualContent = manualCode.trim()

    if (manualContent.includes('```')) {
      const extracted = extractPureCode(manualContent)
      if (extracted) return extracted
    }

    const strongCodeStart = /^\s*(#include|package|import|using|public\s+class|class\s+\w+|def\s+\w+)/m
    const textKeywords = ['思路', '解法', '复杂度', '算法', 'Solution', 'Approach', 'Complexity', '首先', '然后', '考え方', '説明', 'コード', '回答']
    const hasTextKeywords = textKeywords.some(k => manualContent.includes(k))

    let looksLikeCode = false
    if (hasTextKeywords) {
      looksLikeCode = false
    } else if (strongCodeStart.test(manualContent)) {
      looksLikeCode = true
    } else {
      const symbolCount = (manualContent.match(/[;{}=\[\]]/g) || []).length
      const lineCount = manualContent.split('\n').length
      if (symbolCount / lineCount > 0.8) {
        looksLikeCode = true
      }
    }

    if (looksLikeCode) {
      return stripFreopenStatements(manualContent)
    }

    const extracted = extractPureCode(manualContent)
    if (extracted) return stripFreopenStatements(extracted)
  }

  return ''
}

export function stripFreopenStatements(content) {
  if (!content) return ''

  const lines = String(content).split(/\r?\n/)
  const keptLines = []
  let skippingFreopen = false

  for (const line of lines) {
    if (!skippingFreopen && /\bfreopen\s*\(/.test(line)) {
      skippingFreopen = !/;/.test(line)
      continue
    }

    if (skippingFreopen) {
      if (/;/.test(line)) skippingFreopen = false
      continue
    }

    keptLines.push(line)
  }

  return keptLines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}