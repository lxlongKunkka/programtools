/**
 * import_to_db.js
 * 将 curriculum_export 目录中更新的 Markdown 教案导入到 MongoDB
 *
 * 用法：
 *   node import_to_db.js               # 导入所有等级
 *   node import_to_db.js --level 1 2   # 只导入 Level1, Level2
 *   node import_to_db.js --dry-run     # 只显示会更新哪些，不写库
 *
 * 依赖：在 server/.env 中已有 APP_MONGODB_URI（或 MONGODB_URI）
 */

import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 加载 .env
dotenv.config({ path: path.join(__dirname, 'server', '.env') })

const CURRICULUM_ROOT = path.join(__dirname, 'curriculum_export')
const MONGODB_URI = process.env.APP_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/programtools'

const DRY_RUN = process.argv.includes('--dry-run')
const LEVEL_FILTER = (() => {
  const idx = process.argv.indexOf('--level')
  if (idx === -1) return null
  const nums = []
  for (let i = idx + 1; i < process.argv.length && !process.argv[i].startsWith('--'); i++) {
    const n = parseInt(process.argv[i])
    if (!isNaN(n)) nums.push(n)
  }
  return nums.length ? nums : null
})()

// ==============================
// 解析 Markdown 文件
// ==============================

function parseMd(content) {
  // 规范化换行（Windows \r\n → \n），避免正则失配
  content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  const result = {
    title: '',
    chapterId: '',
    lessonContent: '',
    problemIds: [],
    optionalProblemIds: []
  }

  // 提取标题
  const titleM = content.match(/^# (.+)$/m)
  if (titleM) result.title = titleM[1].trim()

  // 提取章节 ID
  const idM = content.match(/\*\*章节 ID[：:]\*\*\s*`([^`]+)`/) || content.match(/章节 ID[：:]\s*`([^`]+)`/)
  if (idM) result.chapterId = idM[1].trim()

  // 提取必做题 ID
  const mandatorySection = content.match(/## 必做题[^\n]*\n([\s\S]*?)(?=\n## |$)/)
  if (mandatorySection) {
    result.problemIds = [...mandatorySection[1].matchAll(/`(Level\d+:\d+)`/g)].map(m => m[1])
  }

  // 提取选做题 ID
  const optionalSection = content.match(/## 选做题[^\n]*\n([\s\S]*?)(?=\n## |$)/)
  if (optionalSection) {
    result.optionalProblemIds = [...optionalSection[1].matchAll(/`(Level\d+:\d+)`/g)].map(m => m[1])
  }

  // 提取教案内容（## 教案内容 之后的全文）
  const lessonM = content.match(/## 教案内容\n+([\s\S]*)$/)
  if (lessonM) result.lessonContent = lessonM[1].trim()

  return result
}

// ==============================
// MongoDB Schema（简化，与 server 保持一致）
// ==============================

const chapterSchema = new mongoose.Schema({
  id: String,
  title: String,
  content: String,
  contentType: { type: String, default: 'markdown' },
  resourceUrl: String,
  problemIds: [String],
  optionalProblemIds: [String],
  optional: Boolean
}, { _id: false })

const topicSchema = new mongoose.Schema({
  title: String,
  description: String,
  chapters: [chapterSchema]
}, { _id: false })

const courseLevelSchema = new mongoose.Schema({
  level: Number,
  group: String,
  label: String,
  subject: String,
  title: String,
  description: String,
  topics: [topicSchema],
  chapters: [chapterSchema]
})

const CourseLevel = mongoose.model('CourseLevel', courseLevelSchema)

// ==============================
// 主逻辑
// ==============================

async function main() {
  console.log('=' .repeat(60))
  console.log(`导入教案到 MongoDB`)
  console.log(`URI: ${MONGODB_URI}`)
  console.log(`模式: ${DRY_RUN ? 'DRY-RUN (不写库)' : '正式写入'}`)
  if (LEVEL_FILTER) console.log(`过滤等级: ${LEVEL_FILTER.join(', ')}`)
  console.log('=' .repeat(60))

  if (!DRY_RUN) {
    await mongoose.connect(MONGODB_URI)
    console.log('数据库已连接\n')
  }

  let totalUpdated = 0, totalSkipped = 0, totalNotFound = 0
  const notFoundList = []

  // 遍历 curriculum_export
  for (const levelDir of fs.readdirSync(CURRICULUM_ROOT).sort()) {
    const levelPath = path.join(CURRICULUM_ROOT, levelDir)
    if (!fs.statSync(levelPath).isDirectory()) continue

    // 从目录名解析等级号（Level1_GESP... -> 1）
    const levelNumM = levelDir.match(/^Level(\d+)/)
    if (!levelNumM) continue
    const levelNum = parseInt(levelNumM[1])

    if (LEVEL_FILTER && !LEVEL_FILTER.includes(levelNum)) continue

    console.log(`\n[Level${levelNum}] ${levelDir}`)

    // 加载 DB 记录（只加载一次）
    let dbRecord = null
    if (!DRY_RUN) {
      dbRecord = await CourseLevel.findOne({ level: levelNum })
      if (!dbRecord) {
        console.log(`  !! 数据库中找不到 Level${levelNum} 的记录，跳过`)
        continue
      }
    }

    for (const topicDir of fs.readdirSync(levelPath).sort()) {
      const topicPath = path.join(levelPath, topicDir)
      if (!fs.statSync(topicPath).isDirectory()) continue

      for (const chFile of fs.readdirSync(topicPath).sort()) {
        if (!chFile.endsWith('.md')) continue
        const filePath = path.join(topicPath, chFile)
        const content = fs.readFileSync(filePath, 'utf-8')
        const parsed = parseMd(content)

        if (!parsed.chapterId) {
          console.log(`  [?] ${chFile} — 无法解析章节 ID，跳过`)
          totalSkipped++
          continue
        }

        if (!parsed.lessonContent || parsed.lessonContent.length < 100) {
          totalSkipped++
          continue
        }

        if (DRY_RUN) {
          console.log(`  [DRY] ${parsed.chapterId} | ${parsed.title} (${parsed.lessonContent.length} chars)`)
          totalUpdated++
          continue
        }

        // 在 topics 中查找章节
        let found = false
        for (const topic of (dbRecord.topics || [])) {
          const ch = topic.chapters.find(c => c.id === parsed.chapterId)
          if (ch) {
            ch.content = parsed.lessonContent
            if (parsed.problemIds.length > 0) ch.problemIds = parsed.problemIds
            if (parsed.optionalProblemIds.length > 0) ch.optionalProblemIds = parsed.optionalProblemIds
            found = true
            totalUpdated++
            console.log(`  [OK] ${parsed.chapterId} | ${parsed.title} (${parsed.lessonContent.length} chars)`)
            break
          }
        }
        // 也查 legacy chapters
        if (!found && dbRecord.chapters) {
          const ch = dbRecord.chapters.find(c => c.id === parsed.chapterId)
          if (ch) {
            ch.content = parsed.lessonContent
            found = true
            totalUpdated++
          }
        }

        if (!found) {
          totalNotFound++
          notFoundList.push(`Level${levelNum}/${topicDir}/${chFile} (id: ${parsed.chapterId})`)
          console.log(`  [NOT FOUND] ${parsed.chapterId} | ${parsed.title}`)
        }
      }
    }

    // 保存整个 Level 记录（markdown_content 改了 subdocument）
    if (!DRY_RUN && dbRecord) {
      dbRecord.markModified('topics')
      dbRecord.markModified('chapters')
      await dbRecord.save()
      console.log(`  => Level${levelNum} 已保存到数据库`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`完成！更新=${totalUpdated}, 跳过(无内容)=${totalSkipped}, 未找到=${totalNotFound}`)
  if (notFoundList.length > 0) {
    console.log('\n未找到的章节:')
    notFoundList.forEach(f => console.log(`  ${f}`))
  }

  if (!DRY_RUN) await mongoose.disconnect()
}

main().catch(err => {
  console.error('导入失败:', err)
  process.exit(1)
})
