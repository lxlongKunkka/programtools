import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../../app/app.store'
import { AdminStatsPanel } from '../admin/AdminStatsPanel'

export function Topbar() {
  const isAdmin  = useAppStore((s) => s.isAdmin)
  const username = useAppStore((s) => s.username)
  const [showStats, setShowStats] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

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
          <div className="lb-topbar-menu" ref={menuRef}>
            <button
              className="lb-topbar-hamburger"
              onClick={() => setMenuOpen(v => !v)}
              title="更多操作"
            >
              ☰
            </button>
            {menuOpen && (
              <div className="lb-topbar-dropdown">
                <button
                  className="lb-topbar-dropdown-item"
                  onClick={() => { setShowStats(true); setMenuOpen(false) }}
                >
                  📊 管理员日志
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {showStats && <AdminStatsPanel onClose={() => setShowStats(false)} />}
    </header>
  )
}
