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
 * Returns true if the given user is listed in group.editors.
 * @param {object} group - group data object
 * @param {object} user  - user object (must have _id or uid)
 */
export function isExplicitEditor(group, user) {
  if (!user || !group || !group.editors) return false
  const userId = user._id || user.uid
  return group.editors.some(e => {
    const id = typeof e === 'object' ? (e._id || e.id) : e
    return String(id) === String(userId)
  })
}

/**
 * Returns true if the given user is listed in level.editors.
 * @param {object} level - level data object
 * @param {object} user  - user object
 */
export function isExplicitLevelEditor(level, user) {
  if (!user || !level || !level.editors) return false
  const userId = user._id || user.uid
  return level.editors.some(e => {
    const id = typeof e === 'object' ? (e._id || e.id) : e
    return String(id) === String(userId)
  })
}

/**
 * Returns true if the user can edit the given group.
 * Only admins can edit groups; teachers cannot.
 * @param {object} group - group data object
 * @param {object} user  - user object (pass this.user from CourseEditorPanel/LearningMap)
 */
export function canEditGroup(group, user) {
  if (!user) return false
  return user.role === 'admin'
}

/**
 * Returns true if the current user (from localStorage) can edit the given level.
 * Rules:  admin → always;  teacher → only if in group.editors OR level.editors
 * @param {object} level    - level data object
 * @param {Array}  treeData - full group tree (for group.editors lookup)
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

/**
 * canEditLevel variant that accepts an explicit user object and groups array.
 * Use this in contexts (like CourseEditorPanel) where the user is loaded into component
 * data rather than read from localStorage on every call.
 * @param {object} level  - level data object
 * @param {object} user   - user object (this.user)
 * @param {Array}  groups - flat groups array (this.groups)
 */
export function canEditLevelWithUser(level, user, groups) {
  if (!user) return false
  if (user.role === 'admin') return true
  const group = (groups || []).find(g => g.name === (level && level.group))
  if (group && isExplicitEditor(group, user)) return true
  return isExplicitLevelEditor(level, user)
}
