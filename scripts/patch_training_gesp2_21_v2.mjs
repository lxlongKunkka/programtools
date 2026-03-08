/**
 * patch_training_gesp2_21_v2.mjs
 * 将 gesp2 域训练计划"2.1 循环进阶"从 6 节扩充到 13 节
 * 对应新课程体系 Level2/01_循环进阶 的 13 个章节
 */
import { MongoClient, ObjectId } from 'mongodb'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../server/.env')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => l.split('=').map(s => s.trim()))
)

const HYDRO_URI = env.HYDRO_MONGODB_URI
const DOC_ID = new ObjectId('69ad729db4820e76092ac537')

const newDag = [
  { _id: 1,  title: 'while 循环',              requireNids: [], pids: [1] },
  { _id: 2,  title: 'do-while 循环',           requireNids: [], pids: [1] },
  { _id: 3,  title: '循环累加',                requireNids: [], pids: [1] },
  { _id: 4,  title: '统计和最值',              requireNids: [], pids: [1] },
  { _id: 5,  title: 'break 与 continue',       requireNids: [], pids: [1] },
  { _id: 6,  title: '循环练习',                requireNids: [], pids: [1] },
  { _id: 7,  title: '拆解个位、十位、百位',   requireNids: [], pids: [1] },
  { _id: 8,  title: '水仙花数实战',            requireNids: [], pids: [1] },
  { _id: 9,  title: '数位分离练习',            requireNids: [], pids: [1] },
  { _id: 10, title: '双层 for 循环 (打印图形)', requireNids: [], pids: [1] },
  { _id: 11, title: '九九乘法表',              requireNids: [], pids: [1] },
  { _id: 12, title: '循环嵌套练习',            requireNids: [], pids: [1] },
  { _id: 13, title: '循环结构强化练习',        requireNids: [], pids: [1] },
]

const client = new MongoClient(HYDRO_URI)
try {
  await client.connect()
  const db = client.db()
  const col = db.collection('document')

  // 读取当前状态
  const doc = await col.findOne({ _id: DOC_ID })
  if (!doc) throw new Error('Document not found: ' + DOC_ID)
  console.log(`当前训练计划: [${doc.domainId}] ${doc.title}`)
  console.log(`当前 dag 节点数: ${doc.dag?.length ?? 0}`)

  const result = await col.updateOne(
    { _id: DOC_ID },
    { $set: { dag: newDag } }
  )
  console.log(`更新结果: matched=${result.matchedCount}, modified=${result.modifiedCount}`)
  console.log(`新 dag 节点数: ${newDag.length}`)
  newDag.forEach(n => console.log(`  ${n._id}. ${n.title}`))
} finally {
  await client.close()
}
