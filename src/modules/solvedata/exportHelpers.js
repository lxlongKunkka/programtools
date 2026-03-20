function getBeijingExportTime() {
  const now = new Date()
  const beijingString = now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' })
  return new Date(beijingString)
}

function createZipOptions(date) {
  return { date }
}

function getProblemLimitPrefix(task) {
  const timeLimit = task?.problemMeta?.timeLimit
  const memoryLimit = task?.problemMeta?.memoryLimit
  return (timeLimit || memoryLimit)
    ? `**时间限制：${timeLimit ?? '-'}ms　内存限制：${memoryLimit ?? '-'}MB**\n\n`
    : ''
}

function createSampleSuffix(task) {
  return task?.additionalFile?.base64 ? '\n\n[sample](file://sample.zip)' : ''
}

function decodeBase64ToBytes(base64) {
  const binaryStr = atob(base64)
  const bytes = new Uint8Array(binaryStr.length)
  for (let index = 0; index < binaryStr.length; index++) {
    bytes[index] = binaryStr.charCodeAt(index)
  }
  return bytes
}

export function buildBatchRunAllBat() {
  return `@echo off
chcp 65001
title Batch Runner & Report Extractor

echo ==========================================
echo      1. Running All Tasks
echo ==========================================
echo.

for /d %%D in (*) do (
    if exist "%%D\\run.py" (
        if exist "%%D\\data_generator.py" (
            echo ------------------------------------------
            echo Running in: %%D
            echo ------------------------------------------
            pushd "%%D"
            python run.py
            popd
            echo.
        ) else (
            echo ------------------------------------------
            echo Skipping %%D (No data_generator.py)
            echo ------------------------------------------
        )
    )
)

echo.
echo ==========================================
echo      2. Extracting HTML Reports
echo ==========================================
echo.

for /d %%D in (*) do (
    if exist "%%D\\*.html" (
        pushd "%%D"
        for %%F in (*.html) do (
            echo Extracting: %%D\\%%F -^> %%D.html
            copy "%%F" "..\\%%D.html" >nul
        )
        popd
    )
)

echo.
echo ==========================================
echo      All Operations Completed
echo ==========================================
pause
`
}

export function getExportUsername(storage) {
  let username = 'user'
  try {
    const userInfoStr = storage?.getItem?.('user_info')
    if (!userInfoStr) return username
    const userInfo = JSON.parse(userInfoStr)
    if (userInfo && (userInfo.uname || userInfo.username)) {
      username = userInfo.uname || userInfo.username
    }
  } catch (error) {
    console.warn('Failed to get username', error)
  }
  return username
}

export function formatBatchZipName({ username, taskCount, exportTime }) {
  const dateStr = exportTime.getFullYear() +
    String(exportTime.getMonth() + 1).padStart(2, '0') +
    String(exportTime.getDate()).padStart(2, '0') + '_' +
    String(exportTime.getHours()).padStart(2, '0') +
    String(exportTime.getMinutes()).padStart(2, '0') +
    String(exportTime.getSeconds()).padStart(2, '0')

  return `batch_export_${username}_${taskCount}tasks_${dateStr}.zip`
}

export async function blobToBase64(blob) {
  const reader = new FileReader()
  const dataUrl = await new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
  const str = typeof dataUrl === 'string' ? dataUrl : ''
  const commaIdx = str.indexOf(',')
  return commaIdx >= 0 ? str.substring(commaIdx + 1) : str
}

export async function createBatchExportBundle({ JSZip, completedTasks, helperApi }) {
  const masterZip = new JSZip()
  const exportTime = getBeijingExportTime()
  const zipOptions = createZipOptions(exportTime)

  for (let index = 0; index < completedTasks.length; index++) {
    const task = completedTasks[index]
    const title = helperApi.getSmartTitle(task.problemMeta, task.translationText || task.problemText, task.id)
    const prefix = String(index + 1).padStart(2, '0')
    const folder = masterZip.folder(`${prefix}_${title}`)
    const { ext, lang } = helperApi.detectLanguage(task.codeOutput)
    const bestCodeContent = helperApi.getBestCodeContent(task.codeOutput, task.manualCode)
    const stdFileName = lang === 'Java' ? 'Main.java' : `std.${ext}`

    folder.file(stdFileName, bestCodeContent, zipOptions)

    const dataScript = helperApi.processDataScript(task.dataOutput, lang)
    if (dataScript) {
      folder.file('data_generator.py', dataScript, zipOptions)
    }

    const limitPrefix = getProblemLimitPrefix(task)
    const sampleSuffix = createSampleSuffix(task)
    folder.file('problem.md', limitPrefix + task.problemText, zipOptions)
    folder.file('problem_zh_TW.md', limitPrefix + task.problemText + sampleSuffix, zipOptions)

    if (task.translationText) {
      folder.file(
        'problem_zh.md',
        limitPrefix + helperApi.applyTitleToTranslation(task.translationText, task.problemMeta?.title) + sampleSuffix,
        zipOptions
      )
    }

    if (task.translationEnglish) {
      const englishContent = task.problemMeta?.sourceUrl
        ? `原题链接：${task.problemMeta.sourceUrl}\n\n${task.translationEnglish}`
        : task.translationEnglish
      folder.file('problem_en.md', englishContent + sampleSuffix, zipOptions)
    }

    if (task.reportHtml) {
      folder.file(`${title}.html`, task.reportHtml, zipOptions)
    }

    folder.file('problem.yaml', helperApi.generateProblemYaml(task.problemMeta, task.problemText, task.translationText), zipOptions)
    folder.file('run.py', helperApi.generateRunScript(lang), zipOptions)
    folder.file('run.bat', helperApi.generateBatScript(lang), zipOptions)

    if (task.codeOutput && task.codeOutput.trim()) {
      folder.file('solution.md', task.codeOutput, zipOptions)
    }

    if (task.additionalFile?.base64) {
      try {
        folder.file('additional_file/sample.zip', decodeBase64ToBytes(task.additionalFile.base64), zipOptions)
      } catch (error) {
        console.warn('Failed to add sample.zip to zip:', error)
      }
    }
  }

  masterZip.file('run_all_tasks.bat', buildBatchRunAllBat(), zipOptions)
  const blob = await masterZip.generateAsync({ type: 'blob' })
  const username = getExportUsername(helperApi.storage)
  const zipName = formatBatchZipName({ username, taskCount: completedTasks.length, exportTime })

  return {
    blob,
    zipName,
    exportTime,
  }
}