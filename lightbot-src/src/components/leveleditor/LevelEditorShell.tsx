import { useState } from 'react'
import { useLevelEditorStore, type EditorTool } from '../../features/leveleditor/leveleditor.store'
import { useGameStore } from '../../features/game/game.store'
import { useAppStore } from '../../app/app.store'
import { GridEditor } from './GridEditor'
import { buildShareUrl } from '../../utils/level-share'
import { publishLevel, supabaseEnabled } from '../../utils/supabase'
import type { Direction } from '../../domain/map/map.types'

const TOOLS: Array<{ tool: EditorTool; icon: string; label: string; tip: string }> = [
  { tool: 'path',        icon: '🟦', label: '地板',    tip: '点击格子设为地板' },
  { tool: 'void',        icon: '⬛', label: '空洞',    tip: '点击格子移除地板' },
  { tool: 'coin',        icon: '🪙', label: '金币',    tip: '点击切换金币/地板' },
  { tool: 'obstacle',    icon: '🌲', label: '树',      tip: '点击放置/移除树（机器人无法通过）' },
  { tool: 'trap',        icon: '⚠️', label: '陷阱',    tip: '点击放置/移除陷阱（机器人进入即失败）' },
  { tool: 'height-up',   icon: '⬆',  label: '升高',    tip: '点击增加格子高度' },
  { tool: 'height-down', icon: '⬇',  label: '降低',    tip: '点击降低格子高度' },
  { tool: 'robot',       icon: '🤖', label: '机器人',  tip: '点击设置起始位置' },
]

const DIRECTIONS: Direction[] = ['N', 'E', 'S', 'W']
const DIR_LABELS: Record<Direction, string> = { N: '↑ 北', E: '→ 东', S: '↓ 南', W: '← 西' }

