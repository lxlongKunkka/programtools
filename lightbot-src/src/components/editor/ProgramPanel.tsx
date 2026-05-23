import { useState, useEffect, Fragment, type DragEvent } from 'react'
import { useGameStore } from '../../features/game/game.store'
import { useAppStore } from '../../app/app.store'
import { useLevelEditorStore } from '../../features/leveleditor/leveleditor.store'
import type { RootArea, BlockBlueprint, InsertTarget } from '../../features/editor/editor.helpers'
import { conditionOptions } from '../../features/editor/editor.helpers'

import type { ProgramNode, ProgramDocument, ConditionNode } from '../../domain/program/ast.types'
import { CmdBlock, TextCmdBlock, nodeToIcon } from './cmd-sprites'
import { BLOCK_DRAG_KEY } from './BlockArea'
import { CommunityLevelsBrowser } from './CommunityLevelsBrowser'
import { supabaseEnabled } from '../../utils/supabase'
import { AdminStatsPanel } from '../admin/AdminStatsPanel'


// TODO: 将 /qrcode.png 替换为你的微信二维码图片（放到 public/ 目录下）
const WECHAT_QR_SRC = '/qrcode.png'
// TODO: 替换为二维码下方的说明文字
const WECHAT_QR_LABEL = '学编程请联系教务老师'

const NODE_DRAG_KEY = 'application/x-codebot-node'

const AREAS: Array<{ area: RootArea; label: string }> = [
  { area: 'main', label: '主程序' },
  { area: 'f1',   label: '子程序 1' },
  { area: 'f2',   label: '子程序 2' },
]

type InnerTarget = { type: 'branch'; parentId: string; branch: 'body' | 'then' | 'else' }

const COND_LABEL: Record<ConditionNode['type'], string> = {
  'front-clear':    '前方可走',
  'front-has-coin': '前方有金币',
  'on-coin':        '踩在金币上',
  'coin-here':      '当前有金币',
  'front-higher':   '前方较高',
  'front-lower':    '前方较低',
}

// ── Insert position indicator ──
function InsertIndicator() {
  return <div className="lb-seq-insert-indicator" />
}

// ── BranchZone: droppable sub-area for then / else / body ──
function BranchZone({
  target, nodes, label, activeBlockId,
}: {
  target: InnerTarget
  nodes: ProgramNode[]
  label: string
  activeBlockId: string | null
}) {
  const insertNode       = useGameStore((s) => s.insertNode)
  const moveNodeToTarget = useGameStore((s) => s.moveNodeToTarget)
  const selectedTarget   = useGameStore((s) => s.selectedTarget)
  const setSelectedTarget = useGameStore((s) => s.setSelectedTarget)
  const [isDragOver, setIsDragOver] = useState(false)
  const [dropPos, setDropPos] = useState(-1)

  const isActive =
    selectedTarget.type === 'branch' &&
    selectedTarget.parentId === target.parentId &&
    selectedTarget.branch   === target.branch

  useEffect(() => {
    const clear = () => { setIsDragOver(false); setDropPos(-1) }
    document.addEventListener('dragend', clear)
    return () => document.removeEventListener('dragend', clear)
  }, [])

  function calcIdx(e: DragEvent): number {
    const items = Array.from(
      (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(':scope > [data-nid]')
    )
    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect()
      if (e.clientY < r.top) return i
      if (e.clientY <= r.bottom && e.clientX < r.left + r.width / 2) return i
    }
    return items.length
  }

  function acceptsDrag(e: DragEvent): boolean {
    return e.dataTransfer.types.includes(BLOCK_DRAG_KEY) || e.dataTransfer.types.includes(NODE_DRAG_KEY)
  }

  function onDragOver(e: DragEvent) {
    if (!acceptsDrag(e)) return
    e.preventDefault(); e.stopPropagation()
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes(NODE_DRAG_KEY) ? 'move' : 'copy'
    if (!isDragOver) setIsDragOver(true)
    setDropPos(calcIdx(e))
  }
  function onDragLeave(e: DragEvent) {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
      setDropPos(-1)
    }
  }
  function onDrop(e: DragEvent) {
    e.preventDefault(); e.stopPropagation()
    setIsDragOver(false)
    const idx = calcIdx(e)
    setDropPos(-1)
    const insertTarget: InsertTarget = { type: 'branch', parentId: target.parentId, branch: target.branch, index: idx }
    const nodeId = e.dataTransfer.getData(NODE_DRAG_KEY)
    if (nodeId) {
      moveNodeToTarget(nodeId, insertTarget)
      setSelectedTarget(target)
      return
    }
    const raw = e.dataTransfer.getData(BLOCK_DRAG_KEY)
    if (!raw) return
    try {
      insertNode(insertTarget, JSON.parse(raw) as BlockBlueprint)
      setSelectedTarget(target)
    } catch { /* ignore */ }
  }

  return (
    <div
      className={`lb-seq-branch lb-seq-branch--${target.branch}${isActive ? ' lb-seq-branch--active' : ''}`}
      onClick={(e) => { e.stopPropagation(); setSelectedTarget(target) }}
    >
      <span className="lb-seq-branch-label">{label}</span>
      <div
        className={`lb-seq-branch-body${isDragOver ? ' lb-seq-zone-scroll--over' : ''}`}
        onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      >
        {nodes.length === 0
          ? <span className="lb-seq-zone-empty">{isActive ? '← 拖入或点选积木' : '点击此处'}</span>
          : <>
              {nodes.map((n, i) => (
                <Fragment key={n.id}>
                  {dropPos === i && <InsertIndicator />}
                  <NodeItem node={n} activeBlockId={activeBlockId} dataNid={n.id} />
                </Fragment>
              ))}
              {dropPos === nodes.length && <InsertIndicator />}
            </>
        }
      </div>
    </div>
  )
}

