// Lightbot 程序/操作工具。从 LightbotGame.vue 抽出。
import { CONDITION_TEST_META, PROCEDURE_KEYS, VALID_OPERATION_IDS } from './constants.js'

export function createEmptyProcedures() {
  return Object.fromEntries(PROCEDURE_KEYS.map((key) => [key, []]))
}

export function isRepeatOperation(operation) {
  return Boolean(
    operation
    && typeof operation === 'object'
    && operation.type === 'repeat'
    && typeof operation.body === 'string'
    && VALID_OPERATION_IDS.has(operation.body)
    && Number.isInteger(operation.count)
    && operation.count > 1
  )
}

export function isConditionalOperation(operation) {
  return Boolean(
    operation
    && typeof operation === 'object'
    && operation.type === 'condition'
    && typeof operation.body === 'string'
    && VALID_OPERATION_IDS.has(operation.body)
    && typeof operation.test === 'string'
    && CONDITION_TEST_META[operation.test]
  )
}

export function isRepeatPaletteOperation(operation) {
  return Boolean(operation?.kind === 'repeat' && Number.isInteger(operation?.count))
}

export function isConditionalPaletteOperation(operation) {
  return Boolean(operation?.kind === 'condition' && typeof operation?.test === 'string' && CONDITION_TEST_META[operation.test])
}

export function createRepeatOperation(body, count = 2) {
  return {
    type: 'repeat',
    body,
    count: Math.max(2, Math.min(9, Number(count) || 2))
  }
}

export function createConditionalOperation(body, test = 'dark-target') {
  return {
    type: 'condition',
    body,
    test: CONDITION_TEST_META[test] ? test : 'green-floor'
  }
}

export function normalizeOperationEntry(operation) {
  if (typeof operation === 'string') {
    const normalized = operation.trim()
    return VALID_OPERATION_IDS.has(normalized) ? normalized : null
  }

  if (isRepeatOperation(operation)) {
    return createRepeatOperation(operation.body, operation.count)
  }

  if (isConditionalOperation(operation)) {
    return createConditionalOperation(operation.body, operation.test)
  }

  if (operation && typeof operation === 'object' && operation.type === 'repeat') {
    const body = typeof operation.body === 'string' ? operation.body.trim() : ''
    if (!VALID_OPERATION_IDS.has(body)) return null
    return createRepeatOperation(body, operation.count)
  }

  if (operation && typeof operation === 'object' && operation.type === 'condition') {
    const body = typeof operation.body === 'string' ? operation.body.trim() : ''
    const test = typeof operation.test === 'string' ? operation.test.trim() : ''
    if (!VALID_OPERATION_IDS.has(body) || !CONDITION_TEST_META[test]) return null
    return createConditionalOperation(body, test)
  }

  return null
}

export function cloneOperation(operation) {
  const normalized = normalizeOperationEntry(operation)
  if (!normalized) return null
  return isRepeatOperation(normalized) || isConditionalOperation(normalized) ? { ...normalized } : normalized
}

export function cloneOperationList(list = []) {
  if (!Array.isArray(list)) return []
  return list.map((operation) => cloneOperation(operation)).filter(Boolean)
}

export function cloneProcedureMap(procedures = {}) {
  return Object.fromEntries(PROCEDURE_KEYS.map((key) => [key, cloneOperationList(procedures[key] || [])]))
}
