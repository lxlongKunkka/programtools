#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const workspaceRoot = path.resolve(__dirname, '../..')

const args = process.argv.slice(2)
const inputDir = resolveArg('in-dir', path.join(workspaceRoot, 'Downloads', 'quiz-import-final'))
const outDir = resolveArg('out-dir', path.join(workspaceRoot, 'Downloads', 'quiz-import-final-fixed'))

const MANUAL_SINGLE_ANSWER_MAP = {
  'downloads-1002-q19': {
    answer: 'B',
    explanation: '时间复杂度描述的是算法主要运算次数与问题规模之间的函数关系，而不是某台机器上的具体运行时间。A 把时间复杂度和实际运行时间混淆了；C 把 NPC 问题是否存在多项式算法说成了既成事实，这一点目前并未被证明；D 把 NP 与 NPC 混为一谈，也不成立。'
  },
  'downloads-1120-q3': {
    answer: 'B',
    explanation: '查询区间 [3,11] 在满线段树上的最优分解是 [3,3]、[4,7]、[8,11]。从根开始需要访问 [0,15]、[0,7]、[8,15]、[0,3]、[4,7]、[2,3]、[3,3]、[8,11] 共 8 个结点。'
  }
}

const MULTI_CHOICE_UIDS = new Set([
  'downloads-1002-q11',
  'downloads-1004-q11',
  'downloads-1004-q20',
  'downloads-1006-q19',
  'downloads-1008-q13',
  'downloads-1008-q20',
  'downloads-1010-q12',
  'downloads-1010-q14',
  'downloads-1012-q16',
  'downloads-1012-q17',
  'downloads-1012-q20',
  'downloads-1016-q17',
  'downloads-1016-q18',
  'downloads-1016-q19',
  'downloads-1018-q16',
  'downloads-1020-q18',
  'downloads-1022-q16',
  'downloads-1022-q19',
  'downloads-1029-q13',
  'downloads-1029-q15'
])

const MALFORMED_UIDS = new Set([
  'downloads-1031-q16',
  'downloads-1031-q19',
  'downloads-1033-q16',
  'downloads-1034-q18',
  'downloads-1034-q19',
  'downloads-1035-q20',
  'downloads-1036-q20',
  'downloads-1038-q18',
  'downloads-1038-q20',
  'downloads-1039-q16',
  'downloads-1039-q19',
  'downloads-1042-q19',
  'downloads-1042-q20',
  'downloads-1044-q20'
])

main()

function main() {
  const papers = readJson(path.join(inputDir, 'quiz_papers.json'))
  const resolvedQuestions = readJson(path.join(inputDir, 'quiz_questions.json'))
  const unresolvedQuestions = readJson(path.join(inputDir, 'unresolved_questions.json'))

  const manualResolved = []
  const excludedMultiChoice = []
  const excludedMalformed = []
  const unknown = []

  for (const question of unresolvedQuestions) {
    const manual = MANUAL_SINGLE_ANSWER_MAP[question.questionUid]
    if (manual) {
      manualResolved.push(applyManualAnswer(question, manual))
      continue
    }

    if (MULTI_CHOICE_UIDS.has(question.questionUid)) {
      excludedMultiChoice.push(withExcludeReason(question, 'multiple-choice-schema-mismatch', '题干或选项明显存在多个正确项，当前题库仅支持 single/judge，不能安全入库。'))
      continue
    }

    if (MALFORMED_UIDS.has(question.questionUid)) {
      excludedMalformed.push(withExcludeReason(question, 'malformed-aggregate-question', '导入时把多道阅读程序/完善程序小题合并成了一题，选项结构已损坏，需人工拆题后再入库。'))
      continue
    }

    unknown.push(question)
  }

  if (unknown.length > 0) {
    throw new Error(`存在未分类题目: ${unknown.map((item) => item.questionUid).join(', ')}`)
  }

  const finalQuestions = [...resolvedQuestions, ...manualResolved]
    .map(normalizeFinalQuestion)
    .sort(compareQuestions)

  const finalPapers = rebuildPapers(papers, finalQuestions)

  fs.mkdirSync(outDir, { recursive: true })
  writeJson(path.join(outDir, 'quiz_papers.json'), finalPapers)
  writeJson(path.join(outDir, 'quiz_questions.json'), finalQuestions)
  writeJson(path.join(outDir, 'unresolved_questions.json'), [])
  writeJson(path.join(outDir, 'excluded_multiple_choice.json'), excludedMultiChoice)
  writeJson(path.join(outDir, 'excluded_malformed_questions.json'), excludedMalformed)
  writeJson(path.join(outDir, 'summary.json'), {
    sourceDir: inputDir,
    papers: papers.length,
    resolvedPapers: finalPapers.length,
    questions: finalQuestions.length + excludedMultiChoice.length + excludedMalformed.length,
    importableQuestions: finalQuestions.length,
    manuallyResolvedQuestions: manualResolved.length,
    unresolvedQuestions: 0,
    excludedMultipleChoice: excludedMultiChoice.length,
    excludedMalformed: excludedMalformed.length
  })

  const hydroDir = path.join(outDir, 'hydro-import')
  exportHydroDirectory(finalPapers, finalQuestions, hydroDir)

  console.log(JSON.stringify({
    outDir,
    hydroDir,
    importableQuestions: finalQuestions.length,
    manuallyResolvedQuestions: manualResolved.length,
    excludedMultipleChoice: excludedMultiChoice.length,
    excludedMalformed: excludedMalformed.length,
    resolvedPapers: finalPapers.length
  }, null, 2))
}

