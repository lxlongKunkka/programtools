import type { ProgramDocument, ProgramNode } from '../../domain/program/ast.types'

export const emptyProgramDocument: ProgramDocument = {
  main: [],
  functions: { f1: [], f2: [] },
}

export const defaultProgramDocument: ProgramDocument = {
  main: [
    { id: 'main-1', type: 'action', action: 'forward' },
    { id: 'main-2', type: 'action', action: 'forward' },
    { id: 'main-3', type: 'action', action: 'pickup' },
    { id: 'main-4', type: 'action', action: 'forward' },
    { id: 'main-5', type: 'action', action: 'forward' },
    { id: 'main-6', type: 'action', action: 'pickup' }
  ],
  functions: {
    f1: [
      {
        id: 'f1-1',
        type: 'if',
        condition: { type: 'coin-here' },
        then: [{ id: 'f1-1-then', type: 'action', action: 'pickup' }],
        else: [{ id: 'f1-1-else', type: 'action', action: 'forward' }]
      }
    ],
    f2: []
  }
}

/** 递归统计程序中所有积木块数量（含 repeat/if 内部的嵌套块） */
export function countProgramNodes(program: ProgramDocument): number {
  const walk = (nodes: ProgramNode[]): number => {
    let n = 0
    for (const node of nodes) {
      n++
      if (node.type === 'repeat') n += walk(node.body)
      else if (node.type === 'if') {
        n += walk(node.then)
        n += walk(node.else ?? [])
      }
    }
    return n
  }
  return walk(program.main)
    + walk(program.functions?.f1 ?? [])
    + walk(program.functions?.f2 ?? [])
}

function formatCondition(type: string) {
  switch (type) {
    case 'front-clear':
      return '如果前方可走'
    case 'front-has-coin':
      return '如果前方有金币'
    case 'on-coin':
      return '如果站在金币上'
    case 'coin-here':
      return '如果金币未捡起'
    case 'front-higher':
      return '如果前方更高'
    case 'front-lower':
      return '如果前方更低'
    default:
      return '如果满足条件'
  }
}

export function describeProgram(program: ProgramDocument) {
  const lines: string[] = []

  const walk = (nodes: ProgramDocument['main'], indent = 0) => {
    for (const node of nodes) {
      const prefix = ' '.repeat(indent)
      if (node.type === 'action') {
        lines.push(prefix + node.action)
      }
      if (node.type === 'call') {
        lines.push(prefix + `call ${node.target}`)
      }
      if (node.type === 'repeat') {
        lines.push(prefix + `repeat ${node.times}`)
        walk(node.body, indent + 2)
      }
      if (node.type === 'if') {
        lines.push(prefix + formatCondition(node.condition.type))
        walk(node.then, indent + 2)
        if (node.else?.length) {
          lines.push(prefix + '否则')
          walk(node.else, indent + 2)
        }
      }
    }
  }

  lines.push('main')
  walk(program.main, 2)

  if (program.functions.f1.length) {
    lines.push('f1')
    walk(program.functions.f1, 2)
  }

  if (program.functions.f2.length) {
    lines.push('f2')
    walk(program.functions.f2, 2)
  }

  return lines
}
