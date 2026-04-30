// 列出 cpp-3-1 和 cpp-3-2 的题单和 ac 率，用于人工复核
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../changelogs/course-level3-db-analysis.json'), 'utf-8'))
const pmap = new Map(data.problems.map(p => [p.problemId, p]))
for (const ch of data.chapterAnalysis) {
  if (!ch.chapterId) continue
  if (!(ch.chapterId.startsWith('cpp-3-1') || ch.chapterId.startsWith('cpp-3-2'))) continue
  console.log(`\n### ${ch.chapterId} ${ch.chapterTitle} (R${ch.problemCount}+O${ch.optionalCount}) avgAC=${ch.avgAcRate}`)
  for (const id of (ch.problemIds || [])) {
    const p = pmap.get(id)
    console.log(`  R ${id.padEnd(14)} ac=${String(p?.acRate ?? '-').padStart(5)} | ${p?.title || ''}`)
  }
  for (const id of (ch.optionalProblemIds || [])) {
    const p = pmap.get(id)
    console.log(`  O ${id.padEnd(14)} ac=${String(p?.acRate ?? '-').padStart(5)} | ${p?.title || ''}`)
  }
}
