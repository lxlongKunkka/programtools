import { useGameStore } from '../../features/game/game.store'

function formatConditionName(type: string) {
  switch (type) {
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
      return type
  }
}

export function DebugPanel() {
  const world = useGameStore((state) => state.world)
  const runStatus = useGameStore((state) => state.runStatus)
  const executionLog = useGameStore((state) => state.executionLog)
  const eventIndex = useGameStore((state) => state.eventIndex)

  return (
    <section className="lb-panel lb-panel--debug">
      <p className="lb-panel-kicker">运行反馈</p>
      <h2>执行日志</h2>
      <div className="lb-status-row">
        <span className="lb-status">状态: {runStatus}</span>
        <span className="lb-status">已收集: {world.collectedCoins.length}</span>
      </div>
      <div className="lb-log-list">
        {executionLog.length === 0 ? (
          <p className="lb-muted">点击“运行程序”后，这里会展示执行事件。</p>
        ) : (
          executionLog.map((event, index) => {
            const label = event.type === 'condition-check'
              ? `条件判断: ${formatConditionName(event.condition)} => ${event.result ? '真' : '假'}`
              : event.type === 'fail'
                ? `失败: ${event.reason}`
                : event.type === 'cursor'
                  ? `高亮积木: ${event.blockId}`
                  : event.type === 'pickup'
                    ? `捡起金币: ${event.tileKey}`
                    : event.type === 'turn'
                      ? `转向: ${event.direction}`
                      : event.type === 'move' || event.type === 'jump'
                        ? `${event.type === 'move' ? '移动' : '跳跃'}到 (${event.to.x}, ${event.to.y}, ${event.to.z})`
                        : '完成关卡'

            return (
              <div key={`${event.type}-${index}`} className={index === Math.max(0, eventIndex - 1) ? 'lb-log-item lb-log-item--active' : 'lb-log-item'}>
                {label}
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
