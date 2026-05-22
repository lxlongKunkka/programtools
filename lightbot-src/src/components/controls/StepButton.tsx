import { useGameStore } from '../../features/game/game.store'

export function StepButton() {
  const stepProgram = useGameStore((state) => state.stepProgram)
  const runStatus = useGameStore((state) => state.runStatus)

  return (
    <button className="lb-button" onClick={stepProgram} disabled={runStatus === 'running'}>
      单步执行
    </button>
  )
}
