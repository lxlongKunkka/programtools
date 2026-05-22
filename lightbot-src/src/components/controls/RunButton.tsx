import { useGameStore } from '../../features/game/game.store'
import { lightbotSpriteManifest } from '../../features/renderer/scene/lightbot-sprite-manifest'
import { useSpriteAssetBackgroundStyle } from '../../features/renderer/scene/sprite-atlas-dom'

export function RunButton() {
  const runProgram = useGameStore((state) => state.runProgram)
  const runStatus = useGameStore((state) => state.runStatus)
  const playIconStyle = useSpriteAssetBackgroundStyle(lightbotSpriteManifest, lightbotSpriteManifest.ui.buttonPlay, 0.46)

  return (
    <button className="lb-button lb-button--primary" onClick={() => void runProgram()} disabled={runStatus === 'running'}>
      {playIconStyle && <span className="lb-button-sprite-icon" style={playIconStyle} aria-hidden="true" />}
      {runStatus === 'running' ? '运行中...' : '运行程序'}
    </button>
  )
}
