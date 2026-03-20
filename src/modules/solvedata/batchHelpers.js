export function getPendingBatchTaskEntries(tasks) {
  return (Array.isArray(tasks) ? tasks : [])
    .map((task, index) => ({ task, index }))
    .filter(({ task }) => task?.status === 'pending' || task?.status === 'failed')
}

import { buildSolutionReportPayload } from './generationHelpers'

export function buildBatchReportRequest(task, { extractPureCode, model, language }) {
  return buildSolutionReportPayload({ task, extractPureCode, model, language })
}

export async function runBatchTasks({
  tasks,
  batchMode,
  switchTask,
  markTaskStatus,
  handleReportOnlyTask,
  handleStandardTask,
  onTaskError,
  delayMs = 1000,
}) {
  const pendingEntries = getPendingBatchTaskEntries(tasks)

  for (const { index } of pendingEntries) {
    await switchTask(index)
    markTaskStatus(index, 'processing')

    try {
      if (batchMode === 'report_only') {
        await handleReportOnlyTask(index)
      } else {
        await handleStandardTask(index)
      }

      markTaskStatus(index, 'completed')
    } catch (error) {
      onTaskError?.(index, error)
      markTaskStatus(index, 'failed')
    }

    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  return {
    total: pendingEntries.length,
  }
}