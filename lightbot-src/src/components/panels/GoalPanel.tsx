import { useGameStore } from '../../features/game/game.store'

export function GoalPanel() {
  const level = useGameStore((state) => state.level)

  return (
    <section className="lb-panel">
      <p className="lb-panel-kicker">关卡目标</p>
      <h2>{level.title}</h2>
      <p>{level.teachingGoal}</p>
      <dl className="lb-meta-grid">
        <div>
          <dt>推荐步数</dt>
          <dd>{level.constraints?.recommendedSteps ?? '-'}</dd>
        </div>
        <div>
          <dt>最大主程序</dt>
          <dd>{level.constraints?.maxMainBlocks ?? '-'}</dd>
        </div>
        <div>
          <dt>函数槽位</dt>
          <dd>{level.constraints?.maxFunctions ?? '-'}</dd>
        </div>
      </dl>
      <div className="lb-chip-list">
        {level.availableBlocks.map((block) => (
          <span key={block} className="lb-chip">{block}</span>
        ))}
      </div>
    </section>
  )
}
