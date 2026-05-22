import clsx from 'clsx'
import { useState, type DragEvent } from 'react'
import type { BlockBlueprint, BranchTarget, InsertTarget, RootArea } from '../../features/editor/editor.helpers'
import { conditionOptions } from '../../features/editor/editor.helpers'
import { useGameStore } from '../../features/game/game.store'
import type { ConditionNode, ProgramNode } from '../../domain/program/ast.types'

const DRAG_PAYLOAD_KEY = 'application/x-lightbot-payload'
let dragPayloadFallback: DragPayload | null = null

const actionBlueprints: BlockBlueprint[] = [
  { kind: 'action', action: 'forward' },
  { kind: 'action', action: 'left' },
  { kind: 'action', action: 'right' },
  { kind: 'action', action: 'pickup' },
  { kind: 'action', action: 'jump' },
  { kind: 'repeat' },
  { kind: 'if' },
  { kind: 'call', target: 'f1' },
  { kind: 'call', target: 'f2' },
]

function blueprintTone(blueprint: BlockBlueprint) {
  if (blueprint.kind === 'action') {
    return blueprint.action
  }

  if (blueprint.kind === 'call') {
    return 'call'
  }

  return blueprint.kind
}

function blockIcon(blueprint: BlockBlueprint | ProgramNode) {
  if ('action' in blueprint && ((('kind' in blueprint) && blueprint.kind === 'action') || (('type' in blueprint) && blueprint.type === 'action'))) {
    switch (blueprint.action) {
      case 'forward':
        return '↑'
      case 'left':
        return '↺'
      case 'right':
        return '↻'
      case 'pickup':
        return '★'
      case 'jump':
        return '⤴'
    }
  }

  const kind = 'kind' in blueprint ? blueprint.kind : blueprint.type
  if (kind === 'repeat') {
    return '⟲'
  }
  if (kind === 'if') {
    return '◇'
  }
  return 'ƒ'
}

function blueprintDescription(blueprint: BlockBlueprint) {
  if (blueprint.kind === 'action') {
    switch (blueprint.action) {
      case 'forward':
        return '向前走一步，适合同高度平地。'
      case 'left':
        return '原地向左转，方便调整朝向。'
      case 'right':
        return '原地向右转，为下一步寻路。'
      case 'pickup':
        return '捡起脚下金币，是关卡目标动作。'
      case 'jump':
        return '跨到前方更高一格，或向下落到低处。'
    }
  }

  if (blueprint.kind === 'repeat') {
    return '把一组动作重复执行，减少重复搭积木。'
  }

  if (blueprint.kind === 'if') {
    return '根据前方或脚下状态分支执行不同动作。'
  }

  return blueprint.target === 'f1'
    ? '调用函数 F1，把常用动作包成子程序。'
    : '调用函数 F2，组合更复杂的策略。'
}

function blueprintLabel(blueprint: BlockBlueprint) {
  if (blueprint.kind === 'action') {
    return blueprint.action
  }
  if (blueprint.kind === 'call') {
    return `call ${blueprint.target}`
  }
  return blueprint.kind
}

function conditionLabel(condition: ConditionNode['type']) {
  switch (condition) {
    case 'front-clear':
      return '前方可走'
    case 'front-has-coin':
      return '前方有金币'
    case 'on-coin':
      return '站在金币上'
    case 'coin-here':
      return '金币未捡起'
    case 'front-higher':
      return '前方更高'
    case 'front-lower':
      return '前方更低'
    default:
      return condition
  }
}

function targetLabel(target: BranchTarget) {
  if (target.type === 'root') {
    return target.area === 'main' ? '主程序' : target.area.toUpperCase()
  }

  return `${target.parentId} / ${target.branch}`
}

type DragPayload =
  | { kind: 'blueprint'; blueprint: BlockBlueprint }
  | { kind: 'node'; nodeId: string }

function isBlockBlueprint(value: unknown): value is BlockBlueprint {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<BlockBlueprint>
  if (candidate.kind === 'repeat' || candidate.kind === 'if') {
    return true
  }
  if (candidate.kind === 'action') {
    return typeof candidate.action === 'string'
  }
  if (candidate.kind === 'call') {
    return candidate.target === 'f1' || candidate.target === 'f2'
  }

  return false
}

