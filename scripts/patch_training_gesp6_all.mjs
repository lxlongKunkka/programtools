/**
 * patch_training_gesp6_all.mjs
 * 完善 gesp6 域全部 9 个训练计划的 dag 节点，对齐 Level6 课程体系（App DB 权威数据）
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
    _id: new ObjectId('69ad7e59b4820e76092ac78a'),
    title: '6.1 栈',
    dag: [
      { _id: 1, title: '栈的基本用法',             requireNids: [], pids: [1] },
      { _id: 2, title: '括号匹配与合法性判断',     requireNids: [], pids: [1] },
      { _id: 3, title: '栈的应用例题',             requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7e66b4820e76092ac78d'),
    title: '6.2 队列',
    dag: [
      { _id: 1, title: '队列基本用法',                 requireNids: [], pids: [1] },
      { _id: 2, title: '双端队列 deque',               requireNids: [], pids: [1] },
      { _id: 3, title: '队列的应用例题',               requireNids: [], pids: [1] },
      { _id: 4, title: '优先队列 priority_queue',      requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7e75b4820e76092ac790'),
    title: '6.3 树结构',
    dag: [
      { _id: 1, title: '树与二叉树概念',               requireNids: [], pids: [1] },
      { _id: 2, title: '二叉树遍历 (前中后)',           requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7e84b4820e76092ac792'),
    title: '6.4 哈夫曼树',
    dag: [
      { _id: 1, title: '哈夫曼树的构造',             requireNids: [], pids: [1] },
      { _id: 2, title: '哈夫曼编码与解码',           requireNids: [], pids: [1] },
      { _id: 3, title: '带权路径长度练习',           requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7e93b4820e76092ac796'),
    title: '6.5 图论基础',
    dag: [
      { _id: 1, title: '图的基本概念（顶点、边、有向图与无向图）', requireNids: [], pids: [1] },
      { _id: 2, title: '邻接矩阵与邻接表存储',                     requireNids: [], pids: [1] },
      { _id: 3, title: '链式前向星（数组模拟链表建图）',           requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7ea3b4820e76092ac798'),
    title: '6.6 DFS 深度优先搜索',
    dag: [
      { _id: 1, title: 'DFS 基本框架',         requireNids: [], pids: [1] },
      { _id: 2, title: '连通块与涂色问题',     requireNids: [], pids: [1] },
      { _id: 3, title: '路径枚举与剪枝',       requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7eb8b4820e76092ac79c'),
    title: '6.7 BFS 广度优先搜索',
    dag: [
      { _id: 1, title: 'BFS 基本框架',           requireNids: [], pids: [1] },
      { _id: 2, title: '迷宫最短路',             requireNids: [], pids: [1] },
      { _id: 3, title: '多源 BFS 与 0-1 BFS',   requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7ec7b4820e76092ac79e'),
    title: '6.8 动态规划基础',
    dag: [
      { _id: 1, title: '记忆化搜索',                   requireNids: [], pids: [1] },
      { _id: 2, title: '简单一维 DP',                  requireNids: [], pids: [1] },
      { _id: 3, title: '线性 DP 基础与状态设计',       requireNids: [], pids: [1] },
      { _id: 4, title: '最长递增子序列 LIS',           requireNids: [], pids: [1] },
      { _id: 5, title: '最长公共子序列 LCS',           requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7ed5b4820e76092ac79f'),
    title: '6.9 背包 DP',
    dag: [
      { _id: 1, title: '0-1 背包',   requireNids: [], pids: [1] },
      { _id: 2, title: '完全背包',   requireNids: [], pids: [1] },
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
