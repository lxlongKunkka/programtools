import { useEffect, useState } from 'react'
import { useGameStore } from '../../features/game/game.store'
import type { RootArea } from '../../features/editor/editor.helpers'
import type { ActionKind, ConditionNode, ProgramNode } from '../../domain/program/ast.types'

// ── Drag state (module-level, safe for sequential drag ops) ──

type DragState =
  | { kind: 'cmd';  action: ActionKind }
  | { kind: 'call'; callTarget: 'f1' | 'f2' }
  | { kind: 'ctrl'; ctrlKind: 'repeat' | 'if' }
  | { kind: 'node'; nodeId: string }

let _drag: DragState | null = null

// ── Palette data ─────────────────────────────────────────────

const CMD_CHIPS: Array<{ action: ActionKind; kw: string }> = [
  { action: 'forward', kw: 'forward' },
  { action: 'left',    kw: 'turnLeft' },
  { action: 'right',   kw: 'turnRight' },
  { action: 'pickup',  kw: 'pickup' },
  { action: 'jump',    kw: 'jump' },
]

const CALL_CHIPS: Array<{ target: 'f1' | 'f2'; kw: string }> = [
  { target: 'f1', kw: 'f1()' },
  { target: 'f2', kw: 'f2()' },
]

const CTRL_CHIPS: Array<{ ctrlKind: 'repeat' | 'if'; kw: string }> = [
  { ctrlKind: 'repeat', kw: '↻ repeat' },
  { ctrlKind: 'if',     kw: '? if' },
]

const COND_OPTS: ConditionNode['type'][] = [
  'front-clear', 'front-has-coin', 'on-coin', 'coin-here', 'front-higher', 'front-lower',
]

const COND_LABELS: Record<ConditionNode['type'], string> = {
  'front-clear':    'front-clear',
  'front-has-coin': 'front-coin',
  'on-coin':        'on-coin',
  'coin-here':      'coin-here',
  'front-higher':   'front-hi',
  'front-lower':    'front-lo',
}

const AREAS: Array<{ area: RootArea; label: string }> = [
  { area: 'main', label: 'main:' },
  { area: 'f1',   label: 'f1:' },
  { area: 'f2',   label: 'f2:' },
]

const ACTION_KW: Record<ActionKind, string> = {
  forward: 'forward', left: 'turnLeft', right: 'turnRight', pickup: 'pickup', jump: 'jump',
}

// ── SubList — drop zone for a list of nodes ───────────────────
// Used for root areas AND nested branches (repeat.body / if.then / if.else)

type InsertTargetLike =
  | { type: 'root';   area: RootArea; index: number }
  | { type: 'branch'; parentId: string; branch: 'body' | 'then' | 'else'; index: number }

interface SubListProps {
  nodes: ProgramNode[]
  makeTarget: (index: number) => InsertTargetLike
  depth: number
  branchLabel?: string  // "✓" or "✗" label shown above branch
}

