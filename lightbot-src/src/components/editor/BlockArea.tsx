import { type DragEvent } from 'react'
import { useGameStore } from '../../features/game/game.store'
import type { ActionKind } from '../../domain/program/ast.types'
import type { BlockBlueprint } from '../../features/editor/editor.helpers'
import { lightbotSpriteManifest } from '../../features/renderer/scene/lightbot-sprite-manifest'
import { CmdBlock, TextCmdBlock, actionToIcon } from './cmd-sprites'

export const BLOCK_DRAG_KEY = 'application/x-lightbot-block'

const ACTION_PALETTE: Array<{ action: ActionKind; label: string }> = [
  { action: 'forward', label: '前进' },
  { action: 'left',    label: '左转' },
  { action: 'right',   label: '右转' },
  { action: 'pickup',  label: '捡起' },
  { action: 'jump',    label: '跳跃' },
]

const CALL_PALETTE: Array<{ target: 'f1' | 'f2'; label: string }> = [
  { target: 'f1', label: 'f1()' },
  { target: 'f2', label: 'f2()' },
]

const CTRL_PALETTE: Array<{ kind: 'repeat' | 'if'; symbol: string; label: string }> = [
  { kind: 'repeat', symbol: '↻', label: '循环' },
  { kind: 'if',     symbol: '?',  label: '条件' },
]

function startDrag(e: DragEvent, bp: BlockBlueprint) {
  e.dataTransfer.setData(BLOCK_DRAG_KEY, JSON.stringify(bp))
  e.dataTransfer.effectAllowed = 'copy'
}

export function BlockArea() {
  const appendNode     = useGameStore((state) => state.appendNode)
  const selectedTarget = useGameStore((state) => state.selectedTarget)
  const resetWorld     = useGameStore((state) => state.resetWorld)
  const runProgram     = useGameStore((state) => state.runProgram)
  const runStatus      = useGameStore((state) => state.runStatus)
  const availableBlocks = useGameStore((state) => state.level.availableBlocks)

  return (
    <div className="lb-block-area">
      <div className="lb-block-area-label">积木栏</div>
      <div className="lb-block-palette">
        {ACTION_PALETTE.map(({ action, label }) => (
          <CmdBlock key={action} iconAsset={actionToIcon(action)} label={label} sqSize={52}
            draggable onDragStart={(e) => startDrag(e, { kind: 'action', action })}
            onClick={() => appendNode(selectedTarget, { kind: 'action', action })} title={label} />
        ))}

        {CALL_PALETTE.filter(({ target }) => availableBlocks.includes(`${target}Call`)).map(({ target, label }) => (
          <CmdBlock key={target} iconAsset={lightbotSpriteManifest.ui.cmdCall} label={label} sqSize={52}
            draggable onDragStart={(e) => startDrag(e, { kind: 'call', target })}
            onClick={() => appendNode(selectedTarget, { kind: 'call', target })} title={label} />
        ))}

        {CTRL_PALETTE.map(({ kind, symbol, label }) => (
          <TextCmdBlock key={kind} symbol={symbol} label={label} sqSize={52} variant={kind}
            draggable onDragStart={(e) => startDrag(e, { kind })}
            onClick={() => appendNode(selectedTarget, { kind })} title={label} />
        ))}
      </div>

      {/* ── 右侧控制按钮 ── */}
      <div className="lb-block-area-controls">
        {/* 重置：蓝底 + 白叠层 + 刷新图标 */}
        <button
          className="lb-hex-btn"
          onClick={resetWorld}
          disabled={runStatus === 'running'}
          title="重置"
        >
          <span className="lb-hex-btn-inner">
            <img className="lb-hex-btn-bg" src="/extracted-assets/coding-game-swf/atlas-slices/components/component_54.png" alt="" aria-hidden="true" />
            <img className="lb-hex-btn-icon" src="/extracted-assets/coding-game-swf/atlas-slices/components/component_70.png" alt="重置" />
          </span>
        </button>
        {/* 运行 */}
        <button
          className="lb-hex-btn lb-hex-btn--run"
          onClick={() => void runProgram()}
          disabled={runStatus === 'running'}
          title="运行"
        >
          <img src="/extracted-assets/coding-game-swf/xml-slices/slices/093_playImg.png" alt="运行" />
        </button>
      </div>
    </div>
  )
}

