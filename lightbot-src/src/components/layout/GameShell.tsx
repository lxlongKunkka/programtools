import { useState, useEffect } from 'react'
import { GameScene } from '../../features/renderer/scene/GameScene'
import { BlockArea } from '../editor/BlockArea'
import { ProgramPanel, LevelNavBar } from '../editor/ProgramPanel'
import { CodeView } from '../editor/CodeView'
import { FloatingEffects } from './FloatingEffects'
import { useGameStore } from '../../features/game/game.store'
// TODO: 如需修改学习网站链接，在此处更改
const TIKU_URL = 'https://ai.acjudge.com'

type LbEntry = { rank: number; username: string; totalCommands: number; executionSteps: number; completedAt?: string | null }

function fmtDate(iso?: string | null) {
  if (!iso) return '-'
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return '今天 ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return '昨天'
  if (diffDays < 30) return `${diffDays}天前`
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

export function GameShell() {
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)
  const level = useGameStore((s) => s.level)

  const [lbOpen, setLbOpen]       = useState(false)
  const [lbData, setLbData]       = useState<LbEntry[]>([])
  const [lbLoading, setLbLoading] = useState(false)
  const [lbTitle, setLbTitle]     = useState('')

  function openLeaderboard() {
    setLbOpen(true)
    setLbTitle(level.title)
    setLbLoading(true)
    setLbData([])
    fetch(`/api/codebot/levels/${encodeURIComponent(level.id)}/leaderboard`)
      .then((r) => r.json() as Promise<{ ok: boolean; data: LbEntry[] }>)
      .then((json) => { if (json.ok) setLbData(json.data) })
      .catch(() => {})
      .finally(() => setLbLoading(false))
  }

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === 'open-leaderboard') openLeaderboard()
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [level.id])

  return (
    <main className="lb-shell lb-shell--game">
      <FloatingEffects />

      {/* ── 排行榜弹窗 ── */}
      {lbOpen && (
        <div className="lb-modal-overlay" onClick={() => setLbOpen(false)}>
          <div className="lb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lb-modal-header">
              <div className="lb-modal-title-group">
                <span className="lb-modal-title">🏆 本关排行榜</span>
                <span className="lb-modal-subtitle">{lbTitle}</span>
              </div>
              <button className="lb-modal-close" onClick={() => setLbOpen(false)}>✕</button>
            </div>
            <p className="lb-modal-hint">按积木总数由少到多排列，最多显示前 10 名</p>
            {lbLoading ? (
              <div className="lb-modal-status">加载中…</div>
            ) : lbData.length === 0 ? (
              <div className="lb-modal-status">暂无记录，快来挑战吧！</div>
            ) : (
              <table className="lb-leaderboard-table lb-leaderboard-table--modal">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>玩家</th>
                    <th title="主程序+子程序积木总数">积木数</th>
                    <th title="机器人执行步数">执行步</th>
                    <th title="星级评定">★</th>
                    <th title="最优成绩创建时间">通关时间</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const bestCmds = Math.min(...lbData.map((e) => e.totalCommands))
                    const entryStars = (c: number) => c <= bestCmds ? 3 : c <= bestCmds + 2 ? 2 : 1
                    return lbData.map((entry) => (
                      <tr key={entry.rank} className={entry.rank <= 3 ? 'lb-leaderboard-top3' : ''}>
                        <td className="lb-leaderboard-rank">
                          {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                        </td>
                        <td className="lb-leaderboard-user">{entry.username}</td>
                        <td>{entry.totalCommands}</td>
                        <td>{entry.executionSteps}</td>
                        <td className="lb-leaderboard-stars">{"★".repeat(entryStars(entry.totalCommands))}{"☆".repeat(3 - entryStars(entry.totalCommands))}</td>
                        <td className="lb-leaderboard-date">{fmtDate(entry.completedAt)}</td>
                      </tr>
                    ))
                  })()}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <ProgramPanel mobileOpen={mobilePanelOpen} onMobileToggle={() => setMobilePanelOpen(v => !v)} />
      <div className="lb-level-nav-bar">
        <LevelNavBar />
      </div>
      <div className="lb-stage-wrapper">
        <GameScene />
      </div>
      <div className="lb-code-sidebar">
        <CodeView />
        <a href={TIKU_URL} target="_blank" rel="noopener noreferrer" className="lb-tiku-banner">
          <span className="lb-tiku-banner-icon">📚</span>
          <span className="lb-tiku-banner-body">
            <span className="lb-tiku-banner-title">去学习网站练习</span>
            <span className="lb-tiku-banner-sub">ai.acjudge.com</span>
          </span>
          <span className="lb-tiku-banner-arrow">›</span>
        </a>
      </div>
      <BlockArea />
    </main>
  )
}
