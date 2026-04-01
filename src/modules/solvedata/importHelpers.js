import { stripFreopenStatements } from './codeCleaning'
import { createEmptyTask, isTaskInputEmpty } from './taskState'

function extractFileNameFromUrl(url) {
  const value = String(url || '').trim()
  if (!value) return 'attachment'
  try {
    const parsed = new URL(value)
    const pathname = parsed.pathname || ''
    const fileName = pathname.split('/').filter(Boolean).pop()
    return fileName || 'attachment'
  } catch {
    const clean = value.split('?')[0].split('#')[0]
    return clean.split('/').filter(Boolean).pop() || 'attachment'
  }
}

function encodeBytesToBase64(bytes) {
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

async function readFileAsBase64(file) {
  const buffer = await file.arrayBuffer()
  return encodeBytesToBase64(new Uint8Array(buffer))
}

function getTaskFolderKey(parts) {
  const folderParts = parts.slice(0, -1)
  if (folderParts[folderParts.length - 1] === 'additional_file') {
    folderParts.pop()
  }
  return folderParts.join('/')
}

function pickImportedCodeFile(fileMap) {
  const fileNames = Object.keys(fileMap || {})
  const preferredPatterns = [/^ac_code\./i, /^std\./i, /^source\./i]

  for (const pattern of preferredPatterns) {
    const matchedName = fileNames.find((name) => pattern.test(name))
    if (matchedName) return fileMap[matchedName]
  }

  return null
}

function pickImportedAttachment(additionalFiles) {
  const attachmentList = Array.isArray(additionalFiles) ? additionalFiles : []
  const sourceUrlFile = attachmentList.find((item) => item.name.toLowerCase() === 'source_url.txt')
  const binaryFile = attachmentList.find((item) => item.name.toLowerCase() !== 'source_url.txt')
  return { sourceUrlFile, binaryFile }
}

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
    additionalFile: payload?.additionalFile
      ? { ...payload.additionalFile, provider: 'edge-extension' }
      : null,
    problemText: payload?.content || '',
    manualCode: stripFreopenStatements(payload?.acCode || ''),
    referenceText: payload?.editorial || payload?.referenceText || '',
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
  const additionalFile = data.additionalFile
    ? {
        ...data.additionalFile,
        ...(data.additionalFile.provider ? {} : { provider: 'edge-extension' }),
      }
    : null
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
      manualCode: stripFreopenStatements(acCode),
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
    const folderKey = getTaskFolderKey(parts)
    const isAdditionalFile = parts[parts.length - 2] === 'additional_file'
    if (!groups.has(folderKey)) {
      groups.set(folderKey, {
        files: {},
        additionalFiles: [],
      })
    }

    const group = groups.get(folderKey)
    if (isAdditionalFile) {
      group.additionalFiles.push({ name: fileName, file })
    } else {
      group.files[fileName] = file
    }
  }

  const folderEntries = [...groups.entries()]
    .filter(([, group]) => group.files['problem.md'])
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
  for (const [folderKey, group] of folderEntries) {
    const folderName = folderKey.split('/').pop() || folderKey
    const problemText = await group.files['problem.md'].text()
    const codeFile = pickImportedCodeFile(group.files)
    const manualCode = codeFile ? stripFreopenStatements(await codeFile.text()) : ''
    const sourceUrlFile = group.files['source_url.txt']
    const sourceUrl = sourceUrlFile ? (await sourceUrlFile.text()).trim() : ''
    const { sourceUrlFile: additionalSourceUrlFile, binaryFile } = pickImportedAttachment(group.additionalFiles)

    let additionalFile = null
    if (binaryFile?.file) {
      additionalFile = {
        filename: binaryFile.name,
        size: Number(binaryFile.file.size || 0),
        base64: await readFileAsBase64(binaryFile.file),
      }
    } else if (additionalSourceUrlFile?.file) {
      const attachmentSourceUrl = (await additionalSourceUrlFile.file.text()).trim()
      if (attachmentSourceUrl) {
        additionalFile = {
          filename: extractFileNameFromUrl(attachmentSourceUrl),
          size: 0,
          sourceUrl: attachmentSourceUrl,
        }
      }
    }

    const heading = String(problemText || '').split('\n').map(line => line.trim()).find(Boolean) || ''
    const derivedTitle = heading.replace(/^#\s*/, '').trim() || folderName.replace(/^\d+[-_]?/, '')
    importedTasks.push(createEmptyTask({
      problemText,
      manualCode,
      additionalFile,
      problemMeta: {
        title: derivedTitle,
        rawTitle: derivedTitle,
        sourceFolder: folderName,
        ...(sourceUrl ? { sourceUrl } : {}),
      },
    }))
  }

  return importedTasks
}