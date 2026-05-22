import type { ActionKind, ConditionNode, ProgramDocument, ProgramNode } from '../../domain/program/ast.types'

export type RootArea = 'main' | 'f1' | 'f2'
export type BranchTarget =
  | { type: 'root'; area: RootArea }
  | { type: 'branch'; parentId: string; branch: 'body' | 'then' | 'else' }

export type InsertTarget =
  | { type: 'root'; area: RootArea; index: number }
  | { type: 'branch'; parentId: string; branch: 'body' | 'then' | 'else'; index: number }

export type BlockBlueprint =
  | { kind: 'action'; action: ActionKind }
  | { kind: 'repeat' }
  | { kind: 'if' }
  | { kind: 'call'; target: 'f1' | 'f2' }

let nextId = 1000

function createId(prefix: string) {
  nextId += 1
  return `${prefix}-${nextId}`
}

export const defaultBranchTarget: BranchTarget = { type: 'root', area: 'main' }

export const conditionOptions: ConditionNode['type'][] = [
  'front-clear',
  'front-has-coin',
  'on-coin',
  'coin-here',
  'front-higher',
  'front-lower',
]

export function createNode(blueprint: BlockBlueprint): ProgramNode {
  if (blueprint.kind === 'action') {
    return { id: createId(blueprint.action), type: 'action', action: blueprint.action }
  }

  if (blueprint.kind === 'repeat') {
    return {
      id: createId('repeat'),
      type: 'repeat',
      times: 2,
      body: [{ id: createId('repeat-forward'), type: 'action', action: 'forward' }],
    }
  }

  if (blueprint.kind === 'if') {
    return {
      id: createId('if'),
      type: 'if',
      condition: { type: 'front-clear' },
      then: [{ id: createId('if-then'), type: 'action', action: 'forward' }],
      else: [{ id: createId('if-else'), type: 'action', action: 'right' }],
    }
  }

  return { id: createId(`call-${blueprint.target}`), type: 'call', target: blueprint.target }
}

function mapNodes(nodes: ProgramNode[], updater: (node: ProgramNode) => ProgramNode): ProgramNode[] {
  return nodes.map((node) => {
    const updated = updater(node)

    if (updated.type === 'repeat') {
      return { ...updated, body: mapNodes(updated.body, updater) }
    }

    if (updated.type === 'if') {
      return {
        ...updated,
        then: mapNodes(updated.then, updater),
        else: updated.else ? mapNodes(updated.else, updater) : updated.else,
      }
    }

    return updated
  })
}

function transformNodes(
  nodes: ProgramNode[],
  matcher: (node: ProgramNode) => boolean,
  transform: (node: ProgramNode) => ProgramNode,
): ProgramNode[] {
  return nodes.map((node) => {
    const nextNode = matcher(node) ? transform(node) : node

    if (nextNode.type === 'repeat') {
      return { ...nextNode, body: transformNodes(nextNode.body, matcher, transform) }
    }

    if (nextNode.type === 'if') {
      return {
        ...nextNode,
        then: transformNodes(nextNode.then, matcher, transform),
        else: nextNode.else ? transformNodes(nextNode.else, matcher, transform) : nextNode.else,
      }
    }

    return nextNode
  })
}

function removeNodeDeep(nodes: ProgramNode[], nodeId: string): ProgramNode[] {
  return nodes
    .filter((node) => node.id !== nodeId)
    .map((node) => {
      if (node.type === 'repeat') {
        return { ...node, body: removeNodeDeep(node.body, nodeId) }
      }

      if (node.type === 'if') {
        return {
          ...node,
          then: removeNodeDeep(node.then, nodeId),
          else: node.else ? removeNodeDeep(node.else, nodeId) : node.else,
        }
      }

      return node
    })
}

function appendToRoot(program: ProgramDocument, area: RootArea, node: ProgramNode): ProgramDocument {
  if (area === 'main') {
    return { ...program, main: [...program.main, node] }
  }

  return {
    ...program,
    functions: {
      ...program.functions,
      [area]: [...program.functions[area], node],
    },
  }
}

function insertAtIndex(nodes: ProgramNode[], index: number, node: ProgramNode) {
  const next = [...nodes]
  const safeIndex = Math.max(0, Math.min(index, next.length))
  next.splice(safeIndex, 0, node)
  return next
}

