const button = document.getElementById('importButton')
const downloadEditorialButton = document.getElementById('downloadEditorialButton')
const statusNode = document.getElementById('status')
const targetOriginNode = document.getElementById('targetOrigin')

function getPageContext(url) {
  if (/https:\/\/mna\.wang\/(contest|course)\/\d+\/problem\/\d+/i.test(url || '')) return { site: 'MNA', mode: 'problem', strategy: 'scrape' }
  if (/https:\/\/mna\.wang\/contest\/\d+\/?(?:\?.*)?$/i.test(url || '')) return { site: 'MNA', mode: 'contest', strategy: 'scrape', collectionLabel: '比赛' }
  if (/https:\/\/mna\.wang\/course\/\d+\/?(?:\?.*)?$/i.test(url || '')) return { site: 'MNA', mode: 'contest', strategy: 'scrape', collectionLabel: '课程' }
  if (/https:\/\/atcoder\.jp\/contests\/[^/]+\/tasks\/[^/?#]+/i.test(url || '')) return { site: 'AtCoder', mode: 'problem', strategy: 'url' }
  if (/https:\/\/atcoder\.jp\/contests\/[^/?#]+\/?(?:\?.*)?$/i.test(url || '')) return { site: 'AtCoder', mode: 'contest', strategy: 'url' }
  if (/https:\/\/htoj\.com\.cn\/cpp\/oj\/problem\/detail\?[^#]*\bpid=\d+/i.test(url || '')) return { site: '核桃 OJ', mode: 'problem', strategy: 'url' }
  if (/https:\/\/htoj\.com\.cn\/cpp\/oj\/contest\/detail(?:\/problem)?\?[^#]*\bcid=\d+/i.test(url || '')) return { site: '核桃 OJ', mode: 'contest', strategy: 'url' }
  if (/https?:\/\/nflsoi\.cc(?::\d+)?\/(contest\/[a-z0-9]+\/problem\/[a-z0-9_]+|p\/[a-z0-9_]+)/i.test(url || '')) return { site: 'NFLSOI', mode: 'problem', strategy: 'scrape' }
  if (/https?:\/\/nflsoi\.cc(?::\d+)?\/contest\/[a-z0-9]+(?:\/problems)?\/?(?:\?.*)?$/i.test(url || '')) return { site: 'NFLSOI', mode: 'contest', strategy: 'scrape', collectionLabel: '比赛' }
  if (/https?:\/\/noip\.ybtoj\.com\.cn\/(?:contest\/\d+\/problem\/\d+|problem\/\d+)\/?(?:\?.*)?$/i.test(url || '')) return { site: 'YbtOJ', mode: 'problem', strategy: 'scrape' }
  if (/https?:\/\/noip\.ybtoj\.com\.cn\/contest\/\d+\/?(?:\?.*)?$/i.test(url || '')) return { site: 'YbtOJ', mode: 'contest', strategy: 'scrape', collectionLabel: '题单' }
  return null
}

function setStatus(message) {
  statusNode.textContent = message
}

async function updatePopupByActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const context = getPageContext(tab?.url || '')
  if (context?.mode === 'problem') {
    downloadEditorialButton.style.display = 'none'
    button.textContent = '导入当前题目'
    setStatus(`当前是 ${context.site} 单题页，可直接导入。`)
    return
  }
  if (context?.mode === 'contest') {
    downloadEditorialButton.style.display = context.strategy === 'scrape' ? 'block' : 'none'
    const collectionLabel = context.collectionLabel || '比赛'
    button.textContent = collectionLabel === '课程' ? '导入整门课程' : (collectionLabel === '题单' ? '导入整份题单' : '导入整场比赛')
    if (context.strategy === 'scrape') {
      const batchLabel = collectionLabel === '课程' ? '整课导入' : (collectionLabel === '题单' ? '整份题单导入' : '整场导入')
      setStatus(`当前是 ${context.site} ${collectionLabel}页，将按题目顺序${batchLabel}。`)
    } else {
      setStatus(`当前是 ${context.site} ${collectionLabel}页，将把当前链接交给 SolveData 批量导入。`)
    }
    return
  }
  downloadEditorialButton.style.display = 'none'
  button.textContent = '导入当前页面'
  setStatus('请先打开支持的网站页面。目前支持 MNA、AtCoder、核桃 OJ、NFLSOI、YbtOJ。')
}

updatePopupByActiveTab().catch(() => {
  setStatus('无法识别当前页面，请先打开支持的网站页面。')
})

button.addEventListener('click', async () => {
  button.disabled = true
  setStatus('正在处理当前页面...')

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'PROGRAMTOOLS_IMPORT_CURRENT_PAGE',
      targetOrigin: targetOriginNode.value,
    })

    if (!response?.ok) {
      throw new Error(response?.error || '扩展导入失败')
    }

    if (response.mode === 'contest') {
      const collectionLabel = response.collectionLabel || '比赛'
      if (response.strategy === 'scrape') {
        setStatus(`导入成功。\n${collectionLabel}：${response.contestTitle || '未知' + collectionLabel}\n成功 ${response.importedCount || 0} 题，失败 ${response.failedCount || 0} 题。`)
      } else {
        setStatus(`导入成功。\n已将 ${response.site || '当前站点'} ${collectionLabel}链接交给 SolveData 处理。`)
      }
    } else {
      const siteLabel = response.site || '当前站点'
      const detail = response.strategy === 'scrape'
        ? '如果 SolveData 页面已打开，会自动追加任务；否则会新开页面。'
        : 'SolveData 会使用当前链接继续抓题并追加任务。'
      setStatus(`导入成功。\n站点：${siteLabel}\n${detail}`)
    }
  } catch (error) {
    setStatus(`失败：${error.message}`)
  } finally {
    button.disabled = false
  }
})

downloadEditorialButton.addEventListener('click', async () => {
  downloadEditorialButton.disabled = true
  button.disabled = true
  setStatus('正在抓取比赛题解并生成 Markdown...')

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'PROGRAMTOOLS_DOWNLOAD_CONTEST_EDITORIALS',
    })

    if (!response?.ok) {
      throw new Error(response?.error || '题解下载失败')
    }

    setStatus(`下载成功。\n${response.collectionLabel || '比赛'}：${response.contestTitle || '未命名'}\n已导出 ${response.exportedCount || 0} 题题解，缺失 ${response.missingCount || 0} 题。`)
  } catch (error) {
    setStatus(`失败：${error.message}`)
  } finally {
    downloadEditorialButton.disabled = false
    button.disabled = false
  }
})