// ── NodeItem: renders one node, recursively for if/repeat ──
function NodeItem({ node, activeBlockId, dataNid }: { node: ProgramNode; activeBlockId: string | null; dataNid?: string }) {
  const [open, setOpen] = useState(false)
  const removeNode          = useGameStore((s) => s.removeNode)
  const updateConditionType = useGameStore((s) => s.updateConditionType)
  const updateRepeatTimes   = useGameStore((s) => s.updateRepeatTimes)

  if (node.type === 'if') {
    const total = node.then.length + (node.else?.length ?? 0)
    if (!open) {
      return (
        <span data-nid={dataNid} className="lb-seq-ctrl-collapsed" onClick={(e) => e.stopPropagation()}
          draggable onDragStart={(e) => { e.dataTransfer.setData(NODE_DRAG_KEY, node.id); e.dataTransfer.effectAllowed = 'move' }}>
          <TextCmdBlock symbol="f{}" sqSize={54} onClick={() => setOpen(true)} title="点击展开编辑，拖动可移位" />
          {total > 0 && <span className="lb-seq-collapsed-badge">{total}</span>}
          <button className="lb-seq-collapsed-remove"
            onClick={(e) => { e.stopPropagation(); removeNode(node.id) }}>×</button>
        </span>
      )
    }
    return (
      <div data-nid={dataNid} className="lb-seq-ctrl-node lb-seq-ctrl-node--open">
        <div className="lb-seq-ctrl-header lb-seq-ctrl-header--toggle"
          onClick={(e) => { e.stopPropagation(); setOpen(false) }}>
          <span className="lb-seq-ctrl-arrow">▼</span>
          <span className="lb-seq-ctrl-label">? if</span>
          <select
            className="lb-seq-cond-select"
            value={node.condition.type}
            onChange={(e) => updateConditionType(node.id, e.target.value as ConditionNode['type'])}
            onClick={(e) => e.stopPropagation()}
          >
            {conditionOptions.map((c) => (
              <option key={c} value={c}>{COND_LABEL[c]}</option>
            ))}
          </select>
          <button className="lb-seq-remove-btn"
            onClick={(e) => { e.stopPropagation(); removeNode(node.id) }}>×</button>
        </div>
        <BranchZone target={{ type: 'branch', parentId: node.id, branch: 'then' }}
          nodes={node.then} label="✓ then" activeBlockId={activeBlockId} />
        <BranchZone target={{ type: 'branch', parentId: node.id, branch: 'else' }}
          nodes={node.else ?? []} label="✗ else" activeBlockId={activeBlockId} />
      </div>
    )
  }

  if (node.type === 'repeat') {
    const total = node.body.length
    if (!open) {
      return (
        <span data-nid={dataNid} className="lb-seq-ctrl-collapsed" onClick={(e) => e.stopPropagation()}
          draggable onDragStart={(e) => { e.dataTransfer.setData(NODE_DRAG_KEY, node.id); e.dataTransfer.effectAllowed = 'move' }}>
          <TextCmdBlock symbol="↻" sqSize={54} onClick={() => setOpen(true)} title="点击展开编辑，拖动可移位" />
          {total > 0 && <span className="lb-seq-collapsed-badge">{total}</span>}
          <span className="lb-seq-times-badge">×{node.times}</span>
          <button className="lb-seq-collapsed-remove"
            onClick={(e) => { e.stopPropagation(); removeNode(node.id) }}>×</button>
        </span>
      )
    }
    return (
      <div data-nid={dataNid} className="lb-seq-ctrl-node lb-seq-ctrl-node--open">
        <div className="lb-seq-ctrl-header lb-seq-ctrl-header--toggle"
          onClick={(e) => { e.stopPropagation(); setOpen(false) }}>
          <span className="lb-seq-ctrl-arrow">▼</span>
          <span className="lb-seq-ctrl-label">↻ repeat</span>
          <select
            className="lb-seq-cond-select"
            value={node.times}
            onChange={(e) => updateRepeatTimes(node.id, Number(e.target.value))}
            onClick={(e) => e.stopPropagation()}
          >
            {[2,3,4,5,6,7,8].map(n => <option key={n} value={n}>×{n}</option>)}
          </select>
          <button className="lb-seq-remove-btn"
            onClick={(e) => { e.stopPropagation(); removeNode(node.id) }}>×</button>
        </div>
        <BranchZone target={{ type: 'branch', parentId: node.id, branch: 'body' }}
          nodes={node.body} label="body" activeBlockId={activeBlockId} />
      </div>
    )
  }

  return (
    <span data-nid={dataNid} onClick={(e) => e.stopPropagation()}>
      <CmdBlock iconAsset={nodeToIcon(node)} sqSize={54}
        active={activeBlockId === node.id}
        onClick={() => removeNode(node.id)} title="点击移除，拖动可移位"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(NODE_DRAG_KEY, node.id)
          e.dataTransfer.effectAllowed = 'move'
        }} />
    </span>
  )
}