function insertNodeAtTarget(program: ProgramDocument, target: InsertTarget, node: ProgramNode): ProgramDocument {
  if (target.type === 'root') {
    if (target.area === 'main') {
      return { ...program, main: insertAtIndex(program.main, target.index, node) }
    }

    return {
      ...program,
      functions: {
        ...program.functions,
        [target.area]: insertAtIndex(program.functions[target.area], target.index, node),
      },
    }
  }

  const insertBranch = (current: ProgramNode): ProgramNode => {
    if (current.id !== target.parentId) {
      return current
    }

    if (current.type === 'repeat' && target.branch === 'body') {
      return { ...current, body: insertAtIndex(current.body, target.index, node) }
    }

    if (current.type === 'if' && (target.branch === 'then' || target.branch === 'else')) {
      const existing = current[target.branch] ?? []
      return { ...current, [target.branch]: insertAtIndex(existing, target.index, node) }
    }

    return current
  }

  return {
    ...program,
    main: transformNodes(program.main, (candidate) => candidate.id === target.parentId, insertBranch),
    functions: {
      f1: transformNodes(program.functions.f1, (candidate) => candidate.id === target.parentId, insertBranch),
      f2: transformNodes(program.functions.f2, (candidate) => candidate.id === target.parentId, insertBranch),
    },
  }
}

export function insertNode(program: ProgramDocument, target: InsertTarget, blueprint: BlockBlueprint): ProgramDocument {
  return insertNodeAtTarget(program, target, createNode(blueprint))
}

function extractNodeFromList(nodes: ProgramNode[], nodeId: string): { nodes: ProgramNode[]; extracted: ProgramNode | null } {
  const index = nodes.findIndex((node) => node.id === nodeId)
  if (index >= 0) {
    const next = [...nodes]
    const [extracted] = next.splice(index, 1)
    return { nodes: next, extracted }
  }

  let extracted: ProgramNode | null = null
  const nextNodes = nodes.map((node) => {
    if (node.type === 'repeat') {
      const result = extractNodeFromList(node.body, nodeId)
      if (result.extracted) {
        extracted = result.extracted
        return { ...node, body: result.nodes }
      }
    }

    if (node.type === 'if') {
      const thenResult = extractNodeFromList(node.then, nodeId)
      if (thenResult.extracted) {
        extracted = thenResult.extracted
        return { ...node, then: thenResult.nodes }
      }

      const elseResult = extractNodeFromList(node.else ?? [], nodeId)
      if (elseResult.extracted) {
        extracted = elseResult.extracted
        return { ...node, else: elseResult.nodes }
      }
    }

    return node
  })

  return { nodes: nextNodes, extracted }
}

function extractNode(program: ProgramDocument, nodeId: string): { program: ProgramDocument; extracted: ProgramNode | null } {
  const mainResult = extractNodeFromList(program.main, nodeId)
  if (mainResult.extracted) {
    return { program: { ...program, main: mainResult.nodes }, extracted: mainResult.extracted }
  }

  const f1Result = extractNodeFromList(program.functions.f1, nodeId)
  if (f1Result.extracted) {
    return {
      program: { ...program, functions: { ...program.functions, f1: f1Result.nodes } },
      extracted: f1Result.extracted,
    }
  }

  const f2Result = extractNodeFromList(program.functions.f2, nodeId)
  if (f2Result.extracted) {
    return {
      program: { ...program, functions: { ...program.functions, f2: f2Result.nodes } },
      extracted: f2Result.extracted,
    }
  }

  return { program, extracted: null }
}

function findNode(nodes: ProgramNode[], nodeId: string): ProgramNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node
    }

    if (node.type === 'repeat') {
      const found = findNode(node.body, nodeId)
      if (found) {
        return found
      }
    }

    if (node.type === 'if') {
      const foundThen = findNode(node.then, nodeId)
      if (foundThen) {
        return foundThen
      }

      const foundElse = findNode(node.else ?? [], nodeId)
      if (foundElse) {
        return foundElse
      }
    }
  }

  return null
}

function nodeContainsId(node: ProgramNode, targetId: string): boolean {
  if (node.id === targetId) {
    return true
  }

  if (node.type === 'repeat') {
    return node.body.some((child) => nodeContainsId(child, targetId))
  }

  if (node.type === 'if') {
    return [...node.then, ...(node.else ?? [])].some((child) => nodeContainsId(child, targetId))
  }

  return false
}

function findNodeById(program: ProgramDocument, nodeId: string) {
  return findNode(program.main, nodeId) ?? findNode(program.functions.f1, nodeId) ?? findNode(program.functions.f2, nodeId)
}

