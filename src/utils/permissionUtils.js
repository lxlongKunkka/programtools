/**
 * Shared permission-check utilities.
 * Pure functions — no Vue dependency.
 */

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user_info') || '{}')
  } catch {
    return {}
  }
}

export function isAdmin() {
  return getUser().role === 'admin'
}

export function isTeacherOrAdmin() {
  const role = getUser().role
  return role === 'teacher' || role === 'admin'
}

/**
 * Returns true if the current user can edit the given level.
 * Rules mirror Design.vue canEditLevel:
 *   admin → always
 *   teacher → only if listed in group.editors OR level.editors
 * @param {object} level  - level data object
 * @param {Array}  treeData - full tree (for group.editors lookup)
 */
export function canEditLevel(level, treeData) {
  try {
    const u = getUser()
    if (!u._id && !u.uid) return false
    if (u.role === 'admin') return true
    if (u.role !== 'teacher') return false
    const userId = u._id || u.uid
    if (level && level.group && treeData) {
      const group = treeData.find(g => g.name === level.group)
      if (group && group.editors) {
        const inGroup = group.editors.some(e => {
          const id = typeof e === 'object' ? (e._id || e.id) : e
          return String(id) === String(userId)
        })
        if (inGroup) return true
      }
    }
    if (level && level.editors) {
      return level.editors.some(e => {
        const id = typeof e === 'object' ? (e._id || e.id) : e
        return String(id) === String(userId)
      })
    }
    return false
  } catch {
    return false
  }
}
