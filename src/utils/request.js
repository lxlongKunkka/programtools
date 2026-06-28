/**
 * 通用 API 请求工具
 * @param {string} url - 请求地址
 * @param {object} options - fetch 选项
 * @returns {Promise<any>} - 返回 JSON 数据或文本数据
 */
export async function request(url, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json'
  }

  // Add Authorization header if token exists
  const token = localStorage.getItem('auth_token')
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`
    // Debug: log token status for course API calls
    if (url.includes('/api/course/')) {
      console.log('[Request]', url, 'Token:', token ? `${token.substring(0, 20)}...` : 'none')
    }
  } else if (url.includes('/api/course/')) {
    console.warn('[Request]', url, '⚠️ No auth_token in localStorage')
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  }

  try {
    const response = await fetch(url, config)

    if (response.status === 401) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_info')
      // Optional: Redirect to login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }

    // Handle blob response type
    if (options.responseType === 'blob') {
      if (!response.ok) {
        // Try to read error message from blob
        const text = await response.text()
        let errorMessage = `HTTP ${response.status}`
        try {
          const errorData = JSON.parse(text)
          if (errorData.error) errorMessage = errorData.error
        } catch (e) {
          if (text) errorMessage = text.slice(0, 200)
        }
        const err = new Error(errorMessage)
        err.response = { status: response.status }
        throw err
      }
      return await response.blob()
    }

    const contentType = response.headers.get('content-type') || ''
    
    let data
    if (contentType.includes('application/json')) {
      try {
        data = await response.json()
      } catch (e) {
        data = null
      }
    } else {
      try {
        data = { rawText: await response.text() }
      } catch (e) {
        data = null
      }
    }

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`
      if (data) {
        if (data.error) errorMessage = data.error
        else if (data.detail) errorMessage = data.detail
        else if (data.rawText != null) {
          const raw = data.rawText.trim()
          if (raw === 'Unauthorized') {
            errorMessage = '登录已过期，请重新登录'
          } else if (raw === 'Forbidden') {
            errorMessage = '权限不足'
          } else {
            // 尝试从 HTML 中提取错误信息
            const match = raw.match(/<pre>(.*?)<\/pre>/s) || raw.match(/<title>(.*?)<\/title>/)
            if (match) errorMessage = `Server Error: ${match[1].trim()}`
            else errorMessage = raw ? `Server Error: ${raw.slice(0, 200)}` : `HTTP ${response.status}`
          }
        }
        else errorMessage = JSON.stringify(data)
      }
      const err = new Error(errorMessage)
      err.response = { data, status: response.status }
      throw err
    }

    return data
  } catch (error) {
    throw error
  }
}

request.get = (url, options) => request(url, { ...options, method: 'GET' })

request.post = (url, data, options = {}) => request(url, {
  ...options,
  method: 'POST',
  body: JSON.stringify(data)
})

request.put = (url, data, options = {}) => request(url, {
  ...options,
  method: 'PUT',
  body: JSON.stringify(data)
})

request.delete = (url, options) => request(url, { ...options, method: 'DELETE' })

/**
 * 带自动重试的 AI 接口调用
 * - 对 5xx、网络错误自动重试（指数退避）
 * - 429 限速时等待更长时间
 * - 4xx 客户端错误（除 429）立即报错，不重试
 * @param {string} url
 * @param {object} options - 与 request() 相同
 * @param {object} retryOptions
 * @param {number} retryOptions.maxRetries - 最大重试次数（默认 3）
 * @param {number} retryOptions.baseDelay  - 首次重试延迟 ms（默认 2000）
 * @param {Function} retryOptions.onRetry  - (attempt, maxRetries, delayMs, errMsg) => void
 */
export async function retryRequest(url, options = {}, { maxRetries = 3, baseDelay = 2000, onRetry } = {}) {
  let lastErr
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await request(url, options)
    } catch (err) {
      lastErr = err
      const status = err.response?.status
      // 4xx 客户端错误不重试（429 限速除外）
      if (status && status >= 400 && status < 500 && status !== 429) throw err
      if (attempt < maxRetries) {
        const delay = status === 429 ? 8000 : baseDelay * attempt
        onRetry?.(attempt, maxRetries, delay, err.message)
        await new Promise(r => setTimeout(r, delay))
      }
    }
  }
  throw lastErr
}

request.retry = (url, options, retryOptions) => retryRequest(url, options, retryOptions)

export default request
