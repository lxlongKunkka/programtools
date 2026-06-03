/**
 * 导出 Hydro gesp4-gesp8 域中所有作业(docType=60)和比赛(docType=30)及其题目
 * 用法：node scripts/dump_gesp_domain_contests.mjs [--domains=gesp4,gesp5,gesp6,gesp7,gesp8]
 */
import mongoose from 'mongoose'
import path from 'path'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envLines = readFileSync(path.join(__dirname, '../server/.env'), 'utf8').split('\n')
for (const line of envLines) {
  const m = line.match(/^([^=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const HYDRO_URI = process.env.HYDRO_MONGODB_URI
const BASE_URL = 'https://acjudge.com'

const domainsArg = process.argv.find(a => a.startsWith('--domains='))
const TARGET_DOMAINS = domainsArg
  ? domainsArg.replace('--domains=', '').split(',')
  : ['gesp4', 'gesp5', 'gesp6', 'gesp7', 'gesp8']

const DOCTYPE_HOMEWORK = 60
const DOCTYPE_CONTEST  = 30

const conn = await mongoose.createConnection(HYDRO_URI).asPromise()
const col = conn.db.collection('document')

const lines = []
lines.push(`# GESP 域作业与比赛题目清单`)
lines.push('')
lines.push(`> 域：${TARGET_DOMAINS.join(', ')}　生成时间：${new Date().toLocaleDateString('zh-CN')}`)
lines.push('')

for (const domainId of TARGET_DOMAINS) {
  // 在 Hydro 中作业(rule='homework')和比赛都是 docType=30
  const contests = await col
    .find({ domainId, docType: DOCTYPE_CONTEST })
    .sort({ docId: 1 })
    .toArray()

  if (!contests.length) {
    lines.push(`## ${domainId}`)
    lines.push('')
    lines.push('> 暂无作业或比赛。')
    lines.push('')
    continue
  }

  // 收集所有 pids 批量查标题
  const allPids = new Set()
  for (const c of contests) {
    for (const pid of c.pids || []) allPids.add(String(pid))
  }

  // pids 为数字 → 同 domain 下的题目 docId
  const docIdSet = new Set()
  for (const pid of allPids) {
    const n = Number(pid)
    if (!isNaN(n)) docIdSet.add(n)
  }
  const problemDocs = await col
    .find({ domainId, docId: { $in: [...docIdSet] }, docType: 10 })
    .project({ title: 1, docId: 1 })
    .toArray()
  const titleMap = new Map(problemDocs.map(d => [d.docId, d.title]))

  lines.push(`## ${domainId}`)
  lines.push('')

  // 在 Hydro 中作业和比赛都是 docType=30，区别在于 rule 字段
  const homeworks = contests.filter(c => c.rule === 'homework')
  const exams     = contests.filter(c => c.rule !== 'homework')

  const renderGroup = (items, label, pathSeg) => {
    if (!items.length) return
    lines.push(`### ${label}`)
    lines.push('')
    for (const c of items) {
      const url = `${BASE_URL}/d/${domainId}/${pathSeg}/${c.docId}`
      lines.push(`#### [${c.title || `(id: ${c.docId})`}](${url})`)
      lines.push('')
      lines.push(`- **链接**：${url}`)
      lines.push(`- **题目数**：${(c.pids || []).length}`)
      lines.push('')
      if (c.pids?.length) {
        lines.push('| # | 题目 | 链接 |')
        lines.push('|---|------|------|')
        c.pids.forEach((pid, i) => {
          const n = Number(pid)
          const title = titleMap.get(n) || `(pid: ${pid})`
          const pUrl = `${BASE_URL}/d/${domainId}/p/${pid}`
          lines.push(`| ${i + 1} | ${title} | [查看](${pUrl}) |`)
        })
        lines.push('')
      }
    }
  }

  renderGroup(homeworks, '📝 作业', 'homework')
  renderGroup(exams,     '🏆 比赛', 'contest')
}

console.log(lines.join('\n'))
await conn.close()
