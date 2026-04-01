const DEFAULT_MAIN_MODEL = 'o4-mini'
const MAIN_MODEL_STORAGE_KEY = 'programtools_default_main_model'
const DEFAULT_TRANSLATION_MODEL = 'gemini-3-flash-preview'
const TRANSLATION_MODEL_STORAGE_KEY = 'programtools_default_translation_model'
const DEFAULT_REPORT_MODEL = 'gemini-3-flash-preview'
const REPORT_MODEL_STORAGE_KEY = 'programtools_default_report_model'

function readStoredPreference(key) {
  if (typeof window === 'undefined') return ''
  try {
    const sessionValue = window.sessionStorage.getItem(key)
    if (String(sessionValue || '').trim()) return String(sessionValue).trim()
  } catch (_) {
    // Ignore sessionStorage failures.
  }
  try {
    return String(window.localStorage.getItem(key) || '').trim()
  } catch (_) {
    return ''
  }
}

function writeStoredPreference(key, value) {
  if (typeof window === 'undefined') return value
  try {
    window.localStorage.setItem(key, value)
    try {
      window.sessionStorage.removeItem(key)
    } catch (_) {
      // Ignore session cleanup failures.
    }
    return value
  } catch (_) {
    try {
      window.localStorage.removeItem(key)
    } catch (_) {
      // Ignore cleanup failures.
    }
    try {
      window.sessionStorage.setItem(key, value)
    } catch (_) {
      // Ignore storage failures and keep the in-memory choice.
    }
    return value
  }
}

export function getDefaultMainModel() {
  const saved = readStoredPreference(MAIN_MODEL_STORAGE_KEY)
  return saved || DEFAULT_MAIN_MODEL
}

export function setDefaultMainModel(modelId) {
  const normalized = String(modelId || '').trim() || DEFAULT_MAIN_MODEL
  return writeStoredPreference(MAIN_MODEL_STORAGE_KEY, normalized)
}

export function getDefaultTranslationModel() {
  const saved = readStoredPreference(TRANSLATION_MODEL_STORAGE_KEY)
  return saved || DEFAULT_TRANSLATION_MODEL
}

export function setDefaultTranslationModel(modelId) {
  const normalized = String(modelId || '').trim() || DEFAULT_TRANSLATION_MODEL
  return writeStoredPreference(TRANSLATION_MODEL_STORAGE_KEY, normalized)
}

export function getDefaultReportModel() {
  const saved = readStoredPreference(REPORT_MODEL_STORAGE_KEY)
  return saved || DEFAULT_REPORT_MODEL
}

export function setDefaultReportModel(modelId) {
  const normalized = String(modelId || '').trim() || DEFAULT_REPORT_MODEL
  return writeStoredPreference(REPORT_MODEL_STORAGE_KEY, normalized)
}

export function resolvePreferredModel(models, preferredModel, fallbackModel = DEFAULT_TRANSLATION_MODEL) {
  const ids = Array.isArray(models)
    ? models.map(item => String(item?.id || '').trim()).filter(Boolean)
    : []
  const preferred = String(preferredModel || '').trim()
  const fallback = String(fallbackModel || '').trim() || DEFAULT_TRANSLATION_MODEL

  if (preferred && ids.includes(preferred)) return preferred
  if (fallback && ids.includes(fallback)) return fallback
  if (ids.length > 0) return ids[0]
  return preferred || fallback || DEFAULT_TRANSLATION_MODEL
}

export { DEFAULT_MAIN_MODEL, DEFAULT_REPORT_MODEL, DEFAULT_TRANSLATION_MODEL }