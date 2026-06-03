/**
 * 导出 GESP 4-8 级所有作业（homeworkIds）和比赛（examIds）的题目清单
 * 用法：node scripts/dump_gesp4_8_homework_exam.mjs [--levels=4,5,6,7,8]
 * 输出：Markdown 文档到 stdout，重定向到文件即可
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

const APP_URI = process.env.APP_MONGODB_URI
const HYDRO_URI = process.env.HYDRO_MONGODB_URI
const BASE_URL = 'https://acjudge.com'

// Parse --levels arg
const levelsArg = process.argv.find(a => a.startsWith('--levels='))
const TARGET_LEVELS = levelsArg
  ? levelsArg.replace('--levels=', '').split(',').map(Number)
  : [4, 5, 6, 7, 8]

function parseContestRef(idStr) {
  if (!idStr) return { domainId: 'system', contestId: '' }
  const text = String(idStr)
  if (!text.includes(':')) return { domainId: 'system', contestId: text }
  const [domainId, contestId] = text.split(':')
  return { domainId: domainId || 'system', contestId: contestId || '' }
}

function buildContestUrl(idStr, type = 'homework') {
  const { domainId, contestId } = parseContestRef(idStr)
  const pathSegment = type === 'exam' ? 'contest' : type
  return contestId ? `${BASE_URL}/d/${domainId}/${pathSegment}/${contestId}` : ''
}

function buildProblemUrl(domainId, docId) {
  return `${BASE_URL}/d/${domainId}/p/${docId}`
}

async function main() {
  const appConn = await mongoose.createConnection(APP_URI).asPromise()
  const hydroConn = await mongoose.createConnection(HYDRO_URI).asPromise()

  const CL = appConn.model('CL', new mongoose.Schema({}, { collection: 'courselevels', strict: false }))
  const Doc = hydroConn.model('Doc', new mongoose.Schema({}, { collection: 'document', strict: false }))

  // 1. 加载所有目标级别
  const levels = await CL.find({
    level: { $in: TARGET_LEVELS },
    $or: [{ group: /GESP.*C\+\+/i }, { group: /C\+\+.*GESP/i }, { group: /GESP/i }]
  }).sort({ level: 1 }).lean()

  if (!levels.length) {
    const all = await CL.distinct('group')
    console.error('未找到匹配的课程文档，现有 group：', all)
    process.exit(1)
  }

  // 2. 收集所有 contest refs
  const contestRefs = [] // { type, idStr, levelNum, levelTitle, topicTitle, chapterTitle, chapterId }
  for (const lv of levels) {
    for (const topic of lv.topics || []) {
      for (const ch of topic.chapters || []) {
        for (const id of ch.homeworkIds || []) {
          contestRefs.push({ type: 'homework', idStr: id, levelNum: lv.level, levelTitle: lv.title || `Level ${lv.level}`, topicTitle: topic.title, chapterTitle: ch.title, chapterId: ch.id })
        }
        for (const id of ch.examIds || []) {
          contestRefs.push({ type: 'exam', idStr: id, levelNum: lv.level, levelTitle: lv.title || `Level ${lv.level}`, topicTitle: topic.title, chapterTitle: ch.title, chapterId: ch.id })
        }
      }
    }
  }

  // 3. 批量查 Hydro contest 文档
  const contestMap = new Map() // idStr → contestDoc
  const allContestIds = [...new Set(contestRefs.map(r => r.idStr))]

  for (const idStr of allContestIds) {
    const { domainId, contestId } = parseContestRef(idStr)
    if (!contestId) continue
    let doc = null
    const numericId = Number(contestId)
    if (!isNaN(numericId)) {
      doc = await Doc.findOne({ domainId, docId: numericId, docType: { $in: [30, 60] } })
        .select('title docId docType domainId pids').lean()
    }
    if (!doc && /^[0-9a-f]{24}$/.test(contestId)) {
      doc = await Doc.findOne({ _id: new mongoose.Types.ObjectId(contestId), domainId })
        .select('title docId docType domainId pids').lean()
    }
    if (doc) contestMap.set(idStr, doc)
  }

  // 4. 批量查所有题目标题
  // pids 格式可能是数字(docId in same domain)或 "domainId:docId"
  // 先按 domainId 分组查询（纯数字 pid 需要用 contest 的 domainId）
  const pidTitleMap = new Map() // "domainId:docId" → { title, docId, domainId }
  const domainDocIds = new Map() // domainId → Set<docId>

  for (const [idStr, doc] of contestMap.entries()) {
    const contestDomain = doc.domainId
    for (const pid of doc.pids || []) {
      const str = String(pid)
      let domainId, docId
      if (str.includes(':')) {
        [domainId, docId] = str.split(':')
      } else {
        domainId = contestDomain
        docId = str
      }
      if (!domainDocIds.has(domainId)) domainDocIds.set(domainId, new Set())
      domainDocIds.get(domainId).add(Number(docId) || docId)
    }
  }
  for (const [domainId, docIdSet] of domainDocIds.entries()) {
    const docs = await Doc.find({ domainId, docId: { $in: [...docIdSet] }, docType: 10 })
      .select('title docId domainId').lean()
    for (const d of docs) {
      pidTitleMap.set(`${domainId}:${d.docId}`, { title: d.title, docId: d.docId, domainId })
    }
  }

  // 5. 输出 Markdown
  const lines = []
  lines.push(`# GESP ${TARGET_LEVELS.join('/')} 级作业与比赛题目清单`)
  lines.push('')
  lines.push(`> 生成时间：${new Date().toLocaleDateString('zh-CN')}，共 ${contestRefs.length} 条作业/比赛`)
  lines.push('')

  // 按级别分组
  let currentLevel = null
  let currentTopic = null

  for (const ref of contestRefs) {
    if (ref.levelNum !== currentLevel) {
      currentLevel = ref.levelNum
      currentTopic = null
      lines.push(`## Level ${ref.levelNum}`)
      lines.push('')
    }
    if (ref.topicTitle !== currentTopic) {
      currentTopic = ref.topicTitle
      lines.push(`### ${ref.topicTitle}`)
      lines.push('')
    }

    const typeLabel = ref.type === 'homework' ? '📝 作业' : '🏆 比赛'
    const url = buildContestUrl(ref.idStr, ref.type)
    const contestDoc = contestMap.get(ref.idStr)
    const contestTitle = contestDoc?.title || `(id: ${ref.idStr})`

    lines.push(`#### ${typeLabel} — ${ref.chapterTitle}`)
    lines.push('')
    lines.push(`- **章节**：${ref.topicTitle} / ${ref.chapterTitle}`)
    lines.push(`- **标题**：[${contestTitle}](${url})`)
    lines.push(`- **链接**：${url}`)
    lines.push('')

    if (contestDoc?.pids?.length) {
      lines.push('| # | 题目 | 链接 |')
      lines.push('|---|------|------|')
      contestDoc.pids.forEach((pid, i) => {
        const str = String(pid)
        const contestDomain = contestDoc.domainId
        let domainId, docId
        if (str.includes(':')) {
          [domainId, docId] = str.split(':')
        } else {
          domainId = contestDomain
          docId = str
        }
        const key = `${domainId}:${docId}`
        const info = pidTitleMap.get(key)
        const title = info?.title || `(pid: ${str})`
        const problemUrl = buildProblemUrl(domainId, docId)
        lines.push(`| ${i + 1} | ${title} | [查看](${problemUrl}) |`)
      })
      lines.push('')
    } else {
      lines.push('> 暂无题目数据（contest 未找到或 pids 为空）')
      lines.push('')
    }
  }

  if (!contestRefs.length) {
    lines.push('> 未找到任何 homeworkIds 或 examIds 数据。')
  }

  console.log(lines.join('\n'))
  await appConn.close()
  await hydroConn.close()
}

main().catch(e => { console.error(e); process.exit(1) })
