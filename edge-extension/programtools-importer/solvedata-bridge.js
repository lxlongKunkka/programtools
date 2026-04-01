chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!['PROGRAMTOOLS_IMPORT_TASK', 'PROGRAMTOOLS_IMPORT_URL'].includes(message?.type)) return false

  if (!window.location.pathname.startsWith('/solvedata')) {
    sendResponse?.({ ok: false, error: '当前页面不是 SolveData' })
    return false
  }

  const requestId = message.requestId || `req_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const payloadKey = `programtools_pending_solvedata_import:${requestId}`
  const pointerKey = 'programtools_pending_solvedata_import_latest'
  const resultKey = `programtools_pending_solvedata_import_result:${requestId}`

  const requestPayload = message.type === 'PROGRAMTOOLS_IMPORT_URL'
    ? { kind: 'url', payload: message.payload }
    : { kind: 'task', payload: message.payload }

  localStorage.setItem(payloadKey, JSON.stringify(requestPayload))
  localStorage.setItem(pointerKey, requestId)

  const timeoutId = window.setTimeout(() => {
    window.removeEventListener('message', handlePageResult)
    const rawResult = localStorage.getItem(resultKey)
    if (rawResult) {
      cleanup()
      localStorage.removeItem(resultKey)
      try {
        const parsed = JSON.parse(rawResult)
        sendResponse?.({ ok: !!parsed.ok, error: parsed.error || '' })
        return
      } catch {
        // ignore parse error and continue with generic failure
      }
    }
    sendResponse?.({ ok: false, error: 'SolveData 页面未确认导入，请确认页面已完成加载且账号有权限访问' })
  }, 8000)

  function cleanup() {
    window.clearTimeout(timeoutId)
    window.removeEventListener('message', handlePageResult)
  }

  function handlePageResult(event) {
    const data = event?.data
    if (event.source !== window) return
    if (!data || data.source !== 'programtools-solvedata-page') return
    if (data.type !== 'programtools-import-solvedata-result') return
    if (data.requestId !== requestId) return

    cleanup()
    localStorage.removeItem(resultKey)
    sendResponse?.({ ok: !!data.ok, error: data.error || '' })
  }

  window.addEventListener('message', handlePageResult)

  window.postMessage({
    source: 'programtools-edge-extension',
    type: 'programtools-import-solvedata',
    requestId,
    payload: requestPayload,
  }, window.location.origin)

  return true
})