export function appendNode(program: ProgramDocument, target: BranchTarget, blueprint: BlockBlueprint): ProgramDocument {
  const node = createNode(blueprint)
  if (target.type === 'root') {
    return appendToRoot(program, target.area, node)
  }

  const branchNode = findNodeById(program, target.parentId)
  const index = branchNode?.type === 'repeat' && target.branch === 'body'
    ? branchNode.body.length
    : branchNode?.type === 'if' && (target.branch === 'then' || target.branch === 'else')
      ? (branchNode[target.branch] ?? []).length
      : 0

  return insertNodeAtTarget(program, { ...target, index }, node)
}

export function moveNodeToTarget(program: ProgramDocument, nodeId: string, target: InsertTarget): ProgramDocument {
  const movingNode = findNodeById(program, nodeId)
  if (!movingNode) {
    return program
  }

  if (target.type === 'branch' && nodeContainsId(movingNode, target.parentId)) {
    return program
  }

  const extracted = extractNode(program, nodeId)
  if (!extracted.extracted) {
    return program
  }

  return insertNodeAtTarget(extracted.program, target, extracted.extracted)
}

export function removeNode(program: ProgramDocument, nodeId: string): ProgramDocument {
  return {
    ...program,
    main: removeNodeDeep(program.main, nodeId),
    functions: {
      f1: removeNodeDeep(program.functions.f1, nodeId),
      f2: removeNodeDeep(program.functions.f2, nodeId),
    },
  }
}

export function clearTarget(program: ProgramDocument, target: BranchTarget): ProgramDocument {
  if (target.type === 'root') {
    if (target.area === 'main') {
      return { ...program, main: [] }
    }

    return {
      ...program,
      functions: {
        ...program.functions,
        [target.area]: [],
      },
    }
  }

  const clearBranch = (node: ProgramNode): ProgramNode => {
    if (node.id !== target.parentId) {
      return node
    }

    if (node.type === 'repeat' && target.branch === 'body') {
      return { ...node, body: [] }
    }

    if (node.type === 'if' && (target.branch === 'then' || target.branch === 'else')) {
      return { ...node, [target.branch]: [] }
    }

    return node
  }

  return {
    ...program,
    main: transformNodes(program.main, (candidate) => candidate.id === target.parentId, clearBranch),
    functions: {
      f1: transformNodes(program.functions.f1, (candidate) => candidate.id === target.parentId, clearBranch),
      f2: transformNodes(program.functions.f2, (candidate) => candidate.id === target.parentId, clearBranch),
    },
  }
}

export function updateRepeatTimes(program: ProgramDocument, nodeId: string, times: number): ProgramDocument {
  const updater = (node: ProgramNode) => {
    if (node.id === nodeId && node.type === 'repeat') {
      return { ...node, times }
    }
    return node
  }

  return {
    ...program,
    main: mapNodes(program.main, updater),
    functions: {
      f1: mapNodes(program.functions.f1, updater),
      f2: mapNodes(program.functions.f2, updater),
    },
  }
}

export function updateConditionType(program: ProgramDocument, nodeId: string, conditionType: ConditionNode['type']): ProgramDocument {
  const updater = (node: ProgramNode) => {
    if (node.id === nodeId && node.type === 'if') {
      return { ...node, condition: { type: conditionType } }
    }
    return node
  }

  return {
    ...program,
    main: mapNodes(program.main, updater),
    functions: {
      f1: mapNodes(program.functions.f1, updater),
      f2: mapNodes(program.functions.f2, updater),
    },
  }
}

export function moveNode(program: ProgramDocument, nodeId: string, direction: 'up' | 'down'): ProgramDocument {
  const moveWithin = (nodes: ProgramNode[]): ProgramNode[] => {
    const index = nodes.findIndex((node) => node.id === nodeId)
    if (index === -1) {
      return nodes.map((node) => {
        if (node.type === 'repeat') {
          return { ...node, body: moveWithin(node.body) }
        }
        if (node.type === 'if') {
          return {
            ...node,
            then: moveWithin(node.then),
            else: node.else ? moveWithin(node.else) : node.else,
          }
        }
        return node
      })
    }

    const swapWith = direction === 'up' ? index - 1 : index + 1
    if (swapWith < 0 || swapWith >= nodes.length) {
      return nodes
    }

    const next = [...nodes]
    ;[next[index], next[swapWith]] = [next[swapWith], next[index]]
    return next
  }

  return {
    ...program,
    main: moveWithin(program.main),
    functions: {
      f1: moveWithin(program.functions.f1),
      f2: moveWithin(program.functions.f2),
    },
  }
}
