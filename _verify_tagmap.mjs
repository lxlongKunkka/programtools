// 验证 gespTagMap.json 中所有 chapterId 是否真实存在于 DB
// 并找出 chapter title 与 tag key 不一致的映射
import { MongoClient } from 'mongodb'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createRequire } from 'module'

const __dir = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

// load .env
const envRaw = readFileSync(join(__dir, 'server/.env'), 'utf8')
const uri = envRaw.match(/APP_MONGODB_URI=(.+)/)?.[1]?.trim()

const tagMap = JSON.parse(readFileSync(join(__dir, 'src/utils/gespTagMap.json'), 'utf8'))

const client = new MongoClient(uri)
await client.connect()
const db = client.db()
const col = db.collection('courselevels')

// 读取全部 level 的所有 chapter，建立 id→title 和 title→id 索引
const levels = await col.find({}).toArray()
const idToTitle = {}
const titleToId  = {}  // 用 chapter 所在 level 的 topic.name + chapter.title

for (const lv of levels) {
  const lvNum = lv.level
  if (!lv.topics) continue
  lv.topics.forEach((topic, ti) => {
    if (!topic.chapters) return
    topic.chapters.forEach((ch, ci) => {
      const id = `${lvNum}-${ti+1}-${ci+1}`
      idToTitle[id] = ch.title
      // 也可能用 chapter title 直接对应 tag
      if (!titleToId[ch.title]) titleToId[ch.title] = id
    })
  })
}

console.log(`DB 章节总数: ${Object.keys(idToTitle).length}`)
console.log('\n── tagMap 检查 ──')

const broken = []   // id 不存在
const mismatch = [] // id 存在但 title 不等于 key
const duplicate = []
const seen = {}

for (const [tag, id] of Object.entries(tagMap)) {
  if (seen[id]) duplicate.push(`重复 id ${id}: "${seen[id]}" 和 "${tag}"`)
  seen[id] = tag

  const title = idToTitle[id]
  if (!title) {
    broken.push(`❌ [${tag}] → ${id}  （id 不存在）`)
    // 尝试按 title 找正确的 id
    const correctId = titleToId[tag]
    if (correctId) broken[broken.length-1] += `  → 正确 id: ${correctId}`
  } else if (title !== tag) {
    mismatch.push(`⚠️  [${tag}] → ${id}  但该 id 对应章节是「${title}」`)
    const correctId = titleToId[tag]
    if (correctId) mismatch[mismatch.length-1] += `  → 按 title 找到: ${correctId}`
  }
}

if (broken.length)    { console.log('\n【id 不存在】'); broken.forEach(l => console.log(l)) }
if (mismatch.length)  { console.log('\n【id 存在但 title 不符】'); mismatch.forEach(l => console.log(l)) }
if (duplicate.length) { console.log('\n【重复 id】'); duplicate.forEach(l => console.log(l)) }
if (!broken.length && !mismatch.length) console.log('✅ 全部映射正确')

// 列出 tagMap 中不在 DB 的 tag（可能 title 不一致）
console.log('\n── 未被 tagMap 收录的 mmd 节点 label（供参考）──')
// 把 DB 所有存在的 title 也列出来供对比
const allTitles = new Set(Object.values(idToTitle))
const tagMapKeys = new Set(Object.keys(tagMap))
// 找出 DB 中存在但 tagMap 未收录的 title（仅限常见知识点）
// 不输出，让用户按需要修复 broken 的就行

await client.close()
