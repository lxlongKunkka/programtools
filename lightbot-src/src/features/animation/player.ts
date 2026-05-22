import type { ExecutionEvent } from '../engine/engine.types'

const EVENT_DURATION: Record<ExecutionEvent['type'], number> = {
  cursor: 120,
  'condition-check': 180,
  turn: 220,
  move: 320,
  jump: 420,
  pickup: 240,
  fail: 200,
  complete: 120,
}

export async function playExecutionEvents(
  events: ExecutionEvent[],
  speedMs: number,
  onEvent: (event: ExecutionEvent) => void,
) {
  for (const event of events) {
    onEvent(event)
    const base = EVENT_DURATION[event.type] ?? 200
    const delay = Math.max(120, Math.floor(base * (speedMs / 320)))
    await new Promise((resolve) => {
      window.setTimeout(resolve, delay)
    })
  }
}
