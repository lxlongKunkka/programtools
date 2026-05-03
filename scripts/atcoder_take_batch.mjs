// 工具：从大输入 json 取一个批次输出小 json 给主对话读
import fs from 'fs'
import path from 'path'
const ROOT = path.resolve(process.cwd(), 'changelogs')
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'atcoder-classify-input.json'), 'utf8'))
const args = Object.fromEntries(process.argv.slice(2).map(a => a.split('=')))
const start = Number(args['--start'] ?? 0)
const size = Number(args['--size'] ?? 30)
const onlyUnassigned = args['--only-unassigned'] !== 'false'

const list = onlyUnassigned ? data.problems.filter(p => p.currentChapters.length === 0) : data.problems
const slice = list.slice(start, start + size)
const out = {
  totalUnassigned: list.length,
  start, size,
  batch: slice.map(p => ({
    pid: p.pid, title: p.title, tags: p.tags.slice(0, 6),
    ac: p.ac, ns: p.ns,
    contentSnippet: p.contentSnippet
  }))
}
const fname = `atcoder-batch-${start}-${start+size}.json`
fs.writeFileSync(path.join(ROOT, fname), JSON.stringify(out, null, 2))
console.log(`Wrote ${slice.length} items to changelogs/${fname} (totalUnassigned=${list.length})`)