function resolveArg(name, fallbackValue) {
  const prefix = `--${name}=`
  const match = args.find((item) => item.startsWith(prefix))
  if (!match) return fallbackValue
  return path.resolve(match.slice(prefix.length))
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8')
}

function applyManualAnswer(question, manual) {
  return {
    ...question,
    answer: manual.answer,
    explanation: manual.explanation,
    explanationText: manual.explanation,
    enabled: true,
    reviewStatus: 'pending'
  }
}

function normalizeFinalQuestion(question) {
  const levelTag = deriveDownloadsLevelTag(question.sourceTitle, question.tags)
  return {
    ...question,
    enabled: !!question.answer,
    reviewStatus: question.answer ? 'pending' : (question.reviewStatus || 'draft'),
    levelTag
  }
}

function withExcludeReason(question, reason, detail) {
  return {
    ...question,
    excludeReason: reason,
    excludeReasonDetail: detail
  }
}

function compareQuestions(a, b) {
  return Number(a.sourceDocId || 0) - Number(b.sourceDocId || 0)
    || Number(a.paperQuestionNo || 0) - Number(b.paperQuestionNo || 0)
    || String(a.questionUid || '').localeCompare(String(b.questionUid || ''), 'zh-CN')
}

function rebuildPapers(papers, questions) {
  const countMap = new Map()
  for (const question of questions) {
    countMap.set(question.paperUid, (countMap.get(question.paperUid) || 0) + 1)
  }

  return papers
    .map((paper) => ({
      ...paper,
      questionCount: countMap.get(paper.paperUid) || 0,
      status: (countMap.get(paper.paperUid) || 0) > 0 ? 'active' : 'draft'
    }))
    .filter((paper) => paper.questionCount > 0)
    .sort((a, b) => Number(a.sourceDocId || 0) - Number(b.sourceDocId || 0))
}

function exportHydroDirectory(papers, questions, hydroDir) {
  fs.mkdirSync(hydroDir, { recursive: true })
  const questionGroups = new Map()
  for (const question of questions) {
    if (!questionGroups.has(question.paperUid)) {
      questionGroups.set(question.paperUid, [])
    }
    questionGroups.get(question.paperUid).push(question)
  }

  const usedNames = new Set()
  for (const paper of papers) {
    const paperQuestions = (questionGroups.get(paper.paperUid) || []).sort(compareQuestions)
    if (paperQuestions.length === 0) continue

    const folderName = uniqueFolderName(sanitizeFolderName(paper.title || paper.paperUid), usedNames)
    const problemDir = path.join(hydroDir, folderName)
    const testdataDir = path.join(problemDir, 'testdata')
    const additionalDir = path.join(problemDir, 'additional_file')
    fs.mkdirSync(testdataDir, { recursive: true })
    fs.mkdirSync(additionalDir, { recursive: true })

    fs.writeFileSync(path.join(problemDir, 'problem.yaml'), buildProblemYaml(paper, paperQuestions), 'utf-8')
    fs.writeFileSync(path.join(problemDir, 'problem_zh.md'), buildProblemMarkdown(paper, paperQuestions), 'utf-8')
    fs.writeFileSync(path.join(testdataDir, 'config.yaml'), buildConfigYaml(paperQuestions), 'utf-8')
    fs.writeFileSync(path.join(additionalDir, 'solution.md'), buildSolutionMarkdown(paper, paperQuestions), 'utf-8')
  }
}

function sanitizeFolderName(value) {
  return String(value || 'paper')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim() || 'paper'
}

function uniqueFolderName(baseName, usedNames) {
  let name = baseName
  let index = 1
  while (usedNames.has(name)) {
    index += 1
    name = `${baseName} (${index})`
  }
  usedNames.add(name)
  return name
}

