/**
 * 从 programtools app 数据库读取课程体系，重新生成 curriculum_export 目录
 * 只导出目录结构 + 每章节的基础信息（标题、problemIds）
 */

import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const uri = process.env.APP_MONGODB_URI || process.env.MONGODB_URI
if (!uri) throw new Error('APP_MONGODB_URI 未配置')

const EXPORT_DIR = path.join(__dirname, '../curriculum_export')

;(async () => {
  const client = new MongoClient(uri)
  try {
    await client.connect()
    const db = client.db()
    const levels = await db.collection('courselevels')
      .find({})
      .sort({ subject: 1, level: 1 })
      .toArray()

    console.log(`共读取 ${levels.length} 个 CourseLevel`)

    for (const lv of levels) {
        // title 形如 "GESP 一级 (基础语法)" 或 "GESP Python 一级 (基础语法与绘图)"
      // 去掉开头的 "GESP " 或 "GESP Python "，生成 "Level1_GESP 一级 (...)" 或 "Level1_GESP Python 一级 (...)"
      const titleClean = lv.title
        .replace(/^GESP Python /, 'Python ')
        .replace(/^GESP /, '')
        .replace(/[\\/:*?"<>|]/g, '_')
      const dirName = `Level${lv.level}_GESP ${titleClean}`
      const levelDir = path.join(EXPORT_DIR, dirName)
      fs.mkdirSync(levelDir, { recursive: true })

      const topics = lv.topics ?? []
      for (let ti = 0; ti < topics.length; ti++) {
        const topic = topics[ti]
        const topicName = `${String(ti + 1).padStart(2, '0')}_${topic.title.replace(/[\\/:*?"<>|]/g, '_')}`
        const topicDir = path.join(levelDir, topicName)
        fs.mkdirSync(topicDir, { recursive: true })

        const chapters = topic.chapters ?? []
        for (let ci = 0; ci < chapters.length; ci++) {
          const ch = chapters[ci]
          const chName = `${String(ci + 1).padStart(2, '0')}_${ch.title.replace(/[\\/:*?"<>|]/g, '_')}.md`
          const pids = (ch.problemIds ?? []).map(p => `- \`${p}\``).join('\n')
          const optPids = (ch.optionalProblemIds ?? []).map(p => `- \`${p}\``).join('\n')
          const content = [
            `# ${ch.title}`,
            ``,
            `> **章节 ID：** \`${ch.id ?? ''}\``,
            `> **所属专题：** ${topic.title}`,
            `> **所属等级：** Level ${lv.level} — ${lv.title}`,
            ``,
            `---`,
            ``,
            `## 必做题${pids ? `（${ch.problemIds.length}）` : '（0）'}`,
            pids || '（暂无）',
            ``,
            ...(optPids ? [`## 选做题`, optPids, ``] : []),
          ].join('\n')
          fs.writeFileSync(path.join(topicDir, chName), content, 'utf8')
        }

        console.log(`  ${dirName} / ${topicName}  (${chapters.length} 章节)`)
      }
    }

    console.log('\n✅ curriculum_export 已更新完成')
  } finally {
    await client.close()
  }
})()
