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

    try {
      if (batchMode === 'report_only') {
        // report_only: generateReportForBatch doesn't manage task status itself
        markTaskStatus(index, 'processing')
        await handleReportOnlyTask(index)
      } else {
        // standard mode: generateAll manages status internally (sets 'processing' on entry)
        // DO NOT mark as 'processing' here — it would trigger generateAll's early-return guard
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