import { useGameStore } from '../../features/game/game.store'

export function ResetButton() {
  const resetWorld = useGameStore((state) => state.resetWorld)

  return (
    <button className="lb-button" onClick={resetWorld}>
      重置关卡
    </button>
  )
}
