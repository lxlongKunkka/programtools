// Lightbot 编辑器草稿工具。
import { makeTile, VALID_LEVEL_IDS } from '../../data/lightbotLevels'
import { EDITOR_DRAFT_STORAGE_KEY } from './constants.js'
import { cloneOperationList } from './operations.js'
import {
  cloneBoard,
  createEmptyEditorBoard,
  normalizeEditorBoard,
  normalizeEditorState
} from './level.js'
import { readLightbotStorage } from './storage.js'

export function createDefaultEditorDraft() {
  const board = createEmptyEditorBoard()
  board[0][0] = makeTile(1)
  board[0][1] = makeTile(1, true)
  return {
    sourceLevelId: null,
    sourceIsCustom: false,
    sourceCreatedBy: null,
    title: 'My Level',
    skill: 'Custom',
    description: '学员自制关卡。',
    goal: '点亮所有目标格。',
    mainLimit: 8,
    p1Limit: 0,
    p2Limit: 0,
    enableIfGreen: false,
    enableIfRed: false,
    enableIfDark: false,
    enableIfForwardClear: false,
    demo: { main: [], p1: [], p2: [] },
    start: { x: 0, y: 0, dir: 'forward' },
    board
  }
}

export function serializeEditorDraft(draft) {
  return {
    sourceLevelId: draft.sourceLevelId || null,
    sourceIsCustom: Boolean(draft.sourceIsCustom),
    sourceCreatedBy: Number.isFinite(Number(draft.sourceCreatedBy)) ? Number(draft.sourceCreatedBy) : null,
    chapterId: draft.chapterId || null,
    chapterTitle: draft.chapterTitle || null,
    chapterOrder: Number.isFinite(draft.chapterOrder) ? draft.chapterOrder : null,
    demo: {
      main: cloneOperationList(draft.demo?.main || []),
      p1: cloneOperationList(draft.demo?.p1 || []),
      p2: cloneOperationList(draft.demo?.p2 || [])
    },
    title: draft.title,
    skill: draft.skill,
    description: draft.description,
    goal: draft.goal,
    mainLimit: Number(draft.mainLimit) || 8,
    p1Limit: Number(draft.p1Limit) || 0,
    p2Limit: Number(draft.p2Limit) || 0,
    enableIfGreen: Boolean(draft.enableIfGreen),
    enableIfRed: Boolean(draft.enableIfRed),
    enableIfDark: Boolean(draft.enableIfDark),
    enableIfForwardClear: Boolean(draft.enableIfForwardClear),
    start: { ...draft.start },
    board: cloneBoard(draft.board)
  }
}

export function loadSavedEditorDraft() {
  try {
    const raw = readLightbotStorage(EDITOR_DRAFT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.board)) return null

    const normalized = normalizeEditorState(parsed.board, parsed.start || { x: 0, y: 0, dir: 'forward' })
    return {
      sourceLevelId: typeof parsed.sourceLevelId === 'string' ? parsed.sourceLevelId : null,
      sourceIsCustom: typeof parsed.sourceLevelId === 'string'
        ? (typeof parsed.sourceIsCustom === 'boolean' ? parsed.sourceIsCustom : !VALID_LEVEL_IDS.has(parsed.sourceLevelId))
        : false,
      sourceCreatedBy: Number.isFinite(Number(parsed.sourceCreatedBy)) ? Number(parsed.sourceCreatedBy) : null,
      chapterId: typeof parsed.chapterId === 'string' ? parsed.chapterId : null,
      chapterTitle: typeof parsed.chapterTitle === 'string' ? parsed.chapterTitle : null,
      chapterOrder: Number.isFinite(parsed.chapterOrder) ? parsed.chapterOrder : null,
      demo: {
        main: cloneOperationList(parsed.demo?.main || []),
        p1: cloneOperationList(parsed.demo?.p1 || []),
        p2: cloneOperationList(parsed.demo?.p2 || [])
      },
      title: typeof parsed.title === 'string' ? parsed.title : 'My Level',
      skill: typeof parsed.skill === 'string' ? parsed.skill : 'Custom',
      description: typeof parsed.description === 'string' ? parsed.description : '学员自制关卡。',
      goal: typeof parsed.goal === 'string' ? parsed.goal : '点亮所有目标格。',
      mainLimit: Number(parsed.mainLimit) || 8,
      p1Limit: Number(parsed.p1Limit) || 0,
      p2Limit: Number(parsed.p2Limit) || 0,
      enableIfGreen: Boolean(parsed.enableIfGreen || parsed.commandOptions?.ifGreen),
      enableIfRed: Boolean(parsed.enableIfRed || parsed.commandOptions?.ifRed),
      enableIfDark: Boolean(parsed.enableIfDark || parsed.commandOptions?.ifDark),
      enableIfForwardClear: Boolean(parsed.enableIfForwardClear || parsed.commandOptions?.ifForwardClear),
      start: { ...normalized.start, dir: parsed.start?.dir || 'forward' },
      board: normalized.board
    }
  } catch {
    return null
  }
}

