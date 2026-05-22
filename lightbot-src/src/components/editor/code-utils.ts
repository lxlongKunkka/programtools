import type { ActionKind, ProgramDocument, ProgramNode } from '../../domain/program/ast.types'

// ── Serialize ───────────────────────────────────────────────

function actionToKeyword(action: ActionKind): string {
  switch (action) {
    case 'forward': return 'forward'
    case 'left':    return 'turnLeft'
    case 'right':   return 'turnRight'
    case 'pickup':  return 'pickup'
    case 'jump':    return 'jump'
  }
}

function nodeToLine(node: ProgramNode, depth = 0): string {
  const pad = '  '.repeat(depth)
  if (node.type === 'action') return pad + actionToKeyword(node.action)
  if (node.type === 'call') return `${pad}${node.target}()`
  if (node.type === 'repeat') {
    const inner = node.body.map((n) => nodeToLine(n, depth + 1)).join('\n')
    return `${pad}repeat(${node.times}):\n${inner}`
  }
  if (node.type === 'if') {
    const thenLines = node.then.map((n) => nodeToLine(n, depth + 1)).join('\n')
    let code = `${pad}if ${node.condition.type}:\n${thenLines}`
    if (node.else?.length) {
      const elseLines = node.else.map((n) => nodeToLine(n, depth + 1)).join('\n')
      code += `\n${pad}else:\n${elseLines}`
    }
    return code
  }
  return ''
}

function sectionCode(nodes: ProgramNode[]): string {
  return nodes.map((n) => nodeToLine(n, 1)).join('\n')
}

export function programToCode(program: ProgramDocument): string {
  const parts: string[] = []

  parts.push('main:')
  const mainCode = sectionCode(program.main)
  if (mainCode) parts.push(mainCode)

  parts.push('')
  parts.push('f1:')
  const f1Code = sectionCode(program.functions.f1)
  if (f1Code) parts.push(f1Code)

  parts.push('')
  parts.push('f2:')
  const f2Code = sectionCode(program.functions.f2)
  if (f2Code) parts.push(f2Code)

  return parts.join('\n')
}

// ── Parse ───────────────────────────────────────────────────

function keywordToAction(kw: string): ActionKind | null {
  switch (kw.toLowerCase()) {
    case 'forward': case 'fd': case 'fwd': return 'forward'
    case 'left': case 'turnleft': case 'tl': return 'left'
    case 'right': case 'turnright': case 'tr': return 'right'
    case 'pickup': case 'get': case 'collect': return 'pickup'
    case 'jump': case 'jp': return 'jump'
    default: return null
  }
}

let _pid = 8000

export function codeToProgram(code: string): ProgramDocument | null {
  try {
    let currentArea: 'main' | 'f1' | 'f2' = 'main'
    const sections: { main: ProgramNode[]; f1: ProgramNode[]; f2: ProgramNode[] } = {
      main: [], f1: [], f2: [],
    }

    for (const rawLine of code.split('\n')) {
      const line = rawLine.trim()
      if (!line || line.startsWith('//') || line.startsWith('#')) continue

      if (line === 'main:') { currentArea = 'main'; continue }
      if (line === 'f1:')   { currentArea = 'f1';   continue }
      if (line === 'f2:')   { currentArea = 'f2';   continue }

      if (line === 'f1()' || line === 'f1') {
        sections[currentArea].push({ id: `cp-call-f1-${++_pid}`, type: 'call', target: 'f1' })
        continue
      }
      if (line === 'f2()' || line === 'f2') {
        sections[currentArea].push({ id: `cp-call-f2-${++_pid}`, type: 'call', target: 'f2' })
        continue
      }

      // skip block constructs (repeat/if) — only flat action lines parsed for now
      if (line.startsWith('repeat') || line.startsWith('if ') || line.startsWith('else')) continue

      const action = keywordToAction(line)
      if (action) {
        sections[currentArea].push({ id: `cp-${action}-${++_pid}`, type: 'action', action })
      }
    }

    return { main: sections.main, functions: { f1: sections.f1, f2: sections.f2 } }
  } catch {
    return null
  }
}
