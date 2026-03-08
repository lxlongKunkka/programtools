/**
 * patch_training_gesp9_all.mjs
 * 完善 gesp9 域全部 11 个训练计划的 dag 节点，对齐 Level9 课程体系（App DB 权威数据）
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
    _id: new ObjectId('69ad823bb4820e76092ac852'),
    title: '9.1 字符串算法',
    dag: [
      { _id: 1, title: 'KMP 字符串匹配',             requireNids: [], pids: [1] },
      { _id: 2, title: 'Z 函数（扩展 KMP）',          requireNids: [], pids: [1] },
      { _id: 3, title: 'Trie 字典树',                 requireNids: [], pids: [1] },
      { _id: 4, title: 'AC 自动机（多模式串匹配）',   requireNids: [], pids: [1] },
      { _id: 5, title: 'Manacher 回文算法',            requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad8252b4820e76092ac854'),
    title: '9.2 搜索进阶与贪心',
    dag: [
      { _id: 1, title: '迭代加深搜索（IDA*）',         requireNids: [], pids: [1] },
      { _id: 2, title: '反悔贪心与可撤销决策',         requireNids: [], pids: [1] },
      { _id: 3, title: '随机化算法入门',               requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad8262b4820e76092ac85a'),
    title: '9.3 数论进阶',
    dag: [
      { _id: 1, title: '数论分块（整除分块）',             requireNids: [], pids: [1] },
      { _id: 2, title: '扩展 GCD 与裴蜀定理',              requireNids: [], pids: [1] },
      { _id: 3, title: 'BSGS 大步小步算法',                requireNids: [], pids: [1] },
      { _id: 4, title: '中国剩余定理（CRT）',               requireNids: [], pids: [1] },
      { _id: 5, title: 'Lucas 定理与大组合数取模',          requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad8271b4820e76092ac864'),
    title: '9.4 DP 进阶 · 状压与数位',
    dag: [
      { _id: 1, title: '状压 DP 基础',                             requireNids: [], pids: [1] },
      { _id: 2, title: '状压 DP 经典：TSP / 最小覆盖',             requireNids: [], pids: [1] },
      { _id: 3, title: '数位 DP 基础（不含前导零处理）',           requireNids: [], pids: [1] },
      { _id: 4, title: '数位 DP 进阶（前导零 & 限高位）',          requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad8285b4820e76092ac867'),
    title: '9.5 DP 进阶 · 概率期望与换根',
    dag: [
      { _id: 1, title: '概率 DP 基础',               requireNids: [], pids: [1] },
      { _id: 2, title: '期望 DP（逆推期望步数）',     requireNids: [], pids: [1] },
      { _id: 3, title: '换根 DP（全树最优根）',       requireNids: [], pids: [1] },
      { _id: 4, title: '计数 DP 基础',               requireNids: [], pids: [1] },
      { _id: 5, title: '树上背包 DP',                requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad8298b4820e76092ac868'),
    title: '9.6 DP 优化',
    dag: [
      { _id: 1, title: '单调队列优化 DP',             requireNids: [], pids: [1] },
      { _id: 2, title: '斜率优化 DP（CHT 凸包）',     requireNids: [], pids: [1] },
      { _id: 3, title: 'Li Chao 线段树',              requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad82aab4820e76092ac86a'),
    title: '9.7 高级分治与根号算法',
    dag: [
      { _id: 1, title: '树链剖分（重链剖分）',         requireNids: [], pids: [1] },
      { _id: 2, title: '分块（根号分治）',             requireNids: [], pids: [1] },
      { _id: 3, title: '普通莫队',                     requireNids: [], pids: [1] },
      { _id: 4, title: 'CDQ 分治（离线三维偏序）',     requireNids: [], pids: [1] },
      { _id: 5, title: '整体二分',                     requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad82ccb4820e76092ac876'),
    title: '9.8 图论进阶',
    dag: [
      { _id: 1, title: 'Tarjan 强连通分量（SCC）与缩点', requireNids: [], pids: [1] },
      { _id: 2, title: '双连通分量、割点与桥',            requireNids: [], pids: [1] },
      { _id: 3, title: '欧拉路与欧拉回路',               requireNids: [], pids: [1] },
      { _id: 4, title: '2-SAT 布尔可满足',               requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad82d8b4820e76092ac877'),
    title: '9.9 网络流与二分图',
    dag: [
      { _id: 1, title: '二分图判断与匈牙利算法',           requireNids: [], pids: [1] },
      { _id: 2, title: 'Dinic 最大流算法',                requireNids: [], pids: [1] },
      { _id: 3, title: '最小割与最大流最小割定理',         requireNids: [], pids: [1] },
      { _id: 4, title: '网络流建模例题',                   requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad82ebb4820e76092ac879'),
    title: '9.10 数学进阶',
    dag: [
      { _id: 1, title: '高斯消元法',                   requireNids: [], pids: [1] },
      { _id: 2, title: 'Nim 游戏与 SG 函数',           requireNids: [], pids: [1] },
      { _id: 3, title: '计算几何：点积叉积与凸包',     requireNids: [], pids: [1] },
      { _id: 4, title: '异或线性基',                   requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad82fab4820e76092ac87c'),
    title: '9.11 线段树进阶',
    dag: [
      { _id: 1, title: '可持久化线段树',           requireNids: [], pids: [1] },
      { _id: 2, title: '归并排序树与分块树',       requireNids: [], pids: [1] },
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
