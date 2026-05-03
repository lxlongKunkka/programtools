// 导出所有 atcoder 题目（含 content 摘要）+ GESP 全章节目录
// 输出 changelogs/atcoder-classify-input.json（供本地分批阅读）
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

function pickContent(raw, maxLen = 600) {
  if (!raw) return ''
  let txt = String(raw)
  // hydro content 通常是 JSON {zh, en}
  try {
    const obj = JSON.parse(txt)
    if (obj && typeof obj === 'object') txt = String(obj.zh || obj.en || obj.cn || '')
  } catch {}
  // 去 markdown/html 多余空白
  txt = txt.replace(/\s+/g, ' ').replace(/\$+/g, '').trim()
  return txt.slice(0, maxLen)
}

async function main() {
  // 1. 导出全部 GESP cpp 章节（含 title + 已用 pid）
  const app = mongoose.createConnection(process.env.APP_MONGODB_URI)
  const CL = app.model('CourseLevel', new mongoose.Schema({}, { collection: 'courselevels', strict: false }))
  await app.asPromise()
  const cppLevels = await CL.find({ group: /C\+\+/ }).sort({ level: 1 }).lean()
  const chapterCatalog = []
  const pidToChapter = new Map() // pid -> [chId,...]
  for (const lv of cppLevels) {
    for (const t of lv.topics || []) {
      for (const c of t.chapters || []) {
        chapterCatalog.push({
          level: lv.level,
          chapterId: c.id,
          chapterTitle: c.title,
          topicTitle: t.title,
          requiredCount: (c.problemIds||[]).length,
          optionalCount: (c.optionalProblemIds||[]).length,
        })
        for (const pid of c.problemIds||[]) {
          if (!pidToChapter.has(pid)) pidToChapter.set(pid, [])
          pidToChapter.get(pid).push(`${c.id}:R`)
        }
        for (const pid of c.optionalProblemIds||[]) {
          if (!pidToChapter.has(pid)) pidToChapter.set(pid, [])
          pidToChapter.get(pid).push(`${c.id}:O`)
        }
      }
    }
  }
  await app.close()

  // 2. 拉所有 atcoder 题
  const hy = mongoose.createConnection(process.env.HYDRO_MONGODB_URI)
  const D = hy.model('Doc', new mongoose.Schema({}, { collection: 'document', strict: false }))
  await hy.asPromise()
  const total = await D.countDocuments({ docType: 10, domainId: 'atcoder' })
  console.error(`atcoder total: ${total}`)
  const cur = D.find({ docType: 10, domainId: 'atcoder' })
    .select({ docId:1, title:1, tag:1, content:1, nAccept:1, nSubmit:1 })
    .lean().cursor()
  const problems = []
  for await (const doc of cur) {
    const pid = `atcoder:${doc.docId}`
    problems.push({
      pid,
      docId: doc.docId,
      title: String(doc.title||''),
      tags: (doc.tag||[]).map(String),
      ac: doc.nSubmit ? +(doc.nAccept/doc.nSubmit).toFixed(2) : null,
      ns: doc.nSubmit || 0,
      currentChapters: pidToChapter.get(pid) || [],
      contentSnippet: pickContent(doc.content, 500),
    })
  }
  await hy.close()
  problems.sort((a, b) => a.docId - b.docId)

  const out = path.resolve(__dirname, '../changelogs/atcoder-classify-input.json')
  fs.writeFileSync(out, JSON.stringify({
    generatedAt: new Date().toISOString(),
    chapterCatalog,
    problems,
  }, null, 2))
  console.error(`wrote ${problems.length} problems and ${chapterCatalog.length} chapters -> ${out}`)
  // 简要统计
  const assigned = problems.filter(p => p.currentChapters.length > 0).length
  console.error(`already assigned: ${assigned}`)
  console.error(`unassigned: ${problems.length - assigned}`)
}
main().catch(e=>{console.error(e);process.exit(1)})
