import { stripFreopenStatements } from './codeCleaning'
import { normalizeProblemMetaTitle } from './titleNormalization'

export function createInitialGenerationSteps() {
  return {
    translate: 'pending',
    solution: 'pending',
    report: 'pending',
    data: 'pending',
    meta: 'pending',
  }
}

export function hasMarkdownSolution(codeContent) {
  if (!codeContent) return false
  return (
    codeContent.includes('## 算法思路') ||
    codeContent.includes('## 代码实现') ||
    codeContent.includes('**算法思路**')
  )
}

export function buildSolutionRequestConfig({ problemText, manualCode, model, language }) {
  const cleanedManualCode = stripFreopenStatements(manualCode || '')
  const isExplainMode = !!String(cleanedManualCode || '').trim()
  return isExplainMode
    ? {
        endpoint: '/api/solve',
        payload: {
          text: problemText,
          acCode: cleanedManualCode,
          model,
          language,
        },
      }
    : {
        endpoint: '/api/solution',
        payload: {
          text: problemText,
          model,
          language,
        },
      }
}

export function buildMetaRequestPayload({ task, fallbackText, model, solution = '' }) {
  return {
    text: task?.translationText?.trim() ? task.translationText : (fallbackText || task?.problemText || ''),
    ...(solution ? { solution } : {}),
    model,
  }
}

export function mergeGeneratedMeta(existingMeta, meta) {
  if (!meta) return existingMeta || {}
  const safeExistingMeta = normalizeProblemMetaTitle(existingMeta || {})
  const safeMeta = normalizeProblemMetaTitle(meta)
  if (!safeExistingMeta.title || safeExistingMeta.title === '题目标题') {
    return normalizeProblemMetaTitle({ ...safeExistingMeta, ...safeMeta })
  }

  const { title, ...rest } = safeMeta
  return normalizeProblemMetaTitle({ ...safeExistingMeta, ...rest })
}

export function resolveDataGenerationInput({ taskSnapshot, extractPureCode }) {
  const hasManualCode = !!taskSnapshot?.manualCode?.trim()
  const text = hasManualCode
    ? (taskSnapshot?.problemText || '请根据代码逻辑生成测试数据')
    : (taskSnapshot?.problemText || '')

  const rawCode = hasManualCode
    ? stripFreopenStatements(taskSnapshot?.manualCode || '')
    : stripFreopenStatements(taskSnapshot?.serverPureCode || taskSnapshot?.codeOutput || '')

  return {
    hasManualCode,
    text,
    rawCode,
    code: stripFreopenStatements(extractPureCode(rawCode || '') || rawCode || ''),
  }
}

export function buildSolutionReportPayload({
  task,
  extractPureCode,
  model,
  language,
  codeFallbackMessage = '用户未提供代码，请根据题目描述生成标准 AC 代码，并添加详细中文注释。',
  referenceFallback = '',
}) {
  if (!task?.problemText) return null

  const codeContent = (task.codeOutput && task.codeOutput.trim()) ? task.codeOutput : task.manualCode
  const solutionPlan = hasMarkdownSolution(codeContent) ? codeContent : ''

  let pureCode = (task.serverPureCode && task.serverPureCode.trim())
    ? task.serverPureCode
    : (extractPureCode(codeContent || '') || '')

  if (!pureCode) {
    pureCode = codeFallbackMessage
  } else {
    pureCode = stripFreopenStatements(pureCode)
  }

  return {
    problem: task.translationText || task.problemText,
    code: pureCode,
    reference: solutionPlan || task.referenceText || referenceFallback,
    solutionPlan,
    model,
    language,
  }
}