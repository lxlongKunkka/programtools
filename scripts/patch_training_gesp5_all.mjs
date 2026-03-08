/**
 * patch_training_gesp5_all.mjs
 * 完善 gesp5 域全部 10 个训练计划的 dag 节点，对齐 Level5 课程体系（App DB 权威数据）
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
    _id: new ObjectId('69ad7d81b4820e76092ac766'),
    title: '5.1 STL 容器',
    dag: [
      { _id: 1, title: 'STL',                          requireNids: [], pids: [1] },
      { _id: 2, title: 'vector 与 pair 基础用法',      requireNids: [], pids: [1] },
      { _id: 3, title: 'set / map 的遍历与查找',       requireNids: [], pids: [1] },
      { _id: 4, title: 'priority_queue 优先队列',      requireNids: [], pids: [1] },
      { _id: 5, title: 'list 与 deque 的使用场景',     requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7d98b4820e76092ac76e'),
    title: '5.2 数学基础',
    dag: [
      { _id: 1, title: '质数判定 (试除法)',        requireNids: [], pids: [1] },
      { _id: 2, title: '埃氏筛法与线性筛',         requireNids: [], pids: [1] },
      { _id: 3, title: 'GCD 与 LCM',              requireNids: [], pids: [1] },
      { _id: 4, title: '质因数分解',               requireNids: [], pids: [1] },
      { _id: 5, title: '模和同余',                 requireNids: [], pids: [1] },
      { _id: 6, title: '排列与组合公式',           requireNids: [], pids: [1] },
      { _id: 7, title: '杨辉三角与组合数',         requireNids: [], pids: [1] },
      { _id: 8, title: '快速幂基础',               requireNids: [], pids: [1] },
      { _id: 9, title: '快速幂应用例题',           requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7da9b4820e76092ac76f'),
    title: '5.3 高精度运算',
    dag: [
      { _id: 1, title: '高精度加法',   requireNids: [], pids: [1] },
      { _id: 2, title: '高精度减法',   requireNids: [], pids: [1] },
      { _id: 3, title: '高精度乘法',   requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7dbab4820e76092ac772'),
    title: '5.4 前缀和差分',
    dag: [
      { _id: 1, title: '前缀和基础',               requireNids: [], pids: [1] },
      { _id: 2, title: '差分数组基础',             requireNids: [], pids: [1] },
      { _id: 3, title: '区间更新与查询综合应用',   requireNids: [], pids: [1] },
      { _id: 4, title: '二维前缀和与差分扩展',     requireNids: [], pids: [1] },
      { _id: 5, title: '前缀和差分练习',           requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7dc8b4820e76092ac773'),
    title: '5.5 二分法',
    dag: [
      { _id: 1, title: '二分查找 (Binary Search)',  requireNids: [], pids: [1] },
      { _id: 2, title: '二分答案',                  requireNids: [], pids: [1] },
      { _id: 3, title: '浮点数二分',               requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7dd7b4820e76092ac778'),
    title: '5.6 三分法',
    dag: [
      { _id: 1, title: '整数三分',             requireNids: [], pids: [1] },
      { _id: 2, title: '实数三分与精度控制',   requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7de9b4820e76092ac779'),
    title: '5.7 双指针',
    dag: [
      { _id: 1, title: '相向双指针',             requireNids: [], pids: [1] },
      { _id: 2, title: '同向双指针（滑动窗口）', requireNids: [], pids: [1] },
      { _id: 3, title: '双指针综合例题',         requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7df8b4820e76092ac77b'),
    title: '5.8 贪心算法',
    dag: [
      { _id: 1,  title: '简单贪心策略',                   requireNids: [], pids: [1] },
      { _id: 2,  title: '最多能参加比赛数',               requireNids: [], pids: [1] },
      { _id: 3,  title: '驯鹿与雪橇2',                   requireNids: [], pids: [1] },
      { _id: 4,  title: '土拨鼠炒果子2',                 requireNids: [], pids: [1] },
      { _id: 5,  title: '奶牛玩杂技',                     requireNids: [], pids: [1] },
      { _id: 6,  title: '数列均衡',                       requireNids: [], pids: [1] },
      { _id: 7,  title: '修改序列',                       requireNids: [], pids: [1] },
      { _id: 8,  title: '货币兑换',                       requireNids: [], pids: [1] },
      { _id: 9,  title: '火车旅行',                       requireNids: [], pids: [1] },
      { _id: 10, title: '冰淇淋最大满足度选择',           requireNids: [], pids: [1] },
      { _id: 11, title: '玩具收纳：最小新箱子尺寸',       requireNids: [], pids: [1] },
      { _id: 12, title: '机器人工厂',                     requireNids: [], pids: [1] },
      { _id: 13, title: '可乐瓶兑换贴纸最大化',           requireNids: [], pids: [1] },
      { _id: 14, title: '信号强度',                       requireNids: [], pids: [1] },
      { _id: 15, title: '分发糖果',                       requireNids: [], pids: [1] },
      { _id: 16, title: 'kunkka的赌场策略',               requireNids: [], pids: [1] },
      { _id: 17, title: '贪心练习',                       requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7e09b4820e76092ac77d'),
    title: '5.9 递归算法',
    dag: [
      { _id: 1, title: '递归算法基本概念',               requireNids: [], pids: [1] },
      { _id: 2, title: '经典递归示例：阶乘与斐波那契',   requireNids: [], pids: [1] },
      { _id: 3, title: '分治策略与递归优化',             requireNids: [], pids: [1] },
      { _id: 4, title: '递归应用实例：汉诺塔与回溯',    requireNids: [], pids: [1] },
    ],
  },
  {
    _id: new ObjectId('69ad7e19b4820e76092ac780'),
    title: '5.10 分治算法',
    dag: [
      { _id: 1, title: '分治思想与归并排序',   requireNids: [], pids: [1] },
      { _id: 2, title: '逆序对统计',           requireNids: [], pids: [1] },
      { _id: 3, title: '经典分治例题',         requireNids: [], pids: [1] },
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
