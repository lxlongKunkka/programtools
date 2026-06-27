import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 读取课程大纲
const sumAllContent = fs.readFileSync(path.join(__dirname, '../other/sum_all.md'), 'utf-8')

// 解析课程结构
const courses = []
const levelRegex = /^## .+ GESP (\d+) 级：(.+)$/gm
const topicRegex = /^\| (L\d{4}) \| (.+) \|$/gm

let match
let currentLevel = null
let levelDescriptions = []

// 先提取所有级别的标题
const levelMatches = [...sumAllContent.matchAll(levelRegex)]

levelMatches.forEach((levelMatch, idx) => {
  const levelNum = parseInt(levelMatch[1])
  const levelTitle = levelMatch[2].trim()
  
  // 提取该级别下的所有 topics
  const topics = []
  
  // 找到该级别的内容区域（从当前 ## 到下一个 ## 或文件结束）
  const startIdx = levelMatch.index
  const nextLevelMatch = levelMatches[idx + 1]
  const endIdx = nextLevelMatch ? nextLevelMatch.index : sumAllContent.length
  const levelContent = sumAllContent.slice(startIdx, endIdx)
  
  // 提取该级别的所有 topics
  const topicMatches = [...levelContent.matchAll(topicRegex)]
  topicMatches.forEach(topicMatch => {
    const topicId = topicMatch[1]  // e.g. "L0601"
    const topicTitle = topicMatch[2].trim()  // e.g. "线性表 · 栈与队列"
    
    topics.push({
      title: `${topicId}  ${topicTitle}`,
      description: '',
      chapters: []
    })
  })
  
  courses.push({
    level: levelNum,
    group: '岐麦教育 C++ 信奥全体系课程（v8.1）',
    title: `GESP ${levelNum} 级：${levelTitle}`,
    description: '',
    subject: 'C++',
    topics: topics
  })
})

// 输出 JSON
const outputPath = path.join(__dirname, '../other/gesp_v81_import.json')
fs.writeFileSync(outputPath, JSON.stringify(courses, null, 2), 'utf-8')

console.log(`✓ 已生成课程 JSON: ${outputPath}`)
console.log(`  总共 ${courses.length} 个级别`)
courses.forEach(c => {
  console.log(`  Level ${c.level}: ${c.title} (${c.topics.length} topics)`)
})
