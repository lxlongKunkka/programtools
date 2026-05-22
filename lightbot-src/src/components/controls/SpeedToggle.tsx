import { useGameStore } from '../../features/game/game.store'

const SPEEDS = [220, 320, 480]

export function SpeedToggle() {
  const speedMs = useGameStore((state) => state.speedMs)
  const setSpeedMs = useGameStore((state) => state.setSpeedMs)

  return (
    <div className="lb-speed-toggle" role="group" aria-label="播放速度">
      {SPEEDS.map((speed) => (
        <button
          key={speed}
          className={speed === speedMs ? 'lb-chip lb-chip--active' : 'lb-chip'}
          onClick={() => setSpeedMs(speed)}
        >
          {speed === 220 ? '快' : speed === 320 ? '中' : '慢'}
        </button>
      ))}
    </div>
  )
}
