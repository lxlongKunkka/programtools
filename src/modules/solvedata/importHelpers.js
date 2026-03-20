import { createEmptyTask, isTaskInputEmpty } from './taskState'

export function normalizeExtensionImportRequest(rawPayload) {
  if (rawPayload?.kind && rawPayload?.payload) return rawPayload
  return {
    kind: 'task',
    payload: rawPayload,
  }
}

export function getExtensionImportSuccessMessage(result) {
  if (result?.kind === 'url' && result.mode === 'contest') {
    return `✅ 已从 Edge 扩展导入 ${result.added} 道题目`
  }
  if (result?.kind === 'url') {
    return '✅ 已从 Edge 扩展导入题目链接'
  }
  return '✅ 已从 Edge 扩展导入题目'
}

export function createExtensionImportedTask(payload) {
  const title = (payload?.title || payload?.problemMeta?.title || payload?.url || '题目标题').trim()
  return createEmptyTask({
    additionalFile: payload?.additionalFile || null,
    problemText: payload?.content || '',
    manualCode: payload?.acCode || '',
    problemMeta: {
      title,
      rawTitle: title,
      sourceUrl: payload?.url || '',
      importedVia: 'edge-extension',
      ...(payload?.timeLimit ? { timeLimit: payload.timeLimit } : {}),
      ...(payload?.memoryLimit ? { memoryLimit: payload.memoryLimit } : {}),
    },
  })
}

export function createFetchedProblemTask({ url, data, fallbackTitle, contestLabel, prefetchedTags = [] }) {
  const editorial = data.editorial || ''
  const acCode = data.acCode || ''
  const additionalFile = data.additionalFile || null
  const finalTags = prefetchedTags.length ? prefetchedTags : (data.tags || [])
  const timeLimit = data.timeLimit || null
  const memoryLimit = data.memoryLimit || null

  let title = data.title || fallbackTitle || url
  title = title.replace(/^\d+\s+/, '')
  title = title.replace(/^#?[A-Za-z]*\d+\.\s*/, '')
  title = title.replace(/^([A-Za-z])\. /, '$1 ')

  const atcoderMatch = url.match(/atcoder\.jp\/contests\/([^/]+)\/tasks\/[^/]+_([a-z0-9]+)/i)
  if (atcoderMatch) {
    const contestId = atcoderMatch[1].toUpperCase()
    const label = atcoderMatch[2].toUpperCase()
    const cleanTitle = title.replace(/^[A-Z0-9]+\s*[-\.]\s*/i, '').trim()
    title = `[${contestId}${label}] ${cleanTitle}`
  }

  const titleFixed = finalTags.length > 0
  const atcoderTitle = atcoderMatch ? title : null
  const sourceUrl = atcoderMatch ? url : null
  const isHtoj = /htoj\.com\.cn/i.test(url)
  const htojLabel = (isHtoj && contestLabel) ? String(contestLabel).trim() : null

  return {
    task: createEmptyTask({
      problemText: data.content || '',
      manualCode: acCode,
      referenceText: editorial,
      additionalFile,
      problemMeta: {
        title,
        rawTitle: title,
        tags: finalTags,
        ...(titleFixed ? { titleFixed: true } : {}),
        ...(atcoderTitle ? { atcoderTitle } : {}),
        ...(sourceUrl ? { sourceUrl } : {}),
        ...(htojLabel ? { htojLabel } : {}),
        ...(timeLimit ? { timeLimit } : {}),
        ...(memoryLimit ? { memoryLimit } : {}),
      },
    }),
    editorial,
    acCode,
    additionalFile,
  }
}

export function mergeImportedTasks({ tasks, currentTaskIndex, importedTasks }) {
  if (!Array.isArray(importedTasks) || importedTasks.length === 0) {
    return {
      tasks: Array.isArray(tasks) ? [...tasks] : [],
      importedIndices: [],
      firstImportedIndex: -1,
      lastImportedIndex: -1,
      replacedSingleEmpty: false,
    }
  }

  const sourceTasks = Array.isArray(tasks) ? tasks : []
  const activeIndex = Number.isInteger(currentTaskIndex) ? currentTaskIndex : 0
  const currentTask = sourceTasks[activeIndex]
  const replacedSingleEmpty = sourceTasks.length === 1 && isTaskInputEmpty(currentTask)

  if (replacedSingleEmpty) {
    if (importedTasks.length === 1) {
      const nextTasks = [...sourceTasks]
      nextTasks[activeIndex] = importedTasks[0]
      return {
        tasks: nextTasks,
        importedIndices: [activeIndex],
        firstImportedIndex: activeIndex,
        lastImportedIndex: activeIndex,
        replacedSingleEmpty: true,
      }
    }

    return {
      tasks: [...importedTasks],
      importedIndices: importedTasks.map((_, index) => index),
      firstImportedIndex: 0,
      lastImportedIndex: importedTasks.length - 1,
      replacedSingleEmpty: true,
    }
  }

  const firstImportedIndex = sourceTasks.length
  const nextTasks = [...sourceTasks, ...importedTasks]
  return {
    tasks: nextTasks,
    importedIndices: importedTasks.map((_, index) => firstImportedIndex + index),
    firstImportedIndex,
    lastImportedIndex: nextTasks.length - 1,
    replacedSingleEmpty: false,
  }
}

export async function readFolderImportedTasks(files) {
  const groups = new Map()
  for (const file of files) {
    const relativePath = file.webkitRelativePath || file.name
    const parts = relativePath.split('/').filter(Boolean)
    if (parts.length < 2) continue
    const fileName = parts[parts.length - 1]
    const folderKey = parts.slice(0, -1).join('/')
    if (!groups.has(folderKey)) groups.set(folderKey, {})
    groups.get(folderKey)[fileName] = file
  }

  const folderEntries = [...groups.entries()]
    .filter(([, fileMap]) => fileMap['problem.md'] && (fileMap['std.cpp'] || fileMap['source.cpp']))
    .sort((a, b) => {
      const aBase = a[0].split('/').pop() || a[0]
      const bBase = b[0].split('/').pop() || b[0]
      const aMatch = aBase.match(/^(\d+)/)
      const bMatch = bBase.match(/^(\d+)/)
      const aNum = aMatch ? Number(aMatch[1]) : Number.MAX_SAFE_INTEGER
      const bNum = bMatch ? Number(bMatch[1]) : Number.MAX_SAFE_INTEGER
      if (aNum !== bNum) return aNum - bNum
      return aBase.localeCompare(bBase, 'zh-CN')
    })

  const importedTasks = []
  for (const [folderKey, fileMap] of folderEntries) {
    const folderName = folderKey.split('/').pop() || folderKey
    const problemText = await fileMap['problem.md'].text()
    const codeFile = fileMap['std.cpp'] || fileMap['source.cpp']
    const manualCode = codeFile ? await codeFile.text() : ''
    const heading = String(problemText || '').split('\n').map(line => line.trim()).find(Boolean) || ''
    const derivedTitle = heading.replace(/^#\s*/, '').trim() || folderName.replace(/^\d+[-_]?/, '')
    importedTasks.push(createEmptyTask({
      problemText,
      manualCode,
      problemMeta: {
        title: derivedTitle,
        rawTitle: derivedTitle,
        sourceFolder: folderName,
      },
    }))
  }

  return importedTasks
}