export function LevelEditorShell() {
  const setAppMode = useAppStore((s) => s.setAppMode)
  const setIsTestingCustomLevel = useAppStore((s) => s.setIsTestingCustomLevel)
  const isAdmin = useAppStore((s) => s.isAdmin)
  const loadCustomLevel = useGameStore((s) => s.loadCustomLevel)
  const loadLevel        = useGameStore((s) => s.loadLevel)
  const addUserLevel     = useGameStore((s) => s.addUserLevel)
  const updateLevel      = useGameStore((s) => s.updateLevel)
  const levels           = useGameStore((s) => s.levels)
  const customLevelSolutionSteps = useGameStore((s) => s.customLevelSolutionSteps)

  const selectedTool = useLevelEditorStore((s) => s.selectedTool)
  const setSelectedTool = useLevelEditorStore((s) => s.setSelectedTool)
  const robot = useLevelEditorStore((s) => s.robot)
  const setRobotDirection = useLevelEditorStore((s) => s.setRobotDirection)
  const cols = useLevelEditorStore((s) => s.cols)
  const rows = useLevelEditorStore((s) => s.rows)
  const setSize = useLevelEditorStore((s) => s.setSize)
  const metadata = useLevelEditorStore((s) => s.metadata)
  const setMetadata = useLevelEditorStore((s) => s.setMetadata)
  const toLevelConfig = useLevelEditorStore((s) => s.toLevelConfig)
  const reset = useLevelEditorStore((s) => s.reset)
  const grid = useLevelEditorStore((s) => s.grid)

  const [shareMsg, setShareMsg] = useState('')
  const [validationError, setValidationError] = useState('')
  const [publishState, setPublishState] = useState<'idle' | 'asking' | 'loading'>('idle')
  const [submitState, setSubmitState] = useState<'idle' | 'asking' | 'sending'>('idle')
  const [authorName, setAuthorName] = useState('')
  // 用户是否已登录（有 JWT 令牌）
  const [isLoggedIn] = useState(() => !!localStorage.getItem('auth_token'))
  const isAdminEditingExistingLevel = isAdmin && metadata.chapter?.id !== undefined && metadata.chapter.id !== 'custom'

  function validate(): string | null {
    if (!metadata.title.trim()) return '请输入关卡名称'
    const hasCoin = grid.some((row) => row.some((cell) => cell.kind === 'coin'))
    if (!hasCoin) return '关卡至少需要一枚金币'
    const robotCell = grid[robot.y]?.[robot.x]
    if (!robotCell || robotCell.kind === 'void') return '机器人必须放在有效地板上'
    return null
  }

  function handleTest() {
    const err = validate()
    if (err) { setValidationError(err); return }
    setValidationError('')
    loadCustomLevel(toLevelConfig())
    setIsTestingCustomLevel(true)
    setAppMode('game')
  }

  function handleDownload() {
    const err = validate()
    if (err) { setValidationError(err); return }
    setValidationError('')
    downloadFile(toLevelConfig())
  }

  function downloadFile(cfg: ReturnType<typeof toLevelConfig>) {
    const json = JSON.stringify(cfg, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `${cfg.id}.json`
    a.click()
    URL.revokeObjectURL(blobUrl)
  }

  async function handleSave() {
    const err = validate()
    if (err) { setValidationError(err); return }
    if (!isAdminEditingExistingLevel && customLevelSolutionSteps === 0) {
      setValidationError('请先点击》测试《通关关卡，再保存到服务器')
      return
    }
    if (!isAdminEditingExistingLevel && customLevelSolutionSteps < 10) {
      setValidationError(`关卡解法步数（${customLevelSolutionSteps}步）不足 10 步，请增加关卡复杂度`)
      return
    }
    setValidationError('')
    const cfg = toLevelConfig()
    const content = JSON.stringify(cfg, null, 2)
    try {
      const token = localStorage.getItem('auth_token')
      const endpoint = isAdminEditingExistingLevel
        ? `/api/codebot/admin/level/${encodeURIComponent(cfg.id)}`
        : '/api/save-level'
      const res = await fetch(endpoint, {
        method: isAdminEditingExistingLevel ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ levelId: cfg.id, content, solutionSteps: customLevelSolutionSteps }),
      })
      const ct = res.headers.get('content-type') ?? ''
      if (!ct.includes('application/json')) {
        setValidationError('保存失败：请先登录账号')
        return
      }
      const data = await res.json() as { ok?: boolean; path?: string; error?: string }
      if (data.ok) {
        if (isAdminEditingExistingLevel) {
          const existingLevel = levels.find((item) => item.id === cfg.id)
          updateLevel(existingLevel ? { ...existingLevel, ...cfg } : cfg)
          setShareMsg('✓ 已保存到数据库，当前关卡已更新')
        } else {
          addUserLevel(cfg)
          setShareMsg('✓ 已保存！关卡已出现在游戏列表「🎮 我的关卡」中')
        }
        setTimeout(() => setShareMsg(''), 4000)
      } else {
        setValidationError(data.error ?? '保存失败')
      }
    } catch {
      setValidationError('保存失败：网络错误，请稍后重试')
    }
  }

  async function handleShare() {
    const err = validate()
    if (err) { setValidationError(err); return }
    setValidationError('')
    const url = buildShareUrl(toLevelConfig())
    try {
      await navigator.clipboard.writeText(url)
      setShareMsg('✓ 链接已复制！')
    } catch {
      // Fallback: show the URL — for now just notify
      setShareMsg('复制失败，请手动复制地址栏 URL')
      window.history.replaceState({}, '', `?level=${new URLSearchParams(url.split('?')[1]).get('level')}`)
    }
    setTimeout(() => setShareMsg(''), 3500)
  }

  async function handleSubmit() {
    if (submitState === 'asking') {
      const err = validate()
      if (err) { setValidationError(err); return }
      if (customLevelSolutionSteps === 0) {
        setValidationError('投稿前请先测试通关关卡')
        return
      }
      setValidationError('')
      const cfg = toLevelConfig()
      const shareUrl = buildShareUrl(cfg)
      setSubmitState('sending')
      try {
        const res = await fetch('/api/submit-level', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: cfg.title, author: authorName.trim() || '匿名', url: shareUrl }),
        })
        const data = await res.json() as { ok?: boolean; error?: string }
        if (data.ok) {
          setShareMsg('✓ 已投稿！管理员审核后会加入官方关卡')
          setTimeout(() => setShareMsg(''), 5000)
          setSubmitState('idle')
        } else {
          setValidationError('投稿失败：' + (data.error ?? '请稍后再试'))
          setSubmitState('asking')
        }
      } catch {
        setValidationError('投稿失败：网络错误，请稍后再试')
        setSubmitState('asking')
      }
    } else {
      setPublishState('idle')   // 关掉另一个展开状态
      setSubmitState('asking')
    }
  }

  async function handlePublish() {
    if (publishState === 'asking') {
      // 确认发布
      const err = validate()
      if (err) { setValidationError(err); return }
      if (customLevelSolutionSteps === 0) {
        setValidationError('发布前请先测试通关关卡')
        return
      }
      setValidationError('')
      setPublishState('loading')
      const result = await publishLevel(toLevelConfig(), authorName)
      setPublishState('idle')
      if ('error' in result) {
        setValidationError('发布失败：' + result.error)
      } else {
        setShareMsg('✓ 已发布到社区！其他玩家可在「社区关卡」中找到它')
        setTimeout(() => setShareMsg(''), 5000)
      }
    } else {
      setPublishState('asking')
    }
  }

  return (
    <div className="lb-editor-shell">
      {/* ── 顶部栏 ── */}
      <div className="lb-editor-topbar">
        <button className="lb-editor-back-btn" onClick={() => {
          // 找回编辑前的关卡位置（测试时 loadCustomLevel 会把 levelIndex 移到末尾）
          const idx = levels.findIndex((l) => l.id === metadata.id)
          if (idx >= 0) loadLevel(idx)
          setAppMode('game')
        }}>← 返回游戏</button>
        <input
          className="lb-editor-title-input"
          value={metadata.title}
          onChange={(e) => setMetadata({ title: e.target.value })}
          placeholder="关卡名称…"
          maxLength={40}
        />
        <div className="lb-editor-topbar-right">
          {validationError && <span className="lb-editor-msg lb-editor-msg--error">{validationError}</span>}
          {shareMsg && <span className="lb-editor-msg lb-editor-msg--ok">{shareMsg}</span>}
          <button className="lb-editor-action-btn lb-editor-action-btn--reset" onClick={reset}>清空</button>
          <button className="lb-editor-action-btn lb-editor-action-btn--test" onClick={handleTest}>▶ 测试</button>
          {customLevelSolutionSteps > 0 && (
            <span className="lb-editor-msg lb-editor-msg--ok" title="已验证解法">
              ✓ {customLevelSolutionSteps}步
            </span>
          )}
          {isLoggedIn && (
            <button className="lb-editor-action-btn lb-editor-action-btn--download" onClick={() => void handleSave()}>
              {isAdminEditingExistingLevel ? '💾 保存到数据库' : '💾 保存'}
            </button>
          )}
          {isAdmin && (
            <button className="lb-editor-action-btn lb-editor-action-btn--reset" onClick={handleDownload}>
              ↓ 导出 JSON
            </button>
          )}
          <button className="lb-editor-action-btn lb-editor-action-btn--share" onClick={() => void handleShare()}>
            🔗 分享链接
          </button>
          {supabaseEnabled && (
            publishState === 'asking' ? (
              <span className="lb-editor-publish-row">
                <input
                  className="lb-editor-author-input"
                  placeholder="你的昵称（可选）"
                  maxLength={20}
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handlePublish() }}
                  autoFocus
                />
                <button className="lb-editor-action-btn lb-editor-action-btn--publish" onClick={() => void handlePublish()}>
                  确认发布
                </button>
                <button className="lb-editor-action-btn lb-editor-action-btn--reset" onClick={() => setPublishState('idle')}>
                  取消
                </button>
              </span>
            ) : (
              <button
                className="lb-editor-action-btn lb-editor-action-btn--publish"
                onClick={() => void handlePublish()}
                disabled={publishState === 'loading'}
              >
                {publishState === 'loading' ? '发布中…' : '🌐 发布'}
              </button>
            )
          )}
          {submitState === 'asking' || submitState === 'sending' ? (
            <span className="lb-editor-publish-row">
              <input
                className="lb-editor-author-input"
                placeholder="你的昵称（可选）"
                maxLength={20}
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleSubmit() }}
                disabled={submitState === 'sending'}
                autoFocus
              />
              <button
                className="lb-editor-action-btn lb-editor-action-btn--publish"
                onClick={() => void handleSubmit()}
                disabled={submitState === 'sending'}
              >
                {submitState === 'sending' ? '投稿中…' : '确认投稿'}
              </button>
              <button
                className="lb-editor-action-btn lb-editor-action-btn--reset"
                onClick={() => setSubmitState('idle')}
                disabled={submitState === 'sending'}
              >
                取消
              </button>
            </span>
          ) : (
            <button
              className="lb-editor-action-btn lb-editor-action-btn--publish"
              onClick={() => void handleSubmit()}
            >
              📤 投稿
            </button>
          )}
        </div>
      </div>

      {/* ── 主体 ── */}
      <div className="lb-editor-main">
        {/* ── 左侧边栏 ── */}
        <div className="lb-editor-sidebar">
          <div className="lb-editor-section-label">工具</div>
          <div className="lb-editor-tools">
            {TOOLS.map((t) => (
              <button
                key={t.tool}
                className={`lb-editor-tool-btn${selectedTool === t.tool ? ' lb-editor-tool-btn--active' : ''}`}
                onClick={() => setSelectedTool(t.tool)}
                title={t.tip}
              >
                <span className="lb-editor-tool-icon">{t.icon}</span>
                <span className="lb-editor-tool-label">{t.label}</span>
              </button>
            ))}
          </div>

          <div className="lb-editor-section-label" style={{ marginTop: 18 }}>机器人朝向</div>
          <div className="lb-editor-dir-grid">
            {DIRECTIONS.map((d) => (
              <button
                key={d}
                className={`lb-editor-dir-btn${robot.direction === d ? ' lb-editor-dir-btn--active' : ''}`}
                onClick={() => setRobotDirection(d)}
              >
                {DIR_LABELS[d]}
              </button>
            ))}
          </div>

          <div className="lb-editor-section-label" style={{ marginTop: 18 }}>网格大小 <span style={{ fontWeight: 400, opacity: 0.6, fontSize: '0.62rem' }}>（最大 9×9）</span></div>
          <div className="lb-editor-size-row">
            <label className="lb-editor-size-label">
              列
              <input
                type="number" min={2} max={9} value={cols}
                onChange={(e) => { const v = Math.max(2, Math.min(9, parseInt(e.target.value) || cols)); setSize(v, rows) }}
                className="lb-editor-num-input"
              />
            </label>
            <label className="lb-editor-size-label">
              行
              <input
                type="number" min={1} max={9} value={rows}
                onChange={(e) => { const v = Math.max(1, Math.min(9, parseInt(e.target.value) || rows)); setSize(cols, v) }}
                className="lb-editor-num-input"
              />
            </label>
          </div>

          <div className="lb-editor-section-label" style={{ marginTop: 18 }}>关卡描述</div>
          <textarea
            className="lb-editor-textarea"
            value={metadata.teachingGoal}
            onChange={(e) => setMetadata({ teachingGoal: e.target.value })}
            placeholder="写点介绍（可选）"
            rows={5}
          />

          <div className="lb-editor-section-label" style={{ marginTop: 14 }}>主程序限制</div>
          <input
            type="number" min={0} max={20}
            value={metadata.maxMainBlocks ?? ''}
            onChange={(e) => setMetadata({ maxMainBlocks: e.target.value ? parseInt(e.target.value) : undefined })}
            className="lb-editor-num-input lb-editor-num-input--wide"
            placeholder="不限制"
          />

          <div className="lb-editor-section-label" style={{ marginTop: 14 }}>子程序</div>
          <label className="lb-editor-toggle-row">
            <input
              type="checkbox"
              checked={metadata.f1Enabled ?? true}
              onChange={(e) => setMetadata({ f1Enabled: e.target.checked })}
            />
            <span>启用 f1() 子程序</span>
          </label>
          <label className="lb-editor-toggle-row">
            <input
              type="checkbox"
              checked={metadata.f2Enabled ?? false}
              onChange={(e) => setMetadata({ f2Enabled: e.target.checked })}
            />
            <span>启用 f2() 子程序</span>
          </label>
        </div>

        {/* ── 网格编辑区 ── */}
        <div className="lb-editor-canvas-area">
          <GridEditor />
          <div className="lb-editor-canvas-hint">
            选择左侧工具后，点击格子进行编辑 · 高度用数字标注 · 🤖 为机器人起始位置
          </div>
        </div>
      </div>
    </div>
  )
}