function SubList({ nodes, makeTarget, depth, branchLabel }: SubListProps) {
  const insertNode       = useGameStore((s) => s.insertNode)
  const moveNodeToTarget = useGameStore((s) => s.moveNodeToTarget)
  const [dropPos, setDropPos] = useState(-1)

  // Clear indicator on global dragend (handles edge cases when drop is outside)
  useEffect(() => {
    const clear = () => setDropPos(-1)
    document.addEventListener('dragend', clear)
    return () => document.removeEventListener('dragend', clear)
  }, [])

  function calcIdx(e: React.DragEvent): number {
    // Only consider DIRECT children with data-nid to avoid counting nested items
    const items = Array.from(
      (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(':scope > [data-nid]')
    )
    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect()
      if (e.clientY < r.top + r.height / 2) return i
    }
    return items.length
  }

  function onDragOver(e: React.DragEvent) {
    if (!_drag) return
    e.preventDefault()
    e.stopPropagation()   // innermost SubList wins
    e.dataTransfer.dropEffect = _drag.kind === 'node' ? 'move' : 'copy'
    setDropPos(calcIdx(e))
  }

  function onDragLeave(e: React.DragEvent) {
    if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) return
    setDropPos(-1)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()   // only innermost handles the drop
    const idx = calcIdx(e)
    setDropPos(-1)
    if (!_drag) return
    const target = makeTarget(idx)
    if (_drag.kind === 'cmd')  insertNode(target, { kind: 'action', action: _drag.action })
    else if (_drag.kind === 'call') insertNode(target, { kind: 'call', target: _drag.callTarget })
    else if (_drag.kind === 'ctrl') insertNode(target, { kind: _drag.ctrlKind })
    else if (_drag.kind === 'node') moveNodeToTarget(_drag.nodeId, target)
    _drag = null
  }

  const isOver = dropPos >= 0

  return (
    <div
      className={`lb-code-sublist${depth === 0 ? ' lb-code-sublist--root' : ''}${isOver ? ' lb-code-sublist--over' : ''}`}
      style={depth > 0 ? { '--nest': depth } as React.CSSProperties : undefined}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {branchLabel && <div className="lb-code-branch-lbl">{branchLabel}</div>}
      {nodes.length === 0 && !isOver && (
        <div className="lb-code-empty">drop here</div>
      )}
      {nodes.map((node, i) => (
        <div key={node.id} data-nid={node.id}>
          {dropPos === i && <div className="lb-code-bar" />}
          <CodeNode node={node} depth={depth} />
        </div>
      ))}
      {dropPos === nodes.length && <div className="lb-code-bar" />}
    </div>
  )
}

// ── CodeNode — renders a single node (recursive for repeat/if) ─

function CodeNode({ node, depth }: { node: ProgramNode; depth: number }) {
  const removeNode          = useGameStore((s) => s.removeNode)
  const updateRepeatTimes   = useGameStore((s) => s.updateRepeatTimes)
  const updateConditionType = useGameStore((s) => s.updateConditionType)
  const [collapsed, setCollapsed] = useState(false)

  const dragHandlers = {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      _drag = { kind: 'node', nodeId: node.id }
      e.dataTransfer.effectAllowed = 'copyMove'
      e.stopPropagation()
    },
    onDragEnd: () => { _drag = null },
  }

  if (node.type === 'action') {
    return (
      <div className="lb-code-line" {...dragHandlers}>
        <span className="lb-code-grab">⠿</span>
        <span className="lb-code-kw">{ACTION_KW[node.action]}</span>
        <button className="lb-code-del" onClick={() => removeNode(node.id)}>×</button>
      </div>
    )
  }

  if (node.type === 'call') {
    return (
      <div className="lb-code-line" {...dragHandlers}>
        <span className="lb-code-grab">⠿</span>
        <span className="lb-code-kw lb-code-kw--fn">{node.target}()</span>
        <button className="lb-code-del" onClick={() => removeNode(node.id)}>×</button>
      </div>
    )
  }

  if (node.type === 'repeat') {
    return (
      <div className="lb-code-block">
        <div className="lb-code-line lb-code-line--ctrl" {...dragHandlers}>
          <span className="lb-code-grab">⠿</span>
          <span className="lb-code-kw lb-code-kw--ctrl">↻ repeat</span>
          <input
            className="lb-code-times"
            type="number" min={1} max={9}
            value={node.times}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10)
              if (!isNaN(v) && v >= 1 && v <= 9) updateRepeatTimes(node.id, v)
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
          <button className="lb-code-del" onClick={() => removeNode(node.id)}>×</button>
        </div>
        <SubList
          nodes={node.body}
          makeTarget={(index) => ({ type: 'branch', parentId: node.id, branch: 'body', index })}
          depth={depth + 1}
        />
      </div>
    )
  }

  if (node.type === 'if') {
    const total = node.then.length + (node.else?.length ?? 0)
    return (
      <div className="lb-code-block">
        <div className="lb-code-line lb-code-line--ctrl" {...dragHandlers}>
          <span className="lb-code-grab">⠿</span>
          <button
            className="lb-code-collapse-btn"
            onClick={(e) => { e.stopPropagation(); setCollapsed((v) => !v) }}
            onMouseDown={(e) => e.stopPropagation()}
            title={collapsed ? '展开' : '折叠'}
          >{collapsed ? '▶' : '▼'}</button>
          <span className="lb-code-kw lb-code-kw--ctrl">? if</span>
          <select
            className="lb-code-cond"
            value={node.condition.type}
            onChange={(e) => updateConditionType(node.id, e.target.value as ConditionNode['type'])}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {COND_OPTS.map((k) => (
              <option key={k} value={k}>{COND_LABELS[k]}</option>
            ))}
          </select>
          {collapsed && total > 0 && <span className="lb-code-collapsed-badge">{total}</span>}
          <button className="lb-code-del" onClick={() => removeNode(node.id)}>×</button>
        </div>
        {!collapsed && <SubList
          nodes={node.then}
          makeTarget={(index) => ({ type: 'branch', parentId: node.id, branch: 'then', index })}
          depth={depth + 1}
          branchLabel="✓ then"
        />}
        {!collapsed && <SubList
          nodes={node.else ?? []}
          makeTarget={(index) => ({ type: 'branch', parentId: node.id, branch: 'else', index })}
          depth={depth + 1}
          branchLabel="✗ else"
        />}
      </div>
    )
  }

  return null
}

