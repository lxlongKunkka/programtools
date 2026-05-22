import lessonJson from '../../content/lessons/lesson-beginner.json'
import level001 from '../../content/levels/swf-ch1/level-001.json'
import type { LessonConfig, LevelConfig } from '../../domain/map/map.types'

// 静态占位用于首帧渲染（API 加载前显示），不在 bundle 中包含全量关卡数据
export const beginnerLevel = level001 as unknown as LevelConfig
export const beginnerLesson = lessonJson as LessonConfig

/** 从后端 API 异步获取所有官方关卡 */
export async function loadLevelsFromApi(): Promise<LevelConfig[]> {
  const res = await fetch('/api/codebot/levels')
  if (!res.ok) throw new Error(`Failed to load levels: ${res.status}`)
  const data = await res.json() as { ok: boolean; levels: LevelConfig[] }
  if (!data.ok || !Array.isArray(data.levels)) throw new Error('Invalid levels response')
  return data.levels
}

/** 从后端 API 获取当前用户已发布的自定义关卡（需登录） */
export async function loadUserLevelsFromApi(): Promise<LevelConfig[]> {
  const token = localStorage.getItem('auth_token')
  if (!token) return []
  try {
    const res = await fetch('/api/codebot/my-published-levels', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    const data = await res.json() as { ok: boolean; levels: LevelConfig[] }
    if (!data.ok || !Array.isArray(data.levels)) return []
    return data.levels
  } catch {
    return []
  }
}

/** 从后端 API 获取其他用户的已发布关卡（社区关卡，无需登录） */
export async function loadCommunityLevelsFromApi(excludeUserId?: number): Promise<LevelConfig[]> {
  try {
    const url = excludeUserId
      ? `/api/codebot/community-levels?excludeUserId=${excludeUserId}`
      : '/api/codebot/community-levels'
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json() as { ok: boolean; levels: LevelConfig[] }
    if (!data.ok || !Array.isArray(data.levels)) return []
    return data.levels
  } catch {
    return []
  }
}
