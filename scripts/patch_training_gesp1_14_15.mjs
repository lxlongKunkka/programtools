/**
 * patch_training_gesp1_14_15.mjs
 * 修复 gesp1 域：
 *   1.4 条件结构专题: 5节 → 10节（对齐课程体系）
 *   1.5 循环结构专题: 5节 → 3节（移除不存在章节，对齐课程体系）
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

const patches = [
  {
    _id: new ObjectId('69ad7095b4820e76092ac4b6'),
    title: '1.4 条件结构专题',
    dag: [
      { _id: 1,  title: 'if / else 单分支与双分支',  requireNids: [], pids: [1] },
      { _id: 2,  title: 'if-else if 多分支',          requireNids: [], pids: [1] },
      { _id: 3,  title: 'switch-case 语句',           requireNids: [], pids: [1] },
      { _id: 4,  title: '逻辑与 (&&)',                requireNids: [], pids: [1] },
      { _id: 5,  title: '逻辑或 (||) 与 非 (!)',      requireNids: [], pids: [1] },
      { _id: 6,  title: '闰年判断综合练习',           requireNids: [], pids: [1] },
      { _id: 7,  title: '条件嵌套语句',               requireNids: [], pids: [1] },
      { _id: 8,  title: '条件结构综合例题',           requireNids: [], pids: [1] },
      { _id: 9,  title: '条件结构强化练习1',          requireNids: [], pids: [1] },
      { _id: 10, title: '条件结构强化练习2',          requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad70a4b4820e76092ac4bd'),
    title: '1.5 循环结构专题',
    dag: [
      { _id: 1, title: 'for 循环基础',              requireNids: [], pids: [1] },
      { _id: 2, title: 'while 与 do-while 循环',    requireNids: [], pids: [1] },
      { _id: 3, title: 'break / continue 与循环控制', requireNids: [], pids: [1] },
    ],
  },
]

const client = new MongoClient(env.HYDRO_MONGODB_URI)
try {
  await client.connect()
  const col = client.db().collection('document')
  for (const p of patches) {
    const doc = await col.findOne({ _id: p._id })
    console.log(`\n[${p._id}] ${p.title}`)
    console.log(`  旧节点数: ${doc?.dag?.length ?? 0} → 新节点数: ${p.dag.length}`)
    const result = await col.updateOne({ _id: p._id }, { $set: { dag: p.dag } })
    console.log(`  matched=${result.matchedCount}, modified=${result.modifiedCount}`)
    p.dag.forEach(n => console.log(`    ${n._id}. ${n.title}`))
  }
} finally {
  await client.close()
}
