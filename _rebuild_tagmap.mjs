// 重建 gespTagMap.json —— 只使用 GESP C++ 认证课程 的章节
import { MongoClient } from 'mongodb'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const envRaw = readFileSync(join(__dir, 'server/.env'), 'utf8')
const uri = envRaw.match(/APP_MONGODB_URI=(.+)/)?.[1]?.trim()

const client = new MongoClient(uri)
await client.connect()
const db = client.db()
const col = db.collection('courselevels')

// 只取 C++ 课程
const levels = await col.find({ group: 'GESP C++ 认证课程' }).toArray()
levels.sort((a, b) => a.level - b.level)

// 建立 chapterId → title  &  title → chapterId  (C++ only)
const idToTitle = {}
const titleToId = {}

for (const lv of levels) {
  if (!lv.topics) continue
  lv.topics.forEach((topic, ti) => {
    if (!topic.chapters) return
    topic.chapters.forEach((ch, ci) => {
      const id = `${lv.level}-${ti+1}-${ci+1}`
      idToTitle[id] = ch.title
      if (!titleToId[ch.title]) titleToId[ch.title] = id
    })
  })
}

console.log(`C++ 课程章节总数: ${Object.keys(idToTitle).length}`)

// 打印所有 C++ 章节供参考（level 1-4 重点检查）
for (const lv of levels.filter(l => l.level <= 4)) {
  console.log(`\n── Level ${lv.level} ──`)
  lv.topics?.forEach((topic, ti) => {
    topic.chapters?.forEach((ch, ci) => {
      console.log(`  ${lv.level}-${ti+1}-${ci+1}  ${ch.title}`)
    })
  })
}

// 当前 tagMap
const tagMap = JSON.parse(readFileSync(join(__dir, 'src/utils/gespTagMap.json'), 'utf8'))

// 更新每条映射：先查 titleToId，匹配不上再用模糊前缀
const updated = {}
const manual = []   // 需要手动处理的

for (const [tag, oldId] of Object.entries(tagMap)) {
  // 1. 精确匹配
  if (titleToId[tag]) {
    updated[tag] = titleToId[tag]
    continue
  }
  // 2. 模糊：DB chapter title startsWith tag 或 tag startsWith chapter prefix
  const fuzzy = Object.entries(titleToId).find(([title]) =>
    title.startsWith(tag) || tag === title.replace(/[（(].*/, '').trim()
  )
  if (fuzzy) {
    updated[tag] = fuzzy[1]
    continue
  }
  // 3. 原 ID 在 C++ 课中是否存在（level 5+ 没有 Python）
  if (idToTitle[oldId]) {
    updated[tag] = oldId
    manual.push(`⚠️  [${tag}] 保留 ${oldId}「${idToTitle[oldId]}」（模糊未命中，请人工确认）`)
    continue
  }
  // 4. 完全找不到
  manual.push(`❌ [${tag}] 找不到对应章节（原 id: ${oldId}）`)
  updated[tag] = oldId  // 保留原值，不破坏
}

if (manual.length) {
  console.log('\n── 需要人工确认 ──')
  manual.forEach(l => console.log(l))
}

writeFileSync(join(__dir, 'src/utils/gespTagMap.json'), JSON.stringify(updated, null, 2) + '\n')
console.log(`\n✅ 写入完成，共 ${Object.keys(updated).length} 条`)
await client.close()
