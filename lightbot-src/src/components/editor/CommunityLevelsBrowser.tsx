import { useEffect, useState, useCallback } from 'react'
import { fetchCommunityLevels, loadCommunityLevel, supabaseEnabled, type CommunityLevel } from '../../utils/supabase'
import { useGameStore } from '../../features/game/game.store'
import { useAppStore } from '../../app/app.store'

type Props = { onClose: () => void }

export function CommunityLevelsBrowser({ onClose }: Props) {
  const [levels, setLevels]     = useState<CommunityLevel[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [page, setPage]         = useState(0)
  const [hasMore, setHasMore]   = useState(true)
  const [playing, setPlaying]   = useState<string | null>(null)

  const loadCustomLevel         = useGameStore((s) => s.loadCustomLevel)
  const setIsTestingCustomLevel = useAppStore((s) => s.setIsTestingCustomLevel)

  const PAGE_SIZE = 20

  const load = useCallback(async (p: number) => {
    setLoading(true)
    setError('')
    const { data, error: err } = await fetchCommunityLevels(p, PAGE_SIZE)
    setLoading(false)
    if (err) { setError(err); return }
    if (p === 0) setLevels(data)
    else setLevels((prev) => [...prev, ...data])
    setHasMore(data.length === PAGE_SIZE)
  }, [])

  useEffect(() => { void load(0) }, [load])

  async function handlePlay(id: string) {
    setPlaying(id)
    const result = await loadCommunityLevel(id)
    setPlaying(null)
    if ('error' in result) { setError(result.error); return }
    loadCustomLevel(result.level)
    setIsTestingCustomLevel(true)
    onClose()
  }

  if (!supabaseEnabled) {
    return (
      <div className="lb-community-overlay" onClick={onClose}>
        <div className="lb-community-modal" onClick={(e) => e.stopPropagation()}>
          <p className="lb-community-empty">社区功能未配置，请联系管理员</p>
          <button className="lb-community-close" onClick={onClose}>关闭</button>
        </div>
      </div>
    )
  }

  return (
    <div className="lb-community-overlay" onClick={onClose}>
      <div className="lb-community-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lb-community-header">
          <span className="lb-community-title">🌐 社区关卡</span>
          <button className="lb-community-close" onClick={onClose}>✕</button>
        </div>

        {error && <p className="lb-community-error">{error}</p>}

        {levels.length === 0 && !loading && (
          <p className="lb-community-empty">还没有社区关卡，快来发布第一个吧！</p>
        )}

        <ul className="lb-community-list">
          {levels.map((lv) => (
            <li key={lv.id} className="lb-community-item">
              <div className="lb-community-item-info">
                <span className="lb-community-item-title">{lv.title}</span>
                <span className="lb-community-item-meta">
                  {lv.author_name} · {new Date(lv.created_at).toLocaleDateString('zh-CN')}
                  {lv.plays_count > 0 && ` · ${lv.plays_count} 次游玩`}
                </span>
              </div>
              <button
                className="lb-community-play-btn"
                onClick={() => void handlePlay(lv.id)}
                disabled={playing === lv.id}
              >
                {playing === lv.id ? '加载中…' : '▶ 玩'}
              </button>
            </li>
          ))}
        </ul>

        {loading && <p className="lb-community-loading">加载中…</p>}

        {hasMore && !loading && (
          <button
            className="lb-community-more-btn"
            onClick={() => { const next = page + 1; setPage(next); void load(next) }}
          >
            加载更多
          </button>
        )}
      </div>
    </div>
  )
}
