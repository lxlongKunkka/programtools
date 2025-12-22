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
        else if (data.rawText) {
          const raw = data.rawText.trim()
          if (raw === 'Unauthorized') {
            errorMessage = '登录已过期，请重新登录'
          } else if (raw === 'Forbidden') {
            errorMessage = '权限不足'
          } else {
            // 尝试从 HTML 中提取错误信息
            const match = raw.match(/<pre>(.*?)<\/pre>/s) || raw.match(/<title>(.*?)<\/title>/)
            if (match) errorMessage = `Server Error: ${match[1].trim()}`
            else errorMessage = `Server Error: ${raw.slice(0, 200)}`
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

export default request
