export type ActionKind = 'forward' | 'left' | 'right' | 'pickup' | 'jump'

export type ConditionNode =
  | { type: 'front-clear' }
  | { type: 'front-has-coin' }
  | { type: 'on-coin' }
  | { type: 'coin-here' }
  | { type: 'front-higher' }
  | { type: 'front-lower' }

export type ProgramNode =
  | { id: string; type: 'action'; action: ActionKind }
  | { id: string; type: 'repeat'; times: number; body: ProgramNode[] }
  | { id: string; type: 'if'; condition: ConditionNode; then: ProgramNode[]; else?: ProgramNode[] }
  | { id: string; type: 'call'; target: 'f1' | 'f2' }

export type ProgramDocument = {
  main: ProgramNode[]
  functions: {
    f1: ProgramNode[]
    f2: ProgramNode[]
  }
}
