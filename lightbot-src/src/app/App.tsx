import { useEffect } from 'react'
import { Providers } from './providers'
import { GameShell } from '../components/layout/GameShell'
import { LevelEditorShell } from '../components/leveleditor/LevelEditorShell'
import { RobotDirectionShowcase } from '../components/debug/RobotDirectionShowcase'
import { TileLayerShowcase } from '../components/debug/TileLayerShowcase'
import { useAppStore } from './app.store'
import { useGameStore } from '../features/game/game.store'
import { getSharedLevelFromUrl } from '../utils/level-share'
import { trackEvent } from '../utils/track'

const DEBUG_MODE = new URLSearchParams(window.location.search).get('debug')

function AppContent() {
  const appMode = useAppStore((s) => s.appMode)
  const loadCustomLevel = useGameStore((s) => s.loadCustomLevel)
  const loadLevels = useGameStore((s) => s.loadLevels)
  const levelsLoaded = useGameStore((s) => s.levelsLoaded)

  // 首次挂载时从 API 加载关卡
  useEffect(() => {
    loadLevels()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 关卡加载完成后处理分享链接及埋点
  useEffect(() => {
    if (!levelsLoaded) return
    trackEvent('game_start')
    const sharedLevel = getSharedLevelFromUrl()
    if (sharedLevel) {
      loadCustomLevel(sharedLevel)
      window.history.replaceState({}, '', window.location.pathname)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelsLoaded])

  // 关卡加载完成后，从服务端同步通关记录（支持换设备显示进度）
  useEffect(() => {
    if (!levelsLoaded) return
    const token = localStorage.getItem('auth_token')
    if (!token) return
    fetch('/api/codebot/my-completions', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((data: { ok: boolean; completions: Array<{ levelId: string; stars: number }> }) => {
        if (!data.ok || !Array.isArray(data.completions) || data.completions.length === 0) return
        const { levels } = useGameStore.getState()
        const idxMap = new Map(levels.map((l, i) => [l.id, i]))
        const newIndices = data.completions
          .map(c => idxMap.get(c.levelId))
          .filter((i): i is number => i !== undefined)
        const stars: Record<string, number> = {}
        data.completions.forEach(c => { stars[c.levelId] = c.stars })
        useGameStore.setState(state => ({
          completedLevels: Array.from(new Set([...state.completedLevels, ...newIndices])),
          levelStars: stars,
        }))
      })
      .catch(() => {}) // 静默失败
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelsLoaded])

  // 通知父页面（Vue）当前模式，用于隐藏角标栏
  useEffect(() => {
    window.parent?.postMessage({ type: 'app-mode', mode: appMode }, '*')
  }, [appMode])

  // 监听父页面退出登录（父页面 removeItem('auth_token') → storage 事件触发到 iframe）
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'auth_token' && e.newValue === null) {
        // 清除关卡进度，使选关界面不再显示已通关/星级
        useGameStore.setState({ completedLevels: [], levelStars: {}, savedUserId: null })
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  // 关卡未就绪时显示加载中
  if (!levelsLoaded) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100vw', height: '100vh', background: '#0e1117', color: '#7eb8f7',
        fontFamily: 'system-ui, sans-serif', fontSize: '1.1rem', gap: '0.75rem',
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
          </path>
        </svg>
        加载关卡中...
      </div>
    )
  }

  if (appMode === 'editor') return <LevelEditorShell />
  return <GameShell />
}

function App() {
  return (
    <Providers>
      {DEBUG_MODE === 'directions' ? <RobotDirectionShowcase />
        : DEBUG_MODE === 'tiles' ? <TileLayerShowcase />
        : <AppContent />}
    </Providers>
  )
}

export default App
