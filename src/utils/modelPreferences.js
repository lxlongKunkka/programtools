const DEFAULT_TRANSLATION_MODEL = 'gemini-3-flash-preview'
const TRANSLATION_MODEL_STORAGE_KEY = 'programtools_default_translation_model'
const DEFAULT_REPORT_MODEL = 'gemini-3-flash-preview'
const REPORT_MODEL_STORAGE_KEY = 'programtools_default_report_model'

export function getDefaultTranslationModel() {
  if (typeof window === 'undefined') return DEFAULT_TRANSLATION_MODEL
  try {
    const saved = window.localStorage.getItem(TRANSLATION_MODEL_STORAGE_KEY)
    return String(saved || '').trim() || DEFAULT_TRANSLATION_MODEL
  } catch (_) {
    return DEFAULT_TRANSLATION_MODEL
  }
}

export function setDefaultTranslationModel(modelId) {
  const normalized = String(modelId || '').trim() || DEFAULT_TRANSLATION_MODEL
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(TRANSLATION_MODEL_STORAGE_KEY, normalized)
    } catch (_) {
      // Ignore storage failures and keep the in-memory choice.
    }
  }
  return normalized
}

export function getDefaultReportModel() {
  if (typeof window === 'undefined') return DEFAULT_REPORT_MODEL
  try {
    const saved = window.localStorage.getItem(REPORT_MODEL_STORAGE_KEY)
    return String(saved || '').trim() || DEFAULT_REPORT_MODEL
  } catch (_) {
    return DEFAULT_REPORT_MODEL
  }
}

export function setDefaultReportModel(modelId) {
  const normalized = String(modelId || '').trim() || DEFAULT_REPORT_MODEL
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(REPORT_MODEL_STORAGE_KEY, normalized)
    } catch (_) {
      // Ignore storage failures and keep the in-memory choice.
    }
  }
  return normalized
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

export { DEFAULT_REPORT_MODEL, DEFAULT_TRANSLATION_MODEL }