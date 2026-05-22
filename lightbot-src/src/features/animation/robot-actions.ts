import type { ExecutionEvent } from '../engine/engine.types'

export type RobotActionKind =
  | 'idle'
  | 'focus'
  | 'inspect'
  | 'move-forward'
  | 'jump-up'
  | 'jump-down'
  | 'turn-left'
  | 'turn-right'
  | 'light-cast'
  | 'fail'
  | 'celebrate'

export type RobotActionClip = {
  kind: RobotActionKind
  sourceEvent: ExecutionEvent['type']
  suggestedDurationMs: number
  emphasis: 'low' | 'medium' | 'high'
}

const defaultActionClip: RobotActionClip = {
  kind: 'idle',
  sourceEvent: 'cursor',
  suggestedDurationMs: 180,
  emphasis: 'low',
}

export function mapExecutionEventToRobotAction(event: ExecutionEvent): RobotActionClip {
  switch (event.type) {
    case 'cursor':
      return {
        kind: 'focus',
        sourceEvent: event.type,
        suggestedDurationMs: 140,
        emphasis: 'low',
      }
    case 'condition-check':
      return {
        kind: 'inspect',
        sourceEvent: event.type,
        suggestedDurationMs: 180,
        emphasis: 'medium',
      }
    case 'turn':
      return {
        kind: event.direction === 'E' || event.direction === 'S' ? 'turn-right' : 'turn-left',
        sourceEvent: event.type,
        suggestedDurationMs: 220,
        emphasis: 'medium',
      }
    case 'move':
      return {
        kind: 'move-forward',
        sourceEvent: event.type,
        suggestedDurationMs: 280,
        emphasis: 'medium',
      }
    case 'jump':
      return {
        kind: event.to.z > 0 ? 'jump-up' : 'jump-down',
        sourceEvent: event.type,
        suggestedDurationMs: 320,
        emphasis: 'high',
      }
    case 'pickup':
      return {
        kind: 'light-cast',
        sourceEvent: event.type,
        suggestedDurationMs: 250,
        emphasis: 'high',
      }
    case 'fail':
      return {
        kind: 'fail',
        sourceEvent: event.type,
        suggestedDurationMs: 320,
        emphasis: 'high',
      }
    case 'complete':
      return {
        kind: 'celebrate',
        sourceEvent: event.type,
        suggestedDurationMs: 420,
        emphasis: 'high',
      }
    default:
      return defaultActionClip
  }
}

export function createIdleRobotAction(): RobotActionClip {
  return defaultActionClip
}
