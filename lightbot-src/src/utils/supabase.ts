import { createClient } from '@supabase/supabase-js'
import type { LevelConfig } from '../domain/map/map.types'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string | undefined
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Supabase 是否已配置（未填写环境变量时为 false，社区功能自动隐藏） */
export const supabaseEnabled = Boolean(supabaseUrl && supabaseKey
  && !supabaseUrl.includes('your-project-id'))

export const supabase = supabaseEnabled
  ? createClient(supabaseUrl!, supabaseKey!)
  : null

// ── 类型定义 ──────────────────────────────────────────────────────────────────
export type CommunityLevel = {
  id: string
  title: string
  author_name: string
  level_data: LevelConfig
  created_at: string
  plays_count: number
}

// ── API ───────────────────────────────────────────────────────────────────────

/** 发布关卡，返回新记录 id */
export async function publishLevel(
  cfg: LevelConfig,
  authorName: string,
): Promise<{ id: string } | { error: string }> {
  if (!supabase) return { error: '社区功能未配置' }
  const { data, error } = await supabase
    .from('community_levels')
    .insert({ title: cfg.title, author_name: authorName || '匿名', level_data: cfg })
    .select('id')
    .single()
  if (error) return { error: error.message }
  return { id: (data as { id: string }).id }
}

/** 获取最新社区关卡列表（分页） */
export async function fetchCommunityLevels(
  page = 0,
  pageSize = 20,
): Promise<{ data: CommunityLevel[]; error?: string }> {
  if (!supabase) return { data: [], error: '社区功能未配置' }
  const from = page * pageSize
  const to   = from + pageSize - 1
  const { data, error } = await supabase
    .from('community_levels')
    .select('id, title, author_name, created_at, plays_count')
    .order('created_at', { ascending: false })
    .range(from, to)
  if (error) return { data: [], error: error.message }
  return { data: (data ?? []) as CommunityLevel[] }
}

/** 根据 id 加载单个社区关卡的完整数据 */
export async function loadCommunityLevel(
  id: string,
): Promise<{ level: LevelConfig } | { error: string }> {
  if (!supabase) return { error: '社区功能未配置' }
  const { data, error } = await supabase
    .from('community_levels')
    .select('level_data, plays_count')
    .eq('id', id)
    .single()
  if (error || !data) return { error: error?.message ?? '未找到关卡' }
  // 异步增加 plays_count，不阻塞加载
  void supabase.rpc('increment_plays', { row_id: id })
  return { level: (data as { level_data: LevelConfig; plays_count: number }).level_data }
}
