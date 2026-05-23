import { useState, useEffect } from 'react'

/** 将时间戳或 ISO 字符串格式化为东8区时间 yyyy-MM-dd HH:mm */
function fmtCst(value: number | string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).replace(/\//g, '-')
}

interface DailyRow { day: string; game_start: number; level_complete: number; unique_ips: number }
interface RecentResult { username: string; levelId: string; totalCommands: number; executionSteps: number; completedAt: string | null }
interface RecentEvent { t: number | null; ip: string | null; levelId: string | null; username: string | null; totalCommands: number | null; stars: number | null }

interface StatsData {
  total_events: number
  daily: DailyRow[]
  level_completions: Record<string, number>
  recent_results: RecentResult[]
  recent_events: RecentEvent[]
}

type Tab = 'daily' | 'levels' | 'results' | 'events'

export function AdminStatsPanel({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<StatsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('daily')

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    fetch('/api/codebot/admin/stats', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(d => { if (d.ok) setData(d); else setError(d.error || '获取失败') })
      .catch(() => setError('请求失败'))
  }, [])

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'daily',   label: '日活' },
    { key: 'levels',  label: '关卡完成' },
    { key: 'results', label: '排行榜记录' },
    { key: 'events',  label: '事件日志' },
  ]

  return (
    <div className="lb-admin-overlay" onClick={onClose}>
      <div className="lb-stats-panel" onClick={e => e.stopPropagation()}>
        <div className="lb-stats-header">
          <h2>管理员日志 / 统计</h2>
          {data && <span className="lb-stats-meta">共 {data.total_events} 条事件</span>}
          <button className="lb-stats-close" onClick={onClose}>×</button>
        </div>

        <div className="lb-stats-tabs">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`lb-stats-tab${tab === t.key ? ' lb-stats-tab--active' : ''}`}
              onClick={() => setTab(t.key)}
            >{t.label}</button>
          ))}
        </div>

        <div className="lb-stats-body">
          {!data && !error && <p className="lb-stats-loading">加载中…</p>}
          {error && <p className="lb-stats-error">⚠ {error}</p>}

          {data && tab === 'daily' && (
            <table className="lb-stats-table">
              <thead><tr><th>日期</th><th>游戏启动</th><th>关卡通关</th><th>独立IP</th></tr></thead>
              <tbody>
                {[...data.daily].reverse().map(row => (
                  <tr key={row.day}>
                    <td>{row.day}</td>
                    <td>{row.game_start}</td>
                    <td>{row.level_complete}</td>
                    <td>{row.unique_ips}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {data && tab === 'levels' && (
            <table className="lb-stats-table">
              <thead><tr><th>关卡 ID</th><th>通关次数</th></tr></thead>
              <tbody>
                {Object.entries(data.level_completions)
                  .sort((a, b) => b[1] - a[1])
                  .map(([id, n]) => (
                    <tr key={id}><td>{id}</td><td>{n}</td></tr>
                  ))}
              </tbody>
            </table>
          )}

          {data && tab === 'results' && (
            <table className="lb-stats-table">
              <thead><tr><th>用户</th><th>关卡</th><th>积木</th><th>步数</th><th>时间</th></tr></thead>
              <tbody>
                {data.recent_results.map((r, i) => (
                  <tr key={i}>
                    <td>{r.username}</td>
                    <td>{r.levelId}</td>
                    <td>{r.totalCommands}</td>
                    <td>{r.executionSteps}</td>
                    <td>{fmtCst(r.completedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {data && tab === 'events' && (
            <table className="lb-stats-table">
              <thead><tr><th>时间</th><th>IP</th><th>用户</th><th>关卡</th><th>积木</th><th>星级</th></tr></thead>
              <tbody>
                {data.recent_events.map((ev, i) => (
                  <tr key={i}>
                    <td>{fmtCst(ev.t)}</td>
                    <td>{ev.ip ?? '—'}</td>
                    <td>{ev.username ?? '—'}</td>
                    <td>{ev.levelId ?? '—'}</td>
                    <td>{ev.totalCommands ?? '—'}</td>
                    <td>{ev.stars != null ? '★'.repeat(ev.stars) + '☆'.repeat(3 - ev.stars) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