export function createEditorDraftFromLevel(level) {
  const normalized = normalizeEditorBoard(level.board)
  const start = normalized.remapPoint(level.start)

  return {
    sourceLevelId: level.id,
    sourceIsCustom: Boolean(level.isCustom),
    sourceCreatedBy: Number.isFinite(Number(level.createdBy)) ? Number(level.createdBy) : null,
    chapterId: level.chapterId || null,
    chapterTitle: level.chapterTitle || null,
    chapterOrder: Number.isFinite(level.chapterOrder) ? level.chapterOrder : null,
    demo: {
      main: cloneOperationList(level.demo?.main || []),
      p1: cloneOperationList(level.demo?.p1 || []),
      p2: cloneOperationList(level.demo?.p2 || [])
    },
    title: level.title,
    skill: level.skill,
    description: level.description,
    goal: level.goal,
    mainLimit: Number(level.mainLimit) || 8,
    p1Limit: Number(level.procLimits?.p1) || 0,
    p2Limit: Number(level.procLimits?.p2) || 0,
    enableIfGreen: Boolean(level.commandOptions?.ifGreen),
    enableIfRed: Boolean(level.commandOptions?.ifRed),
    enableIfDark: Boolean(level.commandOptions?.ifDark),
    enableIfForwardClear: Boolean(level.commandOptions?.ifForwardClear),
    start,
    board: normalized.board
  }
}

export function buildCustomLevel(draft) {
  return {
    id: draft.sourceLevelId || 'custom-level',
    chapterId: draft.chapterId || 'custom',
    chapterTitle: draft.chapterTitle || '自定义',
    chapterOrder: Number.isFinite(draft.chapterOrder) ? draft.chapterOrder : -1,
    title: draft.title.trim() || 'My Level',
    skill: draft.skill.trim() || 'Custom',
    description: draft.description.trim() || '学员自制关卡。',
    goal: draft.goal.trim() || '点亮所有目标格。',
    mainLimit: Number(draft.mainLimit) || 8,
    procLimits: {
      ...(Number(draft.p1Limit) > 0 ? { p1: Number(draft.p1Limit) } : {}),
      ...(Number(draft.p2Limit) > 0 ? { p2: Number(draft.p2Limit) } : {})
    },
    commandOptions: {
      ...(draft.enableIfGreen ? { ifGreen: true } : {}),
      ...(draft.enableIfRed ? { ifRed: true } : {}),
      ...(draft.enableIfDark ? { ifDark: true } : {}),
      ...(draft.enableIfForwardClear ? { ifForwardClear: true } : {})
    },
    tips: [
      { title: 'Editor', copy: '这是当前编辑器生成的预览关卡。' },
      { title: 'Playtest', copy: '可以直接进入试玩，验证是否能被正常完成。' }
    ],
    board: cloneBoard(draft.board),
    start: { ...draft.start },
    demo: {
      main: cloneOperationList(draft.demo?.main || []),
      p1: cloneOperationList(draft.demo?.p1 || []),
      p2: cloneOperationList(draft.demo?.p2 || [])
    }
  }
}