function isDragPayload(value: unknown): value is DragPayload {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<DragPayload>
  if (candidate.kind === 'node') {
    return typeof candidate.nodeId === 'string'
  }

  if (candidate.kind === 'blueprint') {
    return isBlockBlueprint(candidate.blueprint)
  }

  return false
}

function readDragPayload(event: DragEvent<HTMLElement>) {
  const raw = event.dataTransfer.getData(DRAG_PAYLOAD_KEY)
  if (!raw) {
    return dragPayloadFallback
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    return isDragPayload(parsed) ? parsed : dragPayloadFallback
  } catch {
    return dragPayloadFallback
  }
}

function writeDragPayload(event: DragEvent<HTMLElement>, payload: DragPayload) {
  dragPayloadFallback = payload
  event.dataTransfer.effectAllowed = payload.kind === 'blueprint' ? 'copy' : 'move'
  event.dataTransfer.setData(DRAG_PAYLOAD_KEY, JSON.stringify(payload))
}

function clearDragPayload() {
  dragPayloadFallback = null
}

function toBranchTarget(target: InsertTarget): BranchTarget {
  if (target.type === 'root') {
    return { type: 'root', area: target.area }
  }

  return { type: 'branch', parentId: target.parentId, branch: target.branch }
}

function useInsertDropTarget(target: InsertTarget) {
  const appendNode = useGameStore((state) => state.appendNode)
  const insertNode = useGameStore((state) => state.insertNode)
  const moveNodeToTarget = useGameStore((state) => state.moveNodeToTarget)
  const setSelectedTarget = useGameStore((state) => state.setSelectedTarget)
  const [isDragOver, setIsDragOver] = useState(false)

  const onDragOver = (event: DragEvent<HTMLElement>) => {
    if (!event.dataTransfer.types.includes(DRAG_PAYLOAD_KEY) && !dragPayloadFallback) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    if (!isDragOver) {
      setIsDragOver(true)
    }
  }

  const onDragLeave = () => {
    setIsDragOver(false)
  }

  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    setIsDragOver(false)
    const payload = readDragPayload(event)
    if (!payload) {
      return
    }

    const selectedTarget = toBranchTarget(target)
    setSelectedTarget(selectedTarget)

    if (payload.kind === 'blueprint') {
      if (target.index >= 0) {
        insertNode(target, payload.blueprint)
      } else {
        appendNode(selectedTarget, payload.blueprint)
      }
      return
    }

    moveNodeToTarget(payload.nodeId, target)
  }

  return {
    isDragOver,
    dropProps: {
      onDragOver,
      onDragLeave,
      onDrop,
    },
  }
}

function DropSlot({ target, compact = false }: { target: InsertTarget; compact?: boolean }) {
  const dropTarget = useInsertDropTarget(target)

  return (
    <div
      className={clsx('lb-drop-slot', {
        'lb-drop-slot--active': dropTarget.isDragOver,
        'lb-drop-slot--compact': compact,
      })}
      {...dropTarget.dropProps}
    >
      拖到这里
    </div>
  )
}

function AreaHeader({ area, title }: { area: RootArea; title: string }) {
  const selectedTarget = useGameStore((state) => state.selectedTarget)
  const setSelectedTarget = useGameStore((state) => state.setSelectedTarget)
  const clearSelectedTarget = useGameStore((state) => state.clearSelectedTarget)

  const isActive = selectedTarget.type === 'root' && selectedTarget.area === area

  return (
    <div className="lb-editor-area-header">
      <button
        className={clsx('lb-editor-area-button', { 'lb-editor-area-button--active': isActive })}
        onClick={() => setSelectedTarget({ type: 'root', area })}
      >
        {title}
      </button>
      <button className="lb-icon-button" onClick={() => clearSelectedTarget()} title="清空当前区域">
        清空
      </button>
    </div>
  )
}

