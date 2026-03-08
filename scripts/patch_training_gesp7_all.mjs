/**
 * patch_training_gesp7_all.mjs
 * 完善 gesp7 域全部 11 个训练计划的 dag 节点，对齐 Level7 课程体系（App DB 权威数据）
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
    _id: new ObjectId('69ad7f02b4820e76092ac7a6'),
    title: '7.1 DFS 进阶',
    dag: [
      { _id: 1, title: '全排列与回溯',         requireNids: [], pids: [1] },
      { _id: 2, title: '子集生成与组合枚举',   requireNids: [], pids: [1] },
      { _id: 3, title: '剪枝技巧与优化',       requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7f14b4820e76092ac7a7'),
    title: '7.2 BFS 进阶',
    dag: [
      { _id: 1, title: '多源 BFS 与泛洪算法', requireNids: [], pids: [1] },
      { _id: 2, title: '双向 BFS',            requireNids: [], pids: [1] },
      { _id: 3, title: 'A* 思想入门',         requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7f24b4820e76092ac7aa'),
    title: '7.3 矩阵快速幂',
    dag: [
      { _id: 1, title: '矩阵乘法基础',                   requireNids: [], pids: [1] },
      { _id: 2, title: '矩阵快速幂加速线性递推',         requireNids: [], pids: [1] },
      { _id: 3, title: '矩阵快速幂应用例题',             requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7f34b4820e76092ac7ab'),
    title: '7.4 倍增与 LCA',
    dag: [
      { _id: 1, title: '倍增法基础',                       requireNids: [], pids: [1] },
      { _id: 2, title: '最近公共祖先（LCA）',              requireNids: [], pids: [1] },
      { _id: 3, title: 'LCA 的应用：树上路径距离',         requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7f4ab4820e76092ac7ac'),
    title: '7.5 离散化与 ST 表',
    dag: [
      { _id: 1, title: '离散化（坐标压缩）',   requireNids: [], pids: [1] },
      { _id: 2, title: 'ST 表与稀疏表',        requireNids: [], pids: [1] },
      { _id: 3, title: 'RMQ 综合例题',         requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7f5bb4820e76092ac7ae'),
    title: '7.6 哈希',
    dag: [
      { _id: 1, title: '哈希表与冲突处理',             requireNids: [], pids: [1] },
      { _id: 2, title: '字符串哈希（多项式哈希）',     requireNids: [], pids: [1] },
      { _id: 3, title: '哈希应用例题',                 requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7f6eb4820e76092ac7b1'),
    title: '7.7 表达式求值',
    dag: [
      { _id: 1, title: '后缀（逆波兰）表达式计算',   requireNids: [], pids: [1] },
      { _id: 2, title: '中缀表达式转后缀',           requireNids: [], pids: [1] },
      { _id: 3, title: '带括号的表达式求值',         requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7f81b4820e76092ac7b5'),
    title: '7.8 单调栈与单调队列',
    dag: [
      { _id: 1, title: '单调栈（下一个更大/更小元素）',  requireNids: [], pids: [1] },
      { _id: 2, title: '单调队列（滑动窗口最值）',       requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7f91b4820e76092ac7c1'),
    title: '7.9 区间 DP',
    dag: [
      { _id: 1, title: '区间 DP 基本框架',             requireNids: [], pids: [1] },
      { _id: 2, title: '石子归并问题',                 requireNids: [], pids: [1] },
      { _id: 3, title: '括号合并与字符串区间DP',       requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7fa3b4820e76092ac7c5'),
    title: '7.10 树上 DP',
    dag: [
      { _id: 1, title: '树形 DP 基础框架',         requireNids: [], pids: [1] },
      { _id: 2, title: '树上独立集与点覆盖',       requireNids: [], pids: [1] },
      { _id: 3, title: '树上路径与直径DP',         requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7feeb4820e76092ac7cd'),
    title: '7.11 二维 DP',
    dag: [
      { _id: 1, title: '二维 DP 基础（方格路径）',  requireNids: [], pids: [1] },
      { _id: 2, title: '编辑距离',                  requireNids: [], pids: [1] },
      { _id: 3, title: '二维 DP 综合例题',          requireNids: [], pids: [1] },
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
