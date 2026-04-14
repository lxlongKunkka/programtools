import { LIGHTBOT_LEVELS } from '../src/data/lightbotLevels.js'
import { formatOps, solveLevelProgram } from '../src/utils/lightbotSolver.js'

const results = []

for (const level of LIGHTBOT_LEVELS) {
  const result = solveLevelProgram(level)
  if (!result.solvable) {
    results.push({
      id: level.id,
      title: level.title,
      chapter: level.chapterTitle,
      solvable: false,
      reason: result.reason,
      rawSequence: result.rawSequence
    })
    continue
  }

  results.push({
    id: level.id,
    title: level.title,
    chapter: level.chapterTitle,
    solvable: true,
    rawLength: result.rawLength,
    mainLimit: level.mainLimit,
    p1Limit: level.procLimits.p1 || 0,
    main: result.main,
    p1: result.p1
  })
}

const grouped = results.reduce((map, result) => {
  if (!map.has(result.chapter)) {
    map.set(result.chapter, [])
  }
  map.get(result.chapter).push(result)
  return map
}, new Map())

let failed = 0
for (const [chapter, chapterResults] of grouped.entries()) {
  console.log(`\n=== ${chapter} ===`)
  for (const result of chapterResults) {
    if (!result.solvable) {
      failed += 1
      console.log(`✗ ${result.id} ${result.reason}`)
      if (result.rawSequence) {
        console.log(`  raw: ${formatOps(result.rawSequence)}`)
      }
      continue
    }

    console.log(`✓ ${result.id} raw=${result.rawLength} main=${result.main.length}/${result.mainLimit} p1=${result.p1.length}/${result.p1Limit}`)
    console.log(`  MAIN: ${formatOps(result.main)}`)
    if (result.p1.length) {
      console.log(`  P1:   ${formatOps(result.p1)}`)
    }
  }
}

console.log(`\nSummary: ${results.length - failed}/${results.length} levels solvable within current limits`)

if (failed) {
  process.exitCode = 1
}