function BranchEditor({ parentId, branch, nodes, title }: { parentId: string; branch: 'body' | 'then' | 'else'; nodes: ProgramNode[]; title: string }) {
  const selectedTarget = useGameStore((state) => state.selectedTarget)
  const setSelectedTarget = useGameStore((state) => state.setSelectedTarget)
  const clearSelectedTarget = useGameStore((state) => state.clearSelectedTarget)

  const isActive = selectedTarget.type === 'branch' && selectedTarget.parentId === parentId && selectedTarget.branch === branch

  return (
    <div className={clsx('lb-branch', { 'lb-branch--active': isActive })}>
      <div className="lb-branch-header">
        <button className="lb-branch-button" onClick={() => setSelectedTarget({ type: 'branch', parentId, branch })}>
          {title}
        </button>
        <button className="lb-icon-button" onClick={() => clearSelectedTarget({ type: 'branch', parentId, branch })}>
          清空
        </button>
      </div>
      <NodeList nodes={nodes} target={{ type: 'branch', parentId, branch }} emptyHint="把工具箱积木拖进这个分支，或拖动已有积木来重排。" />
    </div>
  )
}

function NodeCard({ node }: { node: ProgramNode }) {
  const activeBlockId = useGameStore((state) => state.world.activeBlockId)
  const removeNode = useGameStore((state) => state.removeNode)
  const moveNode = useGameStore((state) => state.moveNode)
  const updateRepeatTimes = useGameStore((state) => state.updateRepeatTimes)
  const updateConditionType = useGameStore((state) => state.updateConditionType)

  const handleDragStart = (event: DragEvent<HTMLElement>) => {
    writeDragPayload(event, { kind: 'node', nodeId: node.id })
  }

  return (
    <div
      className={clsx(
        'lb-node-card',
        `lb-node-card--${node.type === 'action' ? node.action : node.type === 'call' ? 'call' : node.type}`,
        { 'lb-node-card--active': activeBlockId === node.id },
      )}
      draggable
      onDragStart={handleDragStart}
      onDragStartCapture={handleDragStart}
      onDragEnd={clearDragPayload}
    >
      <div className="lb-node-toolbar">
        <div>
          <div className="lb-node-chip-row">
            <span className="lb-drag-handle" draggable onDragStart={handleDragStart} onDragEnd={clearDragPayload}>
              拖动
            </span>
          </div>
          <div className="lb-node-title-row">
            <span className="lb-node-icon">{blockIcon(node)}</span>
            <strong>{node.type === 'action' ? node.action : node.type === 'call' ? `call ${node.target}` : node.type}</strong>
          </div>
          <div className="lb-node-id">{node.id}</div>
        </div>
        <div className="lb-node-actions">
          <button className="lb-icon-button" onClick={() => moveNode(node.id, 'up')}>↑</button>
          <button className="lb-icon-button" onClick={() => moveNode(node.id, 'down')}>↓</button>
          <button className="lb-icon-button lb-icon-button--danger" onClick={() => removeNode(node.id)}>删除</button>
        </div>
      </div>

      {node.type === 'repeat' && (
        <label className="lb-inline-field">
          次数
          <input
            type="number"
            min={2}
            max={8}
            value={node.times}
            onChange={(event) => updateRepeatTimes(node.id, Number(event.target.value) || 2)}
          />
        </label>
      )}

      {node.type === 'if' && (
        <label className="lb-inline-field">
          条件
          <select value={node.condition.type} onChange={(event) => updateConditionType(node.id, event.target.value as ConditionNode['type'])}>
            {conditionOptions.map((condition) => (
              <option key={condition} value={condition}>
                {conditionLabel(condition)}
              </option>
            ))}
          </select>
        </label>
      )}

      {node.type === 'repeat' && <BranchEditor parentId={node.id} branch="body" nodes={node.body} title="循环体" />}
      {node.type === 'if' && (
        <div className="lb-conditional-grid">
          <BranchEditor parentId={node.id} branch="then" nodes={node.then} title="如果成立" />
          <BranchEditor parentId={node.id} branch="else" nodes={node.else ?? []} title="否则" />
        </div>
      )}
    </div>
  )
}

