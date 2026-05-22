import { type DragEvent } from 'react'
import type { SpriteAssetSpec } from '../../features/renderer/scene/lightbot-sprite-manifest'
import { lightbotSpriteManifest } from '../../features/renderer/scene/lightbot-sprite-manifest'
import { useSpriteAssetBackgroundStyle } from '../../features/renderer/scene/sprite-atlas-dom'
import type { ProgramNode } from '../../domain/program/ast.types'

export const CMD_NATIVE = 64
export const BTN_NATIVE_W = 112
export const BTN_NATIVE_H = 95

export function actionToIcon(action: string): SpriteAssetSpec {
  const m = lightbotSpriteManifest.ui
  switch (action) {
    case 'forward': return m.cmdForward
    case 'left':    return m.cmdTurnLeft
    case 'right':   return m.cmdTurnRight
    case 'pickup':  return m.cmdLight
    case 'jump':    return m.cmdJump
    default:        return m.cmdCall
  }
}

export function nodeToIcon(node: ProgramNode): SpriteAssetSpec {
  if (node.type === 'action') return actionToIcon(node.action)
  return lightbotSpriteManifest.ui.cmdCall
}

/** 单个积木块：commandSquare 底图 + cmd 图标叠加 */
export function CmdBlock({
  iconAsset,
  label,
  sqSize,
  active,
  onClick,
  title,
  draggable,
  onDragStart,
}: {
  iconAsset: SpriteAssetSpec
  label?: string
  sqSize: number
  active?: boolean
  onClick: () => void
  title?: string
  draggable?: boolean
  onDragStart?: (e: DragEvent<HTMLButtonElement>) => void
}) {
  const scale = sqSize / CMD_NATIVE
  const squareStyle = useSpriteAssetBackgroundStyle(lightbotSpriteManifest, lightbotSpriteManifest.ui.cmdSquare, scale)
  const iconStyle = useSpriteAssetBackgroundStyle(lightbotSpriteManifest, iconAsset, scale)

  return (
    <button
      className={`lb-cmd-block${label ? ' lb-cmd-block--labeled' : ''}${active ? ' lb-cmd-block--active' : ''}`}
      onClick={onClick}
      title={title}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      <span className="lb-cmd-wrap" style={{ width: sqSize, height: sqSize }}>
        {squareStyle && <span className="lb-cmd-sq-bg" style={squareStyle} aria-hidden />}
        {iconStyle && <span className="lb-cmd-icon" style={iconStyle} aria-hidden />}
      </span>
      {label && <span className="lb-cmd-label">{label}</span>}
    </button>
  )
}

/** 文字符号积木块——用于没有精灵图的控制指令（repeat / if） */
export function TextCmdBlock({
  symbol,
  label,
  sqSize,
  onClick,
  title,
  draggable,
  onDragStart,
  variant,
}: {
  symbol: string
  label?: string
  sqSize: number
  onClick: () => void
  title?: string
  draggable?: boolean
  onDragStart?: (e: DragEvent<HTMLButtonElement>) => void
  variant?: 'repeat' | 'if'
}) {
  const scale = sqSize / CMD_NATIVE
  const squareStyle = useSpriteAssetBackgroundStyle(lightbotSpriteManifest, lightbotSpriteManifest.ui.cmdSquare, scale)

  return (
    <button
      className={`lb-cmd-block${label ? ' lb-cmd-block--labeled' : ''} lb-cmd-block--ctrl${variant ? ` lb-cmd-block--${variant}` : ''}`}
      onClick={onClick}
      title={title}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      <span className="lb-cmd-wrap" style={{ width: sqSize, height: sqSize }}>
        {squareStyle && <span className="lb-cmd-sq-bg" style={squareStyle} aria-hidden />}
        <span className="lb-cmd-text-icon" aria-hidden>{symbol}</span>
      </span>
      {label && <span className="lb-cmd-label">{label}</span>}
    </button>
  )
}

/** 游戏风格按钮：baseButton01Image 底图 + 图标叠加 */
export function SpriteButton({
  iconAsset,
  scale = 0.55,
  disabled,
  onClick,
  title,
}: {
  iconAsset: SpriteAssetSpec
  scale?: number
  disabled?: boolean
  onClick: () => void
  title: string
}) {
  const w = Math.round(BTN_NATIVE_W * scale)
  const h = Math.round(BTN_NATIVE_H * scale)
  const baseStyle = useSpriteAssetBackgroundStyle(lightbotSpriteManifest, lightbotSpriteManifest.ui.btnBase, scale)
  const iconStyle = useSpriteAssetBackgroundStyle(lightbotSpriteManifest, iconAsset, scale)

  return (
    <button
      className="lb-sprite-btn"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{ width: w, height: h }}
    >
      <span className="lb-sprite-btn-wrap" style={{ width: w, height: h }}>
        {baseStyle && <span className="lb-sprite-btn-bg" style={baseStyle} aria-hidden />}
        {iconStyle && <span className="lb-sprite-btn-icon" style={iconStyle} aria-hidden />}
      </span>
    </button>
  )
}