function buildProblemYaml(paper, questions) {
  const tags = [...new Set(questions.flatMap((item) => item.tags || []).filter(Boolean))]
  const lines = [`title: ${paper.title || paper.paperUid}`, 'tag:']
  for (const tag of tags) {
    lines.push(`  - ${tag}`)
  }
  return `${lines.join('\n')}\n`
}

function buildProblemMarkdown(paper, questions) {
  const lines = [`# ${paper.title || paper.paperUid}`, '']
  for (const question of questions) {
    appendQuestionBlock(lines, question, false)
  }
  return `${lines.join('\n')}\n`
}

function buildSolutionMarkdown(paper, questions) {
  const lines = [`# ${paper.title || paper.paperUid} - 题目与解析`, '']
  for (const question of questions) {
    appendQuestionBlock(lines, question, true)
  }
  return `${lines.join('\n')}\n`
}

function appendQuestionBlock(lines, question, includeAnswer) {
  const number = Number(question.paperQuestionNo || 0)
  const displayNumber = number > 0 ? number : question.questionUid
  lines.push(`${displayNumber}), ${String(question.stem || '').trim()}`)
  lines.push(`{{ select(${displayNumber}) }}`)

  for (const option of normalizeExportOptions(question)) {
    lines.push(`- ${option.key}. ${String(option.text || '').trim()}`)
  }

  if (includeAnswer) {
    lines.push('')
    lines.push(`> **答案**: ${normalizeExportAnswer(question)}`)
    if (question.explanation) {
      lines.push(`> **解析**: ${String(question.explanation).trim()}`)
    }
    lines.push('')
    lines.push('---')
  }

  lines.push('')
}

function buildConfigYaml(questions) {
  const lines = ['type: objective', 'answers:']
  for (const question of questions) {
    const number = Number(question.paperQuestionNo || 0)
    const answer = normalizeExportAnswer(question)
    lines.push(`  '${number}':`)
    lines.push(`  - ${answer}`)
    lines.push('  - 2')
  }
  return `${lines.join('\n')}\n`
}

function normalizeExportOptions(question) {
  const options = Array.isArray(question.options) ? question.options : []
  if (question.type !== 'judge') {
    return options.map((item) => ({
      key: item.key,
      text: item.text
    }))
  }

  const trueOption = options.find((item) => /正确|对|true/i.test(String(item.text || '')))
  const falseOption = options.find((item) => /错误|错|false/i.test(String(item.text || '')))
  return [
    { key: 'true', text: trueOption?.text || '正确' },
    { key: 'false', text: falseOption?.text || '错误' }
  ]
}

function normalizeExportAnswer(question) {
  if (question.type !== 'judge') {
    return String(question.answer || '').trim().toUpperCase()
  }

  const correctOption = Array.isArray(question.options)
    ? question.options.find((item) => /正确|对|true/i.test(String(item.text || '')))
    : null
  const answer = String(question.answer || '').trim().toUpperCase()
  return answer === String(correctOption?.key || 'A').toUpperCase() ? 'true' : 'false'
}

function deriveDownloadsLevelTag(sourceTitle, tags = []) {
  const text = String(sourceTitle || '')
  const chineseLevelMatch = text.match(/([一二三四五六七八九十])级/)
  if (chineseLevelMatch) {
    const map = {
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
    const level = map[chineseLevelMatch[1]]
    if (level) return `gesp${level}`
  }

  const tagSet = new Set(Array.isArray(tags) ? tags : [])
  if (/BCSP-X.*小学低年级/.test(text)) return 'gesp1'
  if (/BCSP-X.*小学高年级/.test(text)) return 'gesp2'
  if (/BCSP-X.*初中组/.test(text)) return 'gesp3'
  if (/海淀区信息学竞赛/.test(text)) return 'gesp5'
  if (/LMCC/.test(text)) return 'gesp4'
  if (/NOIP/i.test(text) && /提高组/.test(text)) return 'gesp9'
  if (/NOIP/i.test(text) && /普及组/.test(text)) return 'gesp4'
  if (/(CSP|SCP)/i.test(text) && /提高级/.test(text)) return 'gesp9'
  if (/(CSP|SCP)/i.test(text) && /入门级/.test(text)) return 'gesp4'
  if (/(CSP|SCP)/i.test(text)) return 'gesp9'
  if (/NOI(?!P)/i.test(text)) return 'gesp10'
  if (/提高组|提高级/.test(text) || tagSet.has('advanced')) return 'gesp9'
  if (/普及组|入门级/.test(text) || tagSet.has('beginner')) return 'gesp4'
  return ''
}