// 输出紧凑章节目录
import fs from 'fs'
import path from 'path'
const data = JSON.parse(fs.readFileSync(path.resolve('changelogs/atcoder-classify-input.json'), 'utf8'))
const lines = []
let curLevel = 0, curTopic = ''
for (const ch of data.chapterCatalog) {
  if (ch.level !== curLevel) { lines.push(`\n# Level ${ch.level}`); curLevel = ch.level; curTopic = '' }
  if (ch.topicTitle !== curTopic) { lines.push(`## ${ch.topicTitle}`); curTopic = ch.topicTitle }
  lines.push(`- ${ch.chapterId} ${ch.chapterTitle} [${ch.requiredCount}+${ch.optionalCount}]`)
}
fs.writeFileSync('changelogs/atcoder-classify-catalog.md', lines.join('\n'))
console.log('Wrote changelogs/atcoder-classify-catalog.md')
