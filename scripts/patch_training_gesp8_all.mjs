/**
 * patch_training_gesp8_all.mjs
 * 完善 gesp8 域全部 12 个训练计划的 dag 节点，对齐 Level8 课程体系（App DB 权威数据）
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
    _id: new ObjectId('69ad8074b4820e76092ac7e3'),
    title: '8.1 数论进阶',
    dag: [
      { _id: 1, title: '欧拉函数与欧拉定理',                     requireNids: [], pids: [1] },
      { _id: 2, title: '乘法逆元（费马小定理 & 线性逆元）',      requireNids: [], pids: [1] },
      { _id: 3, title: '容斥原理',                               requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad808ab4820e76092ac7e4'),
    title: '8.2 并查集',
    dag: [
      { _id: 1, title: '并查集基础（路径压缩）',   requireNids: [], pids: [1] },
      { _id: 2, title: '带权并查集',               requireNids: [], pids: [1] },
      { _id: 3, title: '扩展并查集与应用',         requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad8097b4820e76092ac7e6'),
    title: '8.3 优先队列与堆',
    dag: [
      { _id: 1, title: '二叉堆与优先队列',       requireNids: [], pids: [1] },
      { _id: 2, title: '优先队列贪心例题',       requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad80a4b4820e76092ac7e7'),
    title: '8.4 Floyd 全源最短路',
    dag: [
      { _id: 1, title: 'Floyd 算法原理',     requireNids: [], pids: [1] },
      { _id: 2, title: '传递闭包',           requireNids: [], pids: [1] },
      { _id: 3, title: 'Floyd 综合例题',     requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad80b2b4820e76092ac7e8'),
    title: '8.5 最短路径',
    dag: [
      { _id: 1, title: 'Dijkstra 算法',                         requireNids: [], pids: [1] },
      { _id: 2, title: 'Bellman-Ford 算法与负权边处理',         requireNids: [], pids: [1] },
      { _id: 3, title: 'SPFA 算法与负环判断',                   requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad80c0b4820e76092ac7ea'),
    title: '8.6 最小生成树',
    dag: [
      { _id: 1, title: 'Prim 算法',               requireNids: [], pids: [1] },
      { _id: 2, title: 'Kruskal 算法 (并查集)',   requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad80ceb4820e76092ac7ec'),
    title: '8.7 拓扑排序',
    dag: [
      { _id: 1, title: '拓扑排序 BFS 实现',   requireNids: [], pids: [1] },
      { _id: 2, title: '拓扑排序判环',         requireNids: [], pids: [1] },
      { _id: 3, title: '拓扑排序上的 DP',      requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad80ddb4820e76092ac7ed'),
    title: '8.8 树的直径与重心',
    dag: [
      { _id: 1, title: '树的直径（两次 DFS）',       requireNids: [], pids: [1] },
      { _id: 2, title: '树的重心',                   requireNids: [], pids: [1] },
      { _id: 3, title: '直径与重心综合例题',         requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad80ecb4820e76092ac7ee'),
    title: '8.9 树上差分',
    dag: [
      { _id: 1, title: '树上点差分',           requireNids: [], pids: [1] },
      { _id: 2, title: '树上边差分',           requireNids: [], pids: [1] },
      { _id: 3, title: '树上差分综合例题',     requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad80feb4820e76092ac7ef'),
    title: '8.10 树状数组',
    dag: [
      { _id: 1, title: '树状数组（BIT）单点修改与区间查询', requireNids: [], pids: [1] },
      { _id: 2, title: '树状数组进阶（差分树状数组）',      requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad810cb4820e76092ac7f0'),
    title: '8.11 线段树',
    dag: [
      { _id: 1, title: '线段树基础与实现',     requireNids: [], pids: [1] },
      { _id: 2, title: '懒标记与区间更新',     requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad8130b4820e76092ac804'),
    title: '8.12 差分约束',
    dag: [
      { _id: 1, title: '差分约束系统原理',     requireNids: [], pids: [1] },
      { _id: 2, title: 'SPFA 判负环',          requireNids: [], pids: [1] },
      { _id: 3, title: '差分约束综合例题',     requireNids: [], pids: [1] },
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
