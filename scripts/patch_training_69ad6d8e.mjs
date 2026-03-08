/**
 * 完善训练计划: 输入输出与变量基础
 * docId: 69ad6d8eb4820e76092ac43d  domainId: gesp1  docType: 40
 *
 * 对应课程章节（Level 1, 第1~3单元）:
 *   01_第一次交互 (IO基础)
 *     1-1-1  Hello World (cout输出)    → pids: [1, 2, 3, 4]
 *     1-1-2  代码的注释 (//)           → 理论课，无专属题目，pids: [1]
 *     1-1-3  输出练习                  → pids: [5, 6, 7, 8, 9]
 *   02_整数的盒子 (变量基础)
 *     1-2-1  什么是变量 (int 定义)     → pids: [10, 11, 12]
 *     1-2-2  交换两个变量              → pids: [422]
 *   03_数据的输入 (交互)
 *     1-3-1  cin 读取整数              → pids: [13]
 *     1-3-2  一次读取多个数据          → pids: [14, 21, 423]
 */

import { MongoClient, ObjectId } from 'mongodb'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const uri = process.env.HYDRO_MONGODB_URI || process.env.MONGODB_URI
if (!uri) throw new Error('HYDRO_MONGODB_URI 未配置')

const TARGET_ID = '69ad6d8eb4820e76092ac43d'

const newDag = [
  // ── 单元一：第一次交互 (IO基础) ───────────────────────────────────────
  {
    _id: 1,
    title: 'Hello World (cout输出)',
    requireNids: [],
    pids: [1],
  },
  {
    _id: 2,
    title: '代码的注释 (//)',
    requireNids: [],
    pids: [1],
  },
  {
    _id: 3,
    title: '输出练习',
    requireNids: [],
    pids: [1],
  },
  // ── 单元二：整数的盒子 (变量基础) ────────────────────────────────────
  {
    _id: 4,
    title: '什么是变量 (int 定义)',
    requireNids: [],
    pids: [1],
  },
  {
    _id: 5,
    title: '交换两个变量',
    requireNids: [],
    pids: [1],
  },
  // ── 单元三：数据的输入 (交互) ─────────────────────────────────────────
  {
    _id: 6,
    title: 'cin 读取整数',
    requireNids: [],
    pids: [1],
  },
  {
    _id: 7,
    title: '一次读取多个数据',
    requireNids: [],
    pids: [1],
  },
]

;(async () => {
  const client = new MongoClient(uri)
  try {
    await client.connect()
    const db = client.db()
    const col = db.collection('document')

    // 先确认文档存在
    const before = await col.findOne({ _id: new ObjectId(TARGET_ID) })
    if (!before) throw new Error(`未找到文档 ${TARGET_ID}`)
    console.log('当前 dag 节点数:', before.dag?.length ?? 0)
    console.log('标题:', before.title)

    // 执行更新
    const result = await col.updateOne(
      { _id: new ObjectId(TARGET_ID) },
      { $set: { dag: newDag } }
    )
    console.log(`\n更新结果: matched=${result.matchedCount} modified=${result.modifiedCount}`)

    // 读回验证
    const after = await col.findOne({ _id: new ObjectId(TARGET_ID) })
    console.log('\n更新后 dag 节点数:', after.dag.length)
    after.dag.forEach(n => {
      const req = n.requireNids.length ? `← [${n.requireNids}]` : '(起点)'
      console.log(`  节点 ${n._id}: ${n.title}  pids=[${n.pids}]  ${req}`)
    })
  } finally {
    await client.close()
  }
})()
