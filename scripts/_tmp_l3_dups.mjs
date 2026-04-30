import fs from 'fs'
const d = JSON.parse(fs.readFileSync('changelogs/course-level3-db-analysis.json','utf-8'))
const cnt = new Map()
for (const ch of d.chapterAnalysis) {
  for (const id of (ch.problemIds||[])) {
    if (!cnt.has(id)) cnt.set(id, [])
    cnt.get(id).push(ch.chapterId+':R')
  }
  for (const id of (ch.optionalProblemIds||[])) {
    if (!cnt.has(id)) cnt.set(id, [])
    cnt.get(id).push(ch.chapterId+':O')
  }
}
for (const [k,v] of cnt) if (v.length > 1) console.log(k, v.join(', '))
