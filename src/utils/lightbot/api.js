import request from '../request'

const ROOT = '/api/lightbot'

export const lightbotApi = {
  listLevels() {
    return request.get(`${ROOT}/levels`)
  },
  getLeaderboard(levelId) {
    return request.get(`${ROOT}/levels/${encodeURIComponent(levelId)}/leaderboard`)
  },
  recentActivity(limit = 10) {
    return request.get(`${ROOT}/activity?limit=${limit}`)
  },
  reportComplete(levelId, metrics) {
    return request.post(`${ROOT}/levels/${encodeURIComponent(levelId)}/complete`, metrics)
  },
  createLevel(level) {
    return request.post(`${ROOT}/levels`, { level })
  },
  updateLevel(level) {
    return request.put(`${ROOT}/levels/${encodeURIComponent(level.id)}`, { level })
  },
  deleteLevel(levelId) {
    return request.delete(`${ROOT}/levels/${encodeURIComponent(levelId)}`)
  }
}
