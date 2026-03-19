const button = document.getElementById('importButton')
const statusNode = document.getElementById('status')
const targetOriginNode = document.getElementById('targetOrigin')

function getPageContext(url) {
  if (/https:\/\/mna\.wang\/contest\/\d+\/problem\/\d+/i.test(url || '')) return { site: 'MNA', mode: 'problem', strategy: 'scrape' }
  if (/https:\/\/mna\.wang\/contest\/\d+\/?(?:\?.*)?$/i.test(url || '')) return { site: 'MNA', mode: 'contest', strategy: 'scrape' }
  if (/https:\/\/atcoder\.jp\/contests\/[^/]+\/tasks\/[^/?#]+/i.test(url || '')) return { site: 'AtCoder', mode: 'problem', strategy: 'url' }
  if (/https:\/\/atcoder\.jp\/contests\/[^/?#]+\/?(?:\?.*)?$/i.test(url || '')) return { site: 'AtCoder', mode: 'contest', strategy: 'url' }
  if (/https:\/\/htoj\.com\.cn\/cpp\/oj\/problem\/detail\?[^#]*\bpid=\d+/i.test(url || '')) return { site: '核桃 OJ', mode: 'problem', strategy: 'url' }
  if (/https:\/\/htoj\.com\.cn\/cpp\/oj\/contest\/detail(?:\/problem)?\?[^#]*\bcid=\d+/i.test(url || '')) return { site: '核桃 OJ', mode: 'contest', strategy: 'url' }
  if (/https?:\/\/nflsoi\.cc(?::\d+)?\/(contest\/\d+\/problem\/\d+|p\/[a-z0-9_]+)/i.test(url || '')) return { site: 'NFLSOI', mode: 'problem', strategy: 'url' }
  if (/https?:\/\/nflsoi\.cc(?::\d+)?\/contest\/\d+(?:\/problems)?\/?(?:\?.*)?$/i.test(url || '')) return { site: 'NFLSOI', mode: 'contest', strategy: 'url' }
  return null
}

function setStatus(message) {
  statusNode.textContent = message
}

async function updatePopupByActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const context = getPageContext(tab?.url || '')
  if (context?.mode === 'problem') {
    button.textContent = '导入当前题目'
    setStatus(`当前是 ${context.site} 单题页，可直接导入。`)
    return
  }
  if (context?.mode === 'contest') {
    button.textContent = '导入整场比赛'
    if (context.strategy === 'scrape') {
      setStatus(`当前是 ${context.site} 比赛页，将按题目顺序整场导入。`)
    } else {
      setStatus(`当前是 ${context.site} 比赛页，将把当前链接交给 SolveData 批量导入。`)
    }
    return
  }
  button.textContent = '导入当前页面'
  setStatus('请先打开支持的网站页面。目前支持 MNA、AtCoder、核桃 OJ、NFLSOI。')
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
      if (response.strategy === 'scrape') {
        setStatus(`导入成功。\n比赛：${response.contestTitle || '未知比赛'}\n成功 ${response.importedCount || 0} 题，失败 ${response.failedCount || 0} 题。`)
      } else {
        setStatus(`导入成功。\n已将 ${response.site || '当前站点'} 比赛链接交给 SolveData 处理。`)
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