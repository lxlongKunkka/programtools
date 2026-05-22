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
type LevelLbEntry = LbEntry & { stars: number; isCurrentUser?: boolean }
type OverallLbEntry = {
  rank: number
  username: string
  totalStars: number
  levelsCompleted: number
  threeStarLevels: number
  twoStarLevels: number
  oneStarLevels: number
  isCurrentUser?: boolean
}

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
  const [lbData, setLbData]       = useState<LevelLbEntry[]>([])
  const [overallLbData, setOverallLbData] = useState<OverallLbEntry[]>([])
  const [lbLoading, setLbLoading] = useState(false)
  const [lbTitle, setLbTitle]     = useState('')
  const [myLevelEntry, setMyLevelEntry] = useState<LevelLbEntry | null>(null)
  const [myOverallEntry, setMyOverallEntry] = useState<OverallLbEntry | null>(null)

  function openLeaderboard() {
    setLbOpen(true)
    setLbTitle(level.title)
    setLbLoading(true)
    setLbData([])
    setOverallLbData([])
    const token = localStorage.getItem('auth_token')
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined
    Promise.all([
      fetch(`/api/codebot/levels/${encodeURIComponent(level.id)}/leaderboard`, { headers })
        .then((r) => r.json() as Promise<{ ok: boolean; data: LevelLbEntry[]; myEntry?: LevelLbEntry | null }>),
      fetch('/api/codebot/leaderboard/overall', { headers })
        .then((r) => r.json() as Promise<{ ok: boolean; data: OverallLbEntry[]; myEntry?: OverallLbEntry | null }>),
    ])
      .then(([levelJson, overallJson]) => {
        if (levelJson.ok) {
          setLbData(levelJson.data)
          setMyLevelEntry(levelJson.myEntry ?? null)
        }
        if (overallJson.ok) {
          setOverallLbData(overallJson.data)
          setMyOverallEntry(overallJson.myEntry ?? null)
        }
      })
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
            <p className="lb-modal-hint">总排行按累计星数排序；本关排行按积木总数、执行步数排序，星级会随当前全服最佳解实时变化。</p>
            {lbLoading ? (
              <div className="lb-modal-status">加载中…</div>
            ) : (
              <>
                <div className="lb-leaderboard">
                  <div className="lb-leaderboard-title">⭐ 总星数排行</div>
                  {myOverallEntry && (
                    <div className="lb-modal-hint">你的总排行：第 {myOverallEntry.rank} 名，累计 {myOverallEntry.totalStars} 星</div>
                  )}
                  {overallLbData.length === 0 ? (
                    <div className="lb-leaderboard-empty">暂无总排行数据</div>
                  ) : (
                    <table className="lb-leaderboard-table lb-leaderboard-table--modal">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>玩家</th>
                          <th title="累计获得星数">总星数</th>
                          <th title="已完成官方关卡数量">通关关卡</th>
                          <th title="3 星 / 2 星 / 1 星">星级分布</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overallLbData.map((entry) => (
                          <tr key={entry.rank} className={`${entry.rank <= 3 ? 'lb-leaderboard-top3' : ''}${entry.isCurrentUser ? ' lb-leaderboard-row--me' : ''}`}>
                            <td className="lb-leaderboard-rank">
                              {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                            </td>
                            <td className="lb-leaderboard-user">{entry.username}{entry.isCurrentUser ? '（我）' : ''}</td>
                            <td className="lb-leaderboard-stars">{entry.totalStars} 星</td>
                            <td>{entry.levelsCompleted}</td>
                            <td>{entry.threeStarLevels}/{entry.twoStarLevels}/{entry.oneStarLevels}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="lb-leaderboard">
                  <div className="lb-leaderboard-title">🏆 本关排行榜</div>
                  {myLevelEntry && (
                    <div className="lb-modal-hint">你的本关排名：第 {myLevelEntry.rank} 名，当前 {myLevelEntry.stars} 星</div>
                  )}
                  {lbData.length === 0 ? (
                    <div className="lb-leaderboard-empty">暂无记录，快来挑战吧！</div>
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
                        {lbData.map((entry) => (
                          <tr key={entry.rank} className={`${entry.rank <= 3 ? 'lb-leaderboard-top3' : ''}${entry.isCurrentUser ? ' lb-leaderboard-row--me' : ''}`}>
                            <td className="lb-leaderboard-rank">
                              {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                            </td>
                            <td className="lb-leaderboard-user">{entry.username}{entry.isCurrentUser ? '（我）' : ''}</td>
                            <td>{entry.totalCommands}</td>
                            <td>{entry.executionSteps}</td>
                            <td className="lb-leaderboard-stars">{'★'.repeat(entry.stars)}{'☆'.repeat(3 - entry.stars)}</td>
                            <td className="lb-leaderboard-date">{fmtDate(entry.completedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
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
