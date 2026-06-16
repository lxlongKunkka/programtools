#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'

const args = process.argv.slice(2)

const inputFile = resolveArg('file', path.resolve(process.cwd(), 'docs', 'course.md'))
const appUri = getArg('app-uri', process.env.APP_MONGODB_URI || '')
const apply = args.includes('--apply')

const courseGroupName = getArg('group', '岐麦教育 C++ 信奥全体系课程（v4.0）')
const courseGroupTitle = getArg('title', '岐麦教育 C++ 信奥全体系课程（v4.0 · GESP 官方对标版）')
const subject = getArg('subject', 'C++')

const courseGroupSchema = new mongoose.Schema({}, { collection: 'coursegroups', strict: false })
const courseLevelSchema = new mongoose.Schema({}, { collection: 'courselevels', strict: false })

async function main() {
  if (!fs.existsSync(inputFile)) {
    throw new Error(`输入文件不存在: ${inputFile}`)
  }

  const raw = fs.readFileSync(inputFile, 'utf-8').replace(/\r\n/g, '\n')
  const parsed = parseCourse(raw)

  console.log(JSON.stringify({
    inputFile,
    group: courseGroupName,
    subject,
    levels: parsed.levels.length,
    lessons: parsed.levels.reduce((sum, lv) => sum + lv.lessons.length, 0),
    apply
  }, null, 2))

  if (!parsed.levels.length) {
    throw new Error('未解析到任何 GESP 级别，请检查文档格式')
  }

  if (!apply) {
    for (const lv of parsed.levels) {
      console.log(`L${lv.level}: ${lv.title} | lessons=${lv.lessons.length}`)
    }
    return
  }

  if (!appUri) {
    throw new Error('缺少 --app-uri 或 APP_MONGODB_URI，无法写入数据库')
  }

  const conn = mongoose.createConnection(appUri)
  const CourseGroup = conn.model('CourseGroup', courseGroupSchema)
  const CourseLevel = conn.model('CourseLevel', courseLevelSchema)

  try {
    await conn.asPromise()

    await CourseGroup.updateOne(
      { name: courseGroupName },
      {
        $set: {
          name: courseGroupName,
          title: courseGroupTitle,
          language: subject,
          order: 100,
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    )

    for (const lv of parsed.levels) {
      const chapters = lv.lessons.map((lesson, index) => {
        const chapterId = `cppv4-${lv.level}-1-${index + 1}`
        const content = buildLessonContent(lesson)
        return {
          id: chapterId,
          title: `第 ${lesson.no} 课：${lesson.title}`,
          content,
          contentType: 'markdown',
          resourceUrl: '',
          videoUrl: '',
          problemIds: [],
          optionalProblemIds: [],
          homeworkIds: [],
          examIds: [],
          optional: false
        }
      })

      const levelDoc = {
        level: lv.level,
        group: courseGroupName,
        label: `GESP ${lv.level}`,
        subject,
        title: `GESP ${lv.level} 级：${lv.title}`,
        description: lv.description,
        topics: [
          {
            title: '课程知识点',
            description: `本级共 ${lv.lessons.length} 课，覆盖语法、算法与策略要点。`,
            chapters
          }
        ],
        chapters: []
      }

      await CourseLevel.updateOne(
        { level: lv.level, group: courseGroupName },
        {
          $set: {
            ...levelDoc,
            updatedAt: new Date()
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      )
    }

    const savedLevels = await CourseLevel.find({ group: courseGroupName }).select('level title topics').sort({ level: 1 }).lean()
    console.log(JSON.stringify({
      group: courseGroupName,
      levelsSaved: savedLevels.length,
      lessonsSaved: savedLevels.reduce((sum, lv) => sum + ((lv.topics?.[0]?.chapters?.length) || 0), 0)
    }, null, 2))
  } finally {
    await conn.close().catch(() => {})
  }
}

function parseCourse(text) {
  const lines = String(text || '').split('\n')
  const levels = []

  let currentLevel = null

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim()

    const levelMatch = line.match(/^###\s+.*GESP\s*(\d+)\s*级[:：]\s*(.+)$/)
    if (levelMatch) {
      if (currentLevel) levels.push(currentLevel)
      currentLevel = {
        level: Number(levelMatch[1]),
        title: levelMatch[2].trim(),
        description: '',
        lessons: []
      }
      continue
    }

    if (!currentLevel) continue

    if (!currentLevel.description && line.startsWith('> **级别描述**')) {
      currentLevel.description = line.replace(/^>\s*\*\*级别描述\*\*[:：]?\s*/, '').trim()
      continue
    }

    const lessonMatch = line.match(/^•\s*第\s*(\d+)\s*课[:：]\s*(.+)$/)
    if (lessonMatch) {
      currentLevel.lessons.push({
        no: Number(lessonMatch[1]),
        title: lessonMatch[2].trim(),
        knowledge: '',
        algorithm: '',
        dataStruct: '',
        strategy: ''
      })
      continue
    }

    if (!currentLevel.lessons.length) continue

    const last = currentLevel.lessons[currentLevel.lessons.length - 1]
    const knowledgeMatch = line.match(/^•\s*语法和知识[:：]\s*(.+)$/)
    if (knowledgeMatch) {
      last.knowledge = knowledgeMatch[1].trim()
      continue
    }

    const algoMatch = line.match(/^•\s*核心算法[:：]\s*(.+)$/)
    if (algoMatch) {
      last.algorithm = algoMatch[1].trim()
      continue
    }

    const dsMatch = line.match(/^•\s*数据结构[:：]\s*(.+)$/)
    if (dsMatch) {
      last.dataStruct = dsMatch[1].trim()
      continue
    }

    const strategyMatch = line.match(/^•\s*数学和策略[:：]\s*(.+)$/)
    if (strategyMatch) {
      last.strategy = strategyMatch[1].trim()
    }
  }

  if (currentLevel) levels.push(currentLevel)

  return { levels }
}

function buildLessonContent(lesson) {
  const lines = []
  lines.push(`# ${lesson.title}`)
  lines.push('')
  if (lesson.knowledge) {
    lines.push('## 语法和知识')
    lines.push(`- ${lesson.knowledge}`)
    lines.push('')
  }
  if (lesson.algorithm) {
    lines.push('## 核心算法')
    lines.push(`- ${lesson.algorithm}`)
    lines.push('')
  }
  if (lesson.dataStruct) {
    lines.push('## 数据结构')
    lines.push(`- ${lesson.dataStruct}`)
    lines.push('')
  }
  if (lesson.strategy) {
    lines.push('## 数学和策略')
    lines.push(`- ${lesson.strategy}`)
    lines.push('')
  }
  if (!lesson.knowledge && !lesson.algorithm && !lesson.dataStruct && !lesson.strategy) {
    lines.push('> 本课未在大纲中提供结构化知识点字段。')
    lines.push('')
  }
  return lines.join('\n').trim()
}

function resolveArg(name, fallbackValue) {
  const value = getArg(name, '')
  return value ? path.resolve(value) : fallbackValue
}

function getArg(name, fallbackValue) {
  const prefix = `--${name}=`
  const match = args.find((item) => item.startsWith(prefix))
  return match ? match.slice(prefix.length) : fallbackValue
}

main().catch((error) => {
  console.error('[import-course-system-v4] fatal:', error)
  process.exit(1)
})
