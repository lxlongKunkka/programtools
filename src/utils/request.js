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
      const errorMessage = (data && (data.error || data.detail || JSON.stringify(data))) || `HTTP ${response.status}`
      throw new Error(errorMessage)
    }

    return data
  } catch (error) {
    throw error
  }
}

export default request
