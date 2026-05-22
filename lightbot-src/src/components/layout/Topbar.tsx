import { useState } from 'react'
import { useAppStore } from '../../app/app.store'
import { AdminStatsPanel } from '../admin/AdminStatsPanel'

export function Topbar() {
  const isAdmin  = useAppStore((s) => s.isAdmin)
  const username = useAppStore((s) => s.username)
  const [showStats, setShowStats] = useState(false)

  return (
    <header className="lb-topbar">
      <div>
        <p className="lb-eyebrow">Codebot Teaching Game</p>
        <h1>网页嵌入式编程启蒙游戏骨架</h1>
      </div>
      <p className="lb-topbar-note">
        拖拽积木编写程序，引导机器人点亮所有灯泡！
      </p>
      <div className="lb-topbar-user-area">
        {username && (
          <span className="lb-topbar-user" title="当前登录用户">
            👤 {username}
          </span>
        )}
        {isAdmin && (
          <span className="lb-admin-trigger lb-admin-trigger--active" title="管理员模式">
            🔓 管理员
          </span>
        )}
        {isAdmin && (
          <button className="lb-admin-trigger lb-admin-log-btn" onClick={() => setShowStats(true)} title="查看统计日志">
            📊 日志
          </button>
        )}
      </div>
      {showStats && <AdminStatsPanel onClose={() => setShowStats(false)} />}
    </header>
  )
}
