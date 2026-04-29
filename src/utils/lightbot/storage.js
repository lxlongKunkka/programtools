// Lightbot localStorage 工具。按当前用户隔离 key。

export function getStoredLightbotUser() {
  try {
    const parsed = JSON.parse(localStorage.getItem('user_info') || 'null')
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function getLightbotStorageKey(baseKey) {
  const user = getStoredLightbotUser()
  const userKey = user?.id || user?._id || user?.username || 'guest'
  return `${baseKey}:${String(userKey)}`
}

export function readLightbotStorage(baseKey) {
  const scopedKey = getLightbotStorageKey(baseKey)
  const scopedValue = localStorage.getItem(scopedKey)
  if (scopedValue !== null) {
    return scopedValue
  }

  const legacyValue = localStorage.getItem(baseKey)
  if (legacyValue !== null) {
    localStorage.setItem(scopedKey, legacyValue)
    return legacyValue
  }

  return null
}

export function writeLightbotStorage(baseKey, value) {
  localStorage.setItem(getLightbotStorageKey(baseKey), value)
}

export function removeLightbotStorage(baseKey) {
  localStorage.removeItem(getLightbotStorageKey(baseKey))
}