function NodeList({ nodes, target, emptyHint }: { nodes: ProgramNode[]; target: BranchTarget; emptyHint?: string }) {
  const createInsertTarget = (index: number): InsertTarget =>
    target.type === 'root'
      ? { type: 'root', area: target.area, index }
      : { type: 'branch', parentId: target.parentId, branch: target.branch, index }

  if (nodes.length === 0) {
    return (
      <div className="lb-empty-slot">
        <DropSlot target={createInsertTarget(0)} />
        <span>{emptyHint ?? '点击工具箱，把动作或条件添加到这里。'}</span>
      </div>
    )
  }

  return (
    <div className="lb-node-list">
      {nodes.map((node, index) => (
        <div key={node.id} className="lb-node-stack">
          <DropSlot target={createInsertTarget(index)} compact />
          <NodeCard node={node} />
        </div>
      ))}
      <DropSlot target={createInsertTarget(nodes.length)} compact />
    </div>
  )
}

function Toolbox() {
  const selectedTarget = useGameStore((state) => state.selectedTarget)
  const appendNode = useGameStore((state) => state.appendNode)
  const [preview, setPreview] = useState<BlockBlueprint | null>(actionBlueprints[0])

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, blueprint: BlockBlueprint) => {
    writeDragPayload(event, { kind: 'blueprint', blueprint })
  }

  return (
    <section className="lb-panel">
      <p className="lb-panel-kicker">工具箱</p>
      <h2>添加积木</h2>
      <p className="lb-muted">当前添加目标：{targetLabel(selectedTarget)}。你可以点击添加，也可以直接把积木拖到主程序、函数区或条件分支里；已经放好的积木也能继续拖动重排。</p>
      <div className={clsx('lb-block-preview', preview && `lb-block-preview--${blueprintTone(preview)}`)}>
        {preview && (
          <>
            <span className="lb-block-preview-icon">{blockIcon(preview)}</span>
            <div>
              <strong>{blueprintLabel(preview)}</strong>
              <p>{blueprintDescription(preview)}</p>
            </div>
          </>
        )}
      </div>
      <div className="lb-toolbox-grid">
        {actionBlueprints.map((blueprint) => (
          <button
            key={blueprintLabel(blueprint)}
            className={clsx('lb-toolbox-button', `lb-toolbox-button--${blueprintTone(blueprint)}`)}
            draggable
            onDragStart={(event) => handleDragStart(event, blueprint)}
            onDragEnd={clearDragPayload}
            onMouseEnter={() => setPreview(blueprint)}
            onFocus={() => setPreview(blueprint)}
            onClick={() => appendNode(selectedTarget, blueprint)}
          >
            <span className="lb-toolbox-button-icon">{blockIcon(blueprint)}</span>
            {blueprintLabel(blueprint)}
          </button>
        ))}
      </div>
    </section>
  )
}

export function ProgramEditor() {
  const program = useGameStore((state) => state.program)

  return (
    <section className="lb-editor-stack">
      <section className="lb-panel">
        <p className="lb-panel-kicker">积木编辑器</p>
        <h2>点击或拖拽式程序编排</h2>
        <p className="lb-muted">你现在既可以先选中目标区域后点击添加，也可以直接拖入工具箱积木，或拖动已有积木在主程序、函数和条件分支之间重排。</p>
        <div className="lb-editor-grid">
          <div className="lb-editor-area">
            <AreaHeader area="main" title="主程序" />
            <NodeList nodes={program.main} target={{ type: 'root', area: 'main' }} emptyHint="把工具箱里的积木拖到主程序，或把已有积木拖到任意插槽。" />
          </div>
          <div className="lb-editor-area">
            <AreaHeader area="f1" title="函数 F1" />
            <NodeList nodes={program.functions.f1} target={{ type: 'root', area: 'f1' }} emptyHint="拖入这里，给 F1 编写可复用的动作组合。" />
          </div>
          <div className="lb-editor-area">
            <AreaHeader area="f2" title="函数 F2" />
            <NodeList nodes={program.functions.f2} target={{ type: 'root', area: 'f2' }} emptyHint="拖入这里，给 F2 编写更高级的子程序。" />
          </div>
        </div>
      </section>
      <Toolbox />
    </section>
  )
}
