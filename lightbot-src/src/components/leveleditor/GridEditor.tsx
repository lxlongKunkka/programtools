import { useRef } from 'react'
import { useLevelEditorStore } from '../../features/leveleditor/leveleditor.store'

const DIRECTION_ARROWS: Record<string, string> = { N: '↑', E: '→', S: '↓', W: '←' }

const HEIGHT_COLORS = [
  '#1e3a6e',
  '#25508e',
  '#2e6aad',
  '#3a85cc',
  '#4aa0e8',
]
const OBSTACLE_COLOR = '#1a3020'

export function GridEditor() {
  const cols = useLevelEditorStore((s) => s.cols)
  const rows = useLevelEditorStore((s) => s.rows)
  const grid = useLevelEditorStore((s) => s.grid)
  const robot = useLevelEditorStore((s) => s.robot)
  const clickCell = useLevelEditorStore((s) => s.clickCell)

  const isPainting = useRef(false)

  function handleMouseDown(x: number, y: number) {
    isPainting.current = true
    clickCell(x, y)
  }

  function handleMouseEnter(x: number, y: number) {
    if (isPainting.current) clickCell(x, y)
  }

  function handleMouseUp() {
    isPainting.current = false
  }

  return (
    <div
      className="lb-grid-editor-wrapper"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="lb-grid-editor"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 64px)`,
          gridTemplateRows: `repeat(${rows}, 64px)`,
        }}
      >
        {grid.map((row, y) =>
          row.map((cell, x) => {
            const isRobot = robot.x === x && robot.y === y
            const isVoid = cell.kind === 'void'
            const isCoin = cell.kind === 'coin'
            const isObstacle = cell.kind === 'obstacle'
            const isTrap = cell.kind === 'trap'
            const bgColor = isVoid ? '#0b1221' : isObstacle ? OBSTACLE_COLOR : isTrap ? '#3a1010' : (HEIGHT_COLORS[cell.height] ?? HEIGHT_COLORS[HEIGHT_COLORS.length - 1])
            return (
              <div
                key={`${x}-${y}`}
                className={`lb-grid-cell${isVoid ? ' lb-grid-cell--void' : ''}${isCoin ? ' lb-grid-cell--coin' : ''}${isObstacle ? ' lb-grid-cell--obstacle' : ''}${isTrap ? ' lb-grid-cell--trap' : ''}${isRobot ? ' lb-grid-cell--robot' : ''}`}
                style={{ backgroundColor: bgColor }}
                onMouseDown={() => handleMouseDown(x, y)}
                onMouseEnter={() => handleMouseEnter(x, y)}
                title={`(${x},${y}) h=${cell.height} ${cell.kind}`}
              >
                {!isVoid && cell.height > 0 && (
                  <span className="lb-grid-cell-height">{cell.height}</span>
                )}
                {isCoin && !isRobot && <span className="lb-grid-cell-coin">🪙</span>}
                {isObstacle && !isRobot && <span className="lb-grid-cell-tree">🌲</span>}
                {isTrap && !isRobot && <span className="lb-grid-cell-tree">⚠️</span>}
                {isRobot && (
                  <span className="lb-grid-cell-robot">{DIRECTION_ARROWS[robot.direction]}</span>
                )}
              </div>
            )
          })
        )}
      </div>
      <div className="lb-grid-editor-coords">
        {Array.from({ length: cols }, (_, x) => (
          <span key={x} className="lb-grid-coord-label">{x}</span>
        ))}
      </div>
    </div>
  )
}
