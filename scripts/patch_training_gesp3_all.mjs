/**
 * patch_training_gesp3_all.mjs
 * 完善 gesp3 域全部 6 个训练计划的 dag 节点，对齐 Level3 课程体系
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

const plans = [
  {
    _id: new ObjectId('69ad7a97b4820e76092ac6d7'),
    title: '3.1 数组基础与应用',
    dag: [
      { _id: 1, title: '一维数组定义与访问',       requireNids: [], pids: [1] },
      { _id: 2, title: '数组遍历与求和',            requireNids: [], pids: [1] },
      { _id: 3, title: '一维数组强化练习',          requireNids: [], pids: [1] },
      { _id: 4, title: '数组找最大/最小值',         requireNids: [], pids: [1] },
      { _id: 5, title: '数组计数 (桶的思想)',       requireNids: [], pids: [1] },
      { _id: 6, title: '一维数组综合练习',          requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7ab5b4820e76092ac6dc'),
    title: '3.2 字符串处理',
    dag: [
      { _id: 1, title: '字符数组',                  requireNids: [], pids: [1] },
      { _id: 2, title: 'string',                    requireNids: [], pids: [1] },
      { _id: 3, title: '字符数组 vs string',        requireNids: [], pids: [1] },
      { _id: 4, title: '字符串遍历与统计',          requireNids: [], pids: [1] },
      { _id: 5, title: '字符串查找与替换',          requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7accb4820e76092ac6dd'),
    title: '3.3 进制与编码',
    dag: [
      { _id: 1, title: '二进制与十进制转换',        requireNids: [], pids: [1] },
      { _id: 2, title: '8进制与16进制',             requireNids: [], pids: [1] },
      { _id: 3, title: '原码、反码、补码',          requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7ae3b4820e76092ac6df'),
    title: '3.4 位运算',
    dag: [
      { _id: 1, title: '按位与(&)、或(|)、异或(^)', requireNids: [], pids: [1] },
      { _id: 2, title: '左移(<<) 与 右移(>>)',      requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7b15b4820e76092ac6e9'),
    title: '3.5 枚举进阶',
    dag: [
      { _id: 1, title: '多维枚举与数组结合',        requireNids: [], pids: [1] },
      { _id: 2, title: '子集枚举（位运算辅助）',    requireNids: [], pids: [1] },
      { _id: 3, title: '枚举剪枝与效率分析',        requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7b24b4820e76092ac6ea'),
    title: '3.6 模拟进阶',
    dag: [
      { _id: 1, title: '数组模拟栈/队列',           requireNids: [], pids: [1] },
      { _id: 2, title: '矩阵/方格模拟',             requireNids: [], pids: [1] },
      { _id: 3, title: '字符串模拟类例题',          requireNids: [], pids: [1] },
    ],
  },
]

const client = new MongoClient(env.HYDRO_MONGODB_URI)
try {
  await client.connect()
  const col = client.db().collection('document')
  for (const p of plans) {
    const doc = await col.findOne({ _id: p._id })
    const result = await col.updateOne({ _id: p._id }, { $set: { dag: p.dag } })
    console.log(`[${p.title}] ${doc?.dag?.length ?? 0} → ${p.dag.length} 节  matched=${result.matchedCount} modified=${result.modifiedCount}`)
    p.dag.forEach(n => console.log(`  ${n._id}. ${n.title}`))
  }
} finally {
  await client.close()
}
