import { useGameStore } from '../../features/game/game.store'

export function HintPanel() {
  const level = useGameStore((state) => state.level)
  const lesson = useGameStore((state) => state.lesson)

  return (
    <section className="lb-panel">
      <p className="lb-panel-kicker">课程提示</p>
      <h2>{lesson.title}</h2>
      <p>{lesson.summary}</p>
      <ul className="lb-list">
        {lesson.concepts.map((concept) => (
          <li key={concept}>{concept}</li>
        ))}
      </ul>
      <hr className="lb-divider" />
      <ul className="lb-list">
        {level.hints?.map((hint) => (
          <li key={hint}>{hint}</li>
        ))}
      </ul>
    </section>
  )
}
