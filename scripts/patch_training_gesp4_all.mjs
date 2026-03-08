/**
 * patch_training_gesp4_all.mjs
 * 完善 gesp4 域全部 7 个训练计划的 dag 节点，对齐 Level4 课程体系
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
    _id: new ObjectId('69ad7b78b4820e76092ac71b'),
    title: '4.1 函数编程',
    dag: [
      { _id: 1, title: '函数的定义与调用',       requireNids: [], pids: [1] },
      { _id: 2, title: '局部变量与全局变量',     requireNids: [], pids: [1] },
      { _id: 3, title: '值传递与引用传递',       requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7b90b4820e76092ac71e'),
    title: '4.2 二维数组',
    dag: [
      { _id: 1, title: '矩阵的定义与遍历',           requireNids: [], pids: [1] },
      { _id: 2, title: '杨辉三角 (二维数组版)',       requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7bacb4820e76092ac722'),
    title: '4.3 结构体',
    dag: [
      { _id: 1, title: 'struct 定义与使用',           requireNids: [], pids: [1] },
      { _id: 2, title: '结构体数组 (学生成绩表)',     requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7c43b4820e76092ac72b'),
    title: '4.4 指针与引用',
    dag: [
      { _id: 1, title: '指针的概念与基本操作',   requireNids: [], pids: [1] },
      { _id: 2, title: '指针与数组的关系',       requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7ca9b4820e76092ac733'),
    title: '4.5 算法复杂度',
    dag: [
      { _id: 1, title: '时间复杂度概念与 O 记号',                      requireNids: [], pids: [1] },
      { _id: 2, title: '常见复杂度量级 (O(1) O(n) O(n²) O(log n))',   requireNids: [], pids: [1] },
      { _id: 3, title: '复杂度估算与超时判断',                         requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7cc2b4820e76092ac735'),
    title: '4.6 排序算法',
    dag: [
      { _id: 1, title: '冒泡排序',         requireNids: [], pids: [1] },
      { _id: 2, title: '选择排序',         requireNids: [], pids: [1] },
      { _id: 3, title: '插入排序',         requireNids: [], pids: [1] },
      { _id: 4, title: 'sort 函数的使用',  requireNids: [], pids: [1] },
      { _id: 5, title: '结构体排序',       requireNids: [], pids: [1] },
      { _id: 6, title: '排序练习',         requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7cd1b4820e76092ac736'),
    title: '4.7 递推算法',
    dag: [
      { _id: 1, title: '斐波那契数列',   requireNids: [], pids: [1] },
      { _id: 2, title: '简单递推模型',   requireNids: [], pids: [1] },
      { _id: 3, title: '递推练习',       requireNids: [], pids: [1] },
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
