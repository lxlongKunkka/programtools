/**
 * patch_training_gesp10_all.mjs
 * 完善 gesp10 域全部 10 个训练计划的 dag 节点，对齐 Level10 课程体系（App DB 权威数据）
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
    _id: new ObjectId('69ad832ab4820e76092ac880'),
    title: '10.1 字符串高级',
    dag: [
      { _id: 1, title: '后缀数组（SA）的构造与 LCP 数组', requireNids: [], pids: [1] },
      { _id: 2, title: '后缀自动机（SAM）',               requireNids: [], pids: [1] },
      { _id: 3, title: '广义 SAM（多串共用）',            requireNids: [], pids: [1] },
      { _id: 4, title: '字符串高级综合例题',              requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad8335b4820e76092ac88d'),
    title: '10.2 可持久化数据结构进阶',
    dag: [
      { _id: 1, title: '可持久化并查集',               requireNids: [], pids: [1] },
      { _id: 2, title: '可持久化数据结构综合例题',     requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad8347b4820e76092ac890'),
    title: '10.3 高级数据结构',
    dag: [
      { _id: 1, title: '左偏树（可合并堆）',             requireNids: [], pids: [1] },
      { _id: 2, title: '线段树合并（动态开点）',         requireNids: [], pids: [1] },
      { _id: 3, title: '线段树分裂',                     requireNids: [], pids: [1] },
      { _id: 4, title: '树套树（线段树套线段树）',       requireNids: [], pids: [1] },
      { _id: 5, title: 'KD 树（多维最近邻）',            requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad8362b4820e76092ac892'),
    title: '10.4 LCT 动态树',
    dag: [
      { _id: 1, title: 'LCT 基本原理与 Access/makeRoot', requireNids: [], pids: [1] },
      { _id: 2, title: 'LCT 实现链接/断开',              requireNids: [], pids: [1] },
      { _id: 3, title: 'LCT 综合例题',                   requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad8383b4820e76092ac895'),
    title: '10.5 树上高级算法',
    dag: [
      { _id: 1, title: '点分治（树上路径统计）',           requireNids: [], pids: [1] },
      { _id: 2, title: '树上启发式合并（DSU on Tree）',    requireNids: [], pids: [1] },
      { _id: 3, title: '虚树（关键点构造）',               requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad838fb4820e76092ac896'),
    title: '10.6 DP 极限优化',
    dag: [
      { _id: 1, title: '四边形不等式优化（决策单调性）',   requireNids: [], pids: [1] },
      { _id: 2, title: 'WQS 二分（λ 优化 DP）',           requireNids: [], pids: [1] },
      { _id: 3, title: '综合例题',                         requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad839eb4820e76092ac897'),
    title: '10.7 多项式算法',
    dag: [
      { _id: 1, title: 'FFT 原理与实现',               requireNids: [], pids: [1] },
      { _id: 2, title: 'NTT（模意义下的 FFT）',         requireNids: [], pids: [1] },
      { _id: 3, title: '多项式乘法与卷积应用',          requireNids: [], pids: [1] },
      { _id: 4, title: '多项式求逆与 exp（选读）',      requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad83c1b4820e76092ac898'),
    title: '10.8 高级数论',
    dag: [
      { _id: 1, title: '积性函数与狄利克雷卷积',       requireNids: [], pids: [1] },
      { _id: 2, title: '莫比乌斯函数与莫比乌斯反演',   requireNids: [], pids: [1] },
      { _id: 3, title: '原根与离散对数',               requireNids: [], pids: [1] },
      { _id: 4, title: '高级数论综合例题',             requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad83d0b4820e76092ac899'),
    title: '10.9 高级组合数学',
    dag: [
      { _id: 1, title: '第一/第二类斯特林数',           requireNids: [], pids: [1] },
      { _id: 2, title: '普通母函数（OGF）',             requireNids: [], pids: [1] },
      { _id: 3, title: '指数母函数（EGF）',             requireNids: [], pids: [1] },
      { _id: 4, title: 'Burnside 引理与 Polya 定理',    requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad83e4b4820e76092ac89b'),
    title: '10.10 计算几何高级',
    dag: [
      { _id: 1, title: '半平面交求可行区域',   requireNids: [], pids: [1] },
      { _id: 2, title: '旋转卡壳（最远点对）', requireNids: [], pids: [1] },
      { _id: 3, title: '闵可夫斯基和',         requireNids: [], pids: [1] },
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
