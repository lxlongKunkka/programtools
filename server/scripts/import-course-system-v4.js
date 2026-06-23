#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'

const args = process.argv.slice(2)

const inputFile = resolveArg('file', path.resolve(process.cwd(), 'docs', 'course.md'))
const appUri = getArg('app-uri', process.env.APP_MONGODB_URI || '')
const apply = args.includes('--apply')

const courseGroupName = getArg('group', '岐麦教育 C++ 信奥全体系课程（v8.1）')
const courseGroupTitle = getArg('title', '岐麦教育 C++ 信奥全体系课程（v8.1 · GESP 官方对标版）')
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
      const topics = lv.lessons.map((lesson) => ({
        title: `${lesson.code}  ${lesson.title}`,
        description: '',
        chapters: []
      }))

      const levelDoc = {
        level: lv.level,
        group: courseGroupName,
        label: `GESP ${lv.level}`,
        subject,
        title: `GESP ${lv.level} 级：${lv.title}`,
        description: lv.description,
        topics,
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
      lessonsSaved: savedLevels.reduce((sum, lv) => sum + (lv.topics?.length || 0), 0)
    }, null, 2))
  } finally {
    await conn.close().catch(() => {})
  }
}

function parseCourse(text) {
  const lines = String(text || '').split('\n')
  const levels = []
  let currentLevel = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // 匹配：## 📘 GESP N 级：title  /  ## 📕 GESP N 级：title  等各种 emoji 前缀
    const levelMatch = line.match(/^##\s+\S+\s+GESP\s+(\d+)\s+级[：:]\s*(.+)$/)
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

    // 匹配表格行：| L0101 | 主题描述 |
    const tableMatch = line.match(/^\|\s*(L\d{4})\s*\|\s*(.+?)\s*\|/)
    if (tableMatch) {
      const code = tableMatch[1]    // e.g. L0101
      const title = tableMatch[2].trim()
      // 跳过表头和分隔行
      if (title === '主题' || /^[-:#]/.test(title) || title === '#') continue
      const lessonNo = parseInt(code.slice(3), 10)  // L0101 -> 01 -> 1
      currentLevel.lessons.push({ code, no: lessonNo, title })
    }
  }

  if (currentLevel) levels.push(currentLevel)
  return { levels }
}

function buildLessonContent(lesson) {
  const lines = []
  if (lesson.knowledge) lines.push(`语法和知识：${lesson.knowledge}`)
  if (lesson.algorithm) lines.push(`核心算法：${lesson.algorithm}`)
  if (lesson.dataStruct) lines.push(`数据结构：${lesson.dataStruct}`)
  if (lesson.strategy) lines.push(`数学和策略：${lesson.strategy}`)
  if (!lines.length) lines.push('本课未在大纲中提供结构化知识点字段。')
  return lines.join('；')
}

function buildLessonChapters(level, lesson) {
  const chapterSpecs = [
    { key: 'knowledge', title: '语法和知识', content: lesson.knowledge },
    { key: 'algorithm', title: '核心算法', content: lesson.algorithm },
    { key: 'data', title: '数据结构', content: lesson.dataStruct },
    { key: 'strategy', title: '数学和策略', content: lesson.strategy }
  ]

  return chapterSpecs
    .filter((item) => item.content)
    .map((item, index) => ({
      id: `cppv4-${level}-t${lesson.no}-c${index + 1}`,
      title: item.title,
      content: `- ${item.content}`,
      contentType: 'markdown',
      resourceUrl: '',
      videoUrl: '',
      problemIds: [],
      optionalProblemIds: [],
      homeworkIds: [],
      examIds: [],
      optional: false
    }))
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
