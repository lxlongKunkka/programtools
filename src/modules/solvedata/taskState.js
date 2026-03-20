export const TASK_STATUS_TEXT_MAP = {
  pending: '等待中',
  processing: '处理中...',
  completed: '已完成',
  failed: '失败'
}

export function createTaskId() {
  return Date.now() + Math.random()
}

export function createEmptyTask(overrides = {}) {
  return {
    id: createTaskId(),
    status: 'pending',
    problemText: '',
    manualCode: '',
    referenceText: '',
    codeOutput: '',
    serverPureCode: '',
    dataOutput: '',
    translationText: '',
    translationEnglish: '',
    additionalFile: null,
    problemMeta: null,
    reportHtml: '',
    ...overrides,
  }
}

export function isTaskInputEmpty(task) {
  if (!task) return true
  return !String(task.problemText || '').trim() && !String(task.manualCode || '').trim()
}

export function hasValidTaskMeta(task) {
  return !!(task?.problemMeta && Array.isArray(task.problemMeta.tags) && task.problemMeta.tags.length > 0)
}

export function getTaskTitle(task) {
  if (task?.problemMeta?.title && task.problemMeta.title !== '题目标题') return task.problemMeta.title
  if (task?.problemMeta?.rawTitle) return task.problemMeta.rawTitle
  if (task?.problemText) {
    const lines = task.problemText.split('\n').filter(line => line.trim())
    if (lines.length > 0) {
      return lines[0].slice(0, 20) + (lines[0].length > 20 ? '...' : '')
    }
  }
  return '新任务 ' + new Date(task?.id || Date.now()).toLocaleTimeString()
}

export function getTaskStatusText(task) {
  return TASK_STATUS_TEXT_MAP[task?.status] || '未知'
}