function Sequence({ area, label, maxBlocks }: { area: RootArea; label: string; maxBlocks?: number }) {
  const nodes = useGameStore((state) =>
    area === 'main' ? state.program.main : state.program.functions[area]
  )
  const activeBlockId = useGameStore((state) => state.world.activeBlockId)
  const insertNode = useGameStore((state) => state.insertNode)
  const moveNodeToTarget = useGameStore((state) => state.moveNodeToTarget)
  const selectedTarget = useGameStore((state) => state.selectedTarget)
  const setSelectedTarget = useGameStore((state) => state.setSelectedTarget)

  const [isDragOver, setIsDragOver] = useState(false)
  const [dropPos, setDropPos] = useState(-1)

  const isActive = selectedTarget.type === 'root' && selectedTarget.area === area
  const isFull = maxBlocks !== undefined && nodes.length >= maxBlocks

  useEffect(() => {
    const clear = () => { setIsDragOver(false); setDropPos(-1) }
    document.addEventListener('dragend', clear)
    return () => document.removeEventListener('dragend', clear)
  }, [])

  function calcIdx(e: DragEvent): number {
    const items = Array.from(
      (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(':scope > [data-nid]')
    )
    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect()
      if (e.clientY < r.top) return i
      if (e.clientY <= r.bottom && e.clientX < r.left + r.width / 2) return i
    }
    return items.length
  }

  function acceptsDrag(e: DragEvent): boolean {
    return e.dataTransfer.types.includes(BLOCK_DRAG_KEY) || e.dataTransfer.types.includes(NODE_DRAG_KEY)
  }

  function onDragOver(e: DragEvent) {
    if (!acceptsDrag(e)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes(NODE_DRAG_KEY) ? 'move' : 'copy'
    if (!isDragOver) setIsDragOver(true)
    setDropPos(calcIdx(e))
  }

  function onDragLeave(e: DragEvent) {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
      setDropPos(-1)
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const idx = calcIdx(e)
    setDropPos(-1)
    const insertTarget: InsertTarget = { type: 'root', area, index: idx }
    const nodeId = e.dataTransfer.getData(NODE_DRAG_KEY)
    if (nodeId) {
      moveNodeToTarget(nodeId, insertTarget)
      setSelectedTarget({ type: 'root', area })
      return
    }
    const raw = e.dataTransfer.getData(BLOCK_DRAG_KEY)
    if (!raw) return
    try {
      insertNode(insertTarget, JSON.parse(raw) as BlockBlueprint)
      setSelectedTarget({ type: 'root', area })
    } catch { /* malformed payload, ignore */ }
  }

  return (
    <div
      className={`lb-seq-zone${isActive ? ' lb-seq-zone--active' : ''}${isFull ? ' lb-seq-zone--full' : ''}`}
      onClick={() => setSelectedTarget({ type: 'root', area })}
      title={isActive ? undefined : `点击激活 ${label}`}
    >
      <div className="lb-seq-zone-header">
        <span>{label}</span>
        {maxBlocks !== undefined && (
          <span className={`lb-seq-zone-count${isFull ? ' lb-seq-zone-count--full' : ''}`}>
            {nodes.length}/{maxBlocks}
          </span>
        )}
      </div>
      <div
        className={`lb-seq-zone-scroll${isDragOver ? ' lb-seq-zone-scroll--over' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {nodes.length === 0 ? (
          <span className="lb-seq-zone-empty">
            {isActive ? '← 点击或拖入积木' : '点击此区域后添加积木'}
          </span>
        ) : (
          <>
            {nodes.map((node, i) => (
              <Fragment key={node.id}>
                {dropPos === i && <InsertIndicator />}
                <NodeItem node={node} activeBlockId={activeBlockId} dataNid={node.id} />
              </Fragment>
            ))}
            {dropPos === nodes.length && <InsertIndicator />}
          </>
        )}
      </div>
    </div>
  )
}

// ── 关卡导航栏（独立组件，渲染到居中位置） ──
export function LevelNavBar() {
  const [showPicker, setShowPicker] = useState(false)
  const [showCommunity, setShowCommunity] = useState(false)
  useEffect(() => {
    if (!showPicker) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowPicker(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [showPicker])
  const levels        = useGameStore((state) => state.levels)
  const levelIndex    = useGameStore((state) => state.levelIndex)
  const loadLevel     = useGameStore((state) => state.loadLevel)
  const level         = useGameStore((state) => state.level)
  const completedLevels = useGameStore((state) => state.completedLevels)
  const levelStars = useGameStore((state) => state.levelStars)
  const setAppMode    = useAppStore((s) => s.setAppMode)
  const isTestingCustomLevel    = useAppStore((s) => s.isTestingCustomLevel)
  const setIsTestingCustomLevel = useAppStore((s) => s.setIsTestingCustomLevel)
  const isAdmin                 = useAppStore((s) => s.isAdmin)
  const [showStats, setShowStats] = useState(false)
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === 'open-admin-log') setShowStats(true)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  const isCustomLevel    = level.chapter?.id === 'custom'
  const setProgram      = useGameStore((s) => s.setProgram)
  const resetWorld      = useGameStore((s) => s.resetWorld)
  const [solLoading, setSolLoading] = useState(false)
  const loadFromConfig  = useLevelEditorStore((s) => s.loadFromConfig)
  const resetEditor     = useLevelEditorStore((s) => s.reset)

  const hasNavLeaderboard = !isCustomLevel

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false
      const tagName = target.tagName
      return target.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT'
    }

    const onKey = (e: KeyboardEvent) => {
      if (showPicker || showCommunity || showStats || isCustomLevel) return
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      if (isEditableTarget(e.target)) return

      if (e.key === 'ArrowLeft' && levelIndex > 0) {
        e.preventDefault()
        loadLevel(levelIndex - 1)
      }

      if (e.key === 'ArrowRight' && levelIndex < levels.length - 1) {
        e.preventDefault()
        loadLevel(levelIndex + 1)
      }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [showPicker, showCommunity, showStats, isCustomLevel, levelIndex, levels.length, loadLevel])

  const loadMySolutionNav = async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) return
    setSolLoading(true)
    try {
      const r = await fetch(`/api/codebot/levels/${encodeURIComponent(level.id)}/my-solution`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await r.json()
      if (data.ok && data.solution && Array.isArray(data.solution.main)) {
        const normalized: ProgramDocument = {
          main: data.solution.main,
          functions: {
            f1: Array.isArray(data.solution.functions?.f1) ? data.solution.functions.f1 : [],
            f2: Array.isArray(data.solution.functions?.f2) ? data.solution.functions.f2 : [],
          },
        }
        setProgram(normalized)
        resetWorld()
      }
    } catch { /* 静默失败 */ } finally {
      setSolLoading(false)
    }
  }

  function handleEditLevel() {
    loadFromConfig(level)
    setAppMode('editor')
  }

  function handleNewLevel() {
    resetEditor()
    setAppMode('editor')
  }

  async function handleDeleteLevel() {
    if (!window.confirm(`确定要删除关卡「${level.title}」吗？此操作不可撤销。`)) return
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch(`/api/codebot/admin/level/${encodeURIComponent(level.id)}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const ct = res.headers.get('content-type') ?? ''
      if (!ct.includes('application/json')) {
        alert('删除失败：服务器响应异常，请确认已登录系统管理员账号')
        return
      }
      const data = await res.json() as { ok?: boolean; error?: string }
      if (data.ok) {
        const nextIdx = levelIndex > 0 ? levelIndex - 1 : 0
        loadLevel(nextIdx)
        alert(`✓ 已删除关卡「${level.title}」`)
      } else {
        alert('删除失败：' + (data.error ?? '未知错误'))
      }
    } catch {
      alert('删除失败：网络错误')
    }
  }

  return (
    <div className="lb-level-nav-bar">
      <div className="lb-level-nav">
        {hasNavLeaderboard && !!localStorage.getItem('auth_token') && (
          <button
            className="lb-level-nav-btn"
            onClick={() => void loadMySolutionNav()}
            disabled={solLoading}
            title="读取我的历史最优解"
          >{solLoading ? '⏳' : '📂'}</button>
        )}
        <button
          className="lb-level-nav-btn"
          onClick={() => loadLevel(levelIndex - 1)}
          disabled={levelIndex === 0 || isCustomLevel}
          title="上一关"
        >◄</button>
        <button
          className="lb-level-nav-title lb-level-nav-title--btn"
          onClick={() => setShowPicker((v) => !v)}
          title="点击选择关卡"
        >
          <span className="lb-level-nav-num">第 {levelIndex + 1} 关 / {levels.length}</span>
          <span className="lb-level-nav-name">{level.title}</span>
          <span className="lb-level-nav-caret">{showPicker ? '▴' : '▾'}</span>
        </button>
        <button
          className="lb-level-nav-btn"
          onClick={() => loadLevel(levelIndex + 1)}
          disabled={levelIndex === levels.length - 1 || isCustomLevel}
          title="下一关"
        >►</button>
        {isTestingCustomLevel ? (
          <button
            className="lb-level-nav-btn lb-level-nav-btn--editor"
            onClick={() => { setIsTestingCustomLevel(false); setAppMode('editor') }}
            title="返回编辑器"
          >← 编辑</button>
        ) : (
          <>
            {supabaseEnabled && (
              <button
                className="lb-level-nav-btn lb-level-nav-btn--community"
                onClick={() => setShowCommunity(true)}
                title="社区关卡"
              >🌐</button>
            )}
            <button
              className="lb-level-nav-btn lb-level-nav-btn--editor"
              onClick={handleNewLevel}
              title="新建关卡"
            >＋</button>
            {isAdmin && (
              <button
                className="lb-level-nav-btn lb-level-nav-btn--editor"
                onClick={handleEditLevel}
                title="在编辑器中打开此关卡"
              >✏️</button>
            )}
            {isAdmin && (
              <button
                className="lb-level-nav-btn lb-level-nav-btn--delete"
                onClick={() => void handleDeleteLevel()}
                title="删除此关卡"
              >🗑️</button>
            )}

          </>
        )}
      </div>
      {showCommunity && <CommunityLevelsBrowser onClose={() => setShowCommunity(false)} />}
      {showStats && <AdminStatsPanel onClose={() => setShowStats(false)} />}
      {showPicker && (
        <>
          <div className="lb-level-picker-backdrop" onClick={() => setShowPicker(false)} />
          <div className="lb-level-picker lb-level-picker--dropdown">
          {(() => {
            const chapterMap = new Map<string, { title: string; order: number; indices: number[] }>()
            levels.forEach((l, i) => {
              const ch = l.chapter ?? { id: 'default', title: '关卡', order: 0 }
              if (!chapterMap.has(ch.id)) {
                chapterMap.set(ch.id, { title: ch.title, order: ch.order, indices: [] })
              }
              chapterMap.get(ch.id)!.indices.push(i)
            })
            const chapters = Array.from(chapterMap.entries()).sort(([, a], [, b]) => a.order - b.order)
            return chapters.map(([chId, chapter]) => (
              <div key={chId} className="lb-level-picker-chapter">
                <div className="lb-level-picker-chapter-title">{chapter.title}</div>
                {chapter.indices.map(i => {
                  const l = levels[i]
                  const done = completedLevels.includes(i)
                  const starCount = levelStars[l.id]
                  return (
                    <button
                      key={l.id}
                      className={`lb-level-card${i === levelIndex ? ' lb-level-card--active' : ''}${done ? ' lb-level-card--done' : ''}`}
                      onClick={() => { loadLevel(i); setShowPicker(false) }}
                    >
                      <span className="lb-level-card-badge">{done ? '✓' : i + 1}</span>
                      <span className="lb-level-card-title">
                        {l.title}
                        {l._author && <span className="lb-level-card-author"> · {l._author}</span>}
                      </span>
                      {done && <span className="lb-level-card-stars">{'⭐'.repeat(starCount ?? 3)}</span>}
                    </button>
                  )
                })}
              </div>
            ))
          })()}
        </div>
        </>
      )}
    </div>
  )
}

export type WinData = {
  stars: number
  myLevelEntry: { rank: number; stars: number } | null
  myOverallEntry: { rank: number; totalStars: number } | null
}

export function ProgramPanel({ mobileOpen = false, onMobileToggle, winData }: {
  mobileOpen?: boolean
  onMobileToggle?: () => void
  winData?: WinData
}) {
  const resetWorld    = useGameStore((state) => state.resetWorld)
  const runStatus     = useGameStore((state) => state.runStatus)
  const levels        = useGameStore((state) => state.levels)
  const levelIndex    = useGameStore((state) => state.levelIndex)
  const loadLevel     = useGameStore((state) => state.loadLevel)
  const level         = useGameStore((state) => state.level)
  const winMeta       = useGameStore((state) => state.winMeta)
  const program       = useGameStore((state) => state.program)

  const mainBlocks = program.main.length

  const world       = useGameStore((state) => state.world)

  const isWin   = runStatus === 'complete'
  const isFail  = !isWin && !!world.failureReason
  const hasNext = levelIndex < levels.length - 1

  return (
    <div className={`lb-program-panel${mobileOpen ? ' lb-program-panel--mobile-open' : ''}${isWin ? ' lb-program-panel--win' : ''}${isFail ? ' lb-program-panel--fail' : ''}`}>

      {/* ── 移动端折叠把手（桌面端通过 CSS 隐藏） ── */}
      <button className="lb-mobile-panel-toggle" onClick={onMobileToggle}>
        {mobileOpen ? '▼ 收起程序' : '▲ 展开程序'}
        {mainBlocks > 0 && <span className="lb-mobile-panel-badge">{mainBlocks}</span>}
      </button>

      {/* ── 过关画面 ── */}
      {isWin && (
        <div className="lb-win-screen">
          <div className="lb-win-confetti">🎉</div>
          <div className="lb-win-heading">第 {levelIndex + 1} 关完成！</div>
          <div className="lb-win-subheading">{level.title}</div>
          <div className="lb-win-stars">
            {Array.from({ length: 3 }, (_, i) => (
              <span key={i} className={`lb-win-star${i < (winData?.stars ?? 1) ? ' lb-win-star--lit' : ''}`}>★</span>
            ))}
          </div>
          {winData?.myLevelEntry && (
            <div className="lb-win-subheading">本关排名：第 {winData.myLevelEntry.rank} 名，获得 {winData.myLevelEntry.stars} 星</div>
          )}
          {winMeta?.isNewBest && winMeta.demotedCount > 0 && (
            <div className="lb-win-new-best">🔥 全服最优解！你让 {winMeta.demotedCount} 位玩家的星级下降了！</div>
          )}
          {winMeta?.isNewBest && winMeta.demotedCount === 0 && (
            <div className="lb-win-new-best">🥇 你是本关第一个完成的玩家！</div>
          )}
          {winData?.myOverallEntry && (
            <div className="lb-win-subheading">总排行：第 {winData.myOverallEntry.rank} 名，累计 {winData.myOverallEntry.totalStars} 星</div>
          )}
          <div className="lb-win-qr">
            <img src={WECHAT_QR_SRC} alt={WECHAT_QR_LABEL} className="lb-win-qr-img" />
            <span className="lb-win-qr-text">{WECHAT_QR_LABEL}</span>
          </div>
          <div className="lb-win-actions">
            <button className="lb-win-retry-btn" onClick={resetWorld}>↺ 再试</button>
            {hasNext
              ? <button className="lb-win-next-btn" onClick={() => loadLevel(levelIndex + 1)}>下一关 ▶</button>
              : <span className="lb-win-all-done">🏆 全部完成！</span>
            }
          </div>
        </div>
      )}

      {/* ── 失败画面 ── */}
      {isFail && (
        <div className="lb-win-screen lb-fail-screen">
          <div className="lb-win-confetti">😓</div>
          <div className="lb-win-heading">挑战失败</div>
          <div className="lb-win-subheading">{world.failureReason}</div>
          <div className="lb-win-qr">
            <img src={WECHAT_QR_SRC} alt={WECHAT_QR_LABEL} className="lb-win-qr-img" />
            <span className="lb-win-qr-text">{WECHAT_QR_LABEL}</span>
          </div>
          <div className="lb-win-actions">
            <button className="lb-win-next-btn" onClick={resetWorld}>↺ 再试一次</button>
          </div>
        </div>
      )}

      {/* ── 积木序列区 ── */}
      {!isWin && !isFail && (
        <div className="lb-program-sequences">
          {AREAS.filter(({ area }) =>
            (area !== 'f1' || level.availableBlocks.includes('f1Call')) &&
            (area !== 'f2' || level.availableBlocks.includes('f2Call'))
          ).map(({ area, label }) => (
            <Sequence
              key={area}
              area={area}
              label={label}
              maxBlocks={area === 'main' ? level.constraints?.maxMainBlocks : 12}
            />
          ))}

        </div>
      )}
    </div>
  )
}