// ── CodeSection ─────────────────────────────────────────────

function CodeSection({ area, label }: { area: RootArea; label: string }) {
  const nodes = useGameStore((s) =>
    area === 'main' ? s.program.main : s.program.functions[area]
  )
  return (
    <div className="lb-code-section">
      <div className="lb-code-sec-hdr">{label}</div>
      <SubList
        nodes={nodes}
        makeTarget={(index) => ({ type: 'root', area, index })}
        depth={0}
      />
    </div>
  )
}

// ── CodeView ─────────────────────────────────────────────────

export function CodeView() {
  const appendNode      = useGameStore((s) => s.appendNode)
  const selectedTarget  = useGameStore((s) => s.selectedTarget)
  const availableBlocks = useGameStore((s) => s.level.availableBlocks)

  return (
    <div className="lb-code-view">
      <div className="lb-code-view-header">CODE</div>

      <div className="lb-code-chips">
        {CMD_CHIPS.map(({ action, kw }) => (
          <span key={action} className="lb-code-chip" draggable
            onDragStart={(e) => { _drag = { kind: 'cmd', action }; e.dataTransfer.effectAllowed = 'copy' }}
            onDragEnd={() => { _drag = null }}
            onClick={() => appendNode(selectedTarget, { kind: 'action', action })}
          >{kw}</span>
        ))}
        {CALL_CHIPS.filter(({ target }) => availableBlocks.includes(`${target}Call`)).map(({ target, kw }) => (
          <span key={target} className="lb-code-chip lb-code-chip--fn" draggable
            onDragStart={(e) => { _drag = { kind: 'call', callTarget: target }; e.dataTransfer.effectAllowed = 'copy' }}
            onDragEnd={() => { _drag = null }}
            onClick={() => appendNode(selectedTarget, { kind: 'call', target })}
          >{kw}</span>
        ))}
        {CTRL_CHIPS.map(({ ctrlKind, kw }) => (
          <span key={ctrlKind} className="lb-code-chip lb-code-chip--ctrl" draggable
            onDragStart={(e) => { _drag = { kind: 'ctrl', ctrlKind }; e.dataTransfer.effectAllowed = 'copy' }}
            onDragEnd={() => { _drag = null }}
            onClick={() => appendNode(selectedTarget, { kind: ctrlKind })}
          >{kw}</span>
        ))}
      </div>

      <div className="lb-code-sections">
        {AREAS.filter(({ area }) =>
          (area !== 'f1' || availableBlocks.includes('f1Call')) &&
          (area !== 'f2' || availableBlocks.includes('f2Call'))
        ).map(({ area, label }) => (
          <CodeSection key={area} area={area} label={label} />
        ))}
      </div>
    </div>
  )
}


