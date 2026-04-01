export function stripFreopenStatements(content) {
  if (!content) return ''

  const lines = String(content).split(/\r?\n/)
  const keptLines = []
  let skippingFreopen = false

  for (const line of lines) {
    if (!skippingFreopen && /\bfreopen\s*\(/.test(line)) {
      skippingFreopen = !/;/.test(line)
      continue
    }

    if (skippingFreopen) {
      if (/;/.test(line)) skippingFreopen = false
      continue
    }

    keptLines.push(line)
  }

  return keptLines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}