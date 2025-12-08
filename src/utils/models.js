import { request } from './request'

let cachedModels = null
let fetchPromise = null

/**
 * 获取模型列表，优先使用缓存
 * @returns {Promise<Array>} 模型列表
 */
export async function getModels() {
  if (cachedModels) return cachedModels
  
  if (fetchPromise) return fetchPromise

  fetchPromise = request('/api/models')
    .then(data => {
      if (Array.isArray(data)) {
        cachedModels = data
        return data
      }
      return []
    })
    .catch(err => {
      console.warn('Failed to load models', err)
      return []
    })
    .finally(() => {
      fetchPromise = null
    })
    
  return fetchPromise
}
