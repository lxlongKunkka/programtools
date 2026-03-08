/**
 * 完善 gesp1 剩余 4 个训练计划
 *
 * 运算与数学基础   69ad705db4820e76092ac4ac
 *   ← 04_计算机算术 (运算) + 09_数学基础
 *
 * 更多数据类型     69ad7086b4820e76092ac4b5
 *   ← 05_更多数据类型
 *
 * 条件结构专题     69ad7095b4820e76092ac4b6
 *   ← 06_简单的逻辑 (分支与循环) + 07_条件结构专题
 *
 * 循环结构专题     69ad70a4b4820e76092ac4bd
 *   ← 08_循环结构专题
 */

import { MongoClient, ObjectId } from 'mongodb'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const uri = process.env.HYDRO_MONGODB_URI || process.env.MONGODB_URI
if (!uri) throw new Error('HYDRO_MONGODB_URI 未配置')

const patches = [
  // ── 运算与数学基础 ────────────────────────────────────────────────────
  {
    id: '69ad705db4820e76092ac4ac',
    description: '从加减乘除到取余、复合赋值，再到整除、浮点精度与绝对值——建立扎实的运算与数学基础。',
    dag: [
      // 04_计算机算术 (运算)
      { _id: 1,  title: '加减乘除 (+ - * /)',       requireNids: [], pids: [1] },
      { _id: 2,  title: '取余运算 (%) 的妙用',       requireNids: [], pids: [1] },
      { _id: 3,  title: '取余运算练习',               requireNids: [], pids: [1] },
      { _id: 4,  title: '复合赋值 (+=, -=)',          requireNids: [], pids: [1] },
      // 09_数学基础
      { _id: 5,  title: '整除与取模',                 requireNids: [], pids: [1] },
      { _id: 6,  title: '四舍五入与浮点数精度',       requireNids: [], pids: [1] },
      { _id: 7,  title: '绝对值与数学基础综合例题',   requireNids: [], pids: [1] },
    ],
  },
  // ── 更多数据类型 ──────────────────────────────────────────────────────
  {
    id: '69ad7086b4820e76092ac4b5',
    description: '探索 double、char、bool 等数据类型，以及 scanf/printf 的格式化输入输出。',
    dag: [
      { _id: 1,  title: '小数类型 (double)',           requireNids: [], pids: [1] },
      { _id: 2,  title: '算术运算练习',                requireNids: [], pids: [1] },
      { _id: 3,  title: '字符类型 (char) 与 ASCII',    requireNids: [], pids: [1] },
      { _id: 4,  title: '布尔类型 (bool) 与比较运算',  requireNids: [], pids: [1] },
      { _id: 5,  title: 'scanf 和 printf',             requireNids: [], pids: [1] },
      { _id: 6,  title: 'scanf 和 printf 真题练习',    requireNids: [], pids: [1] },
    ],
  },
  // ── 条件结构专题 ──────────────────────────────────────────────────────
  {
    id: '69ad7095b4820e76092ac4b6',
    description: '从 if/else 到 switch 多分支，系统掌握条件结构的各种用法，攻克判断类题目。',
    dag: [
      // 06_简单的逻辑 — 条件部分
      { _id: 1,  title: 'if 判断语句',                       requireNids: [], pids: [1] },
      { _id: 2,  title: 'if-else 双分支',                    requireNids: [], pids: [1] },
      // 07_条件结构专题
      { _id: 3,  title: 'if / else 单分支与双分支',          requireNids: [], pids: [1] },
      { _id: 4,  title: '多分支 if-else if 与 switch',       requireNids: [], pids: [1] },
      { _id: 5,  title: '条件结构综合例题',                   requireNids: [], pids: [1] },
    ],
  },
  // ── 循环结构专题 ──────────────────────────────────────────────────────
  {
    id: '69ad70a4b4820e76092ac4bd',
    description: '系统训练 for、while、do-while，以及 break/continue 循环控制，并初探函数。',
    dag: [
      // 06_简单的逻辑 — 循环部分
      { _id: 1,  title: 'for 循环基础 (输出1-100)',          requireNids: [], pids: [1] },
      { _id: 2,  title: '函数初探',                          requireNids: [], pids: [1] },
      // 08_循环结构专题
      { _id: 3,  title: 'for 循环基础',                      requireNids: [], pids: [1] },
      { _id: 4,  title: 'while 与 do-while 循环',            requireNids: [], pids: [1] },
      { _id: 5,  title: 'break / continue 与循环控制',       requireNids: [], pids: [1] },
    ],
  },
]

;(async () => {
  const client = new MongoClient(uri)
  try {
    await client.connect()
    const col = client.db().collection('document')

    for (const p of patches) {
      const before = await col.findOne({ _id: new ObjectId(p.id) })
      if (!before) { console.warn(`⚠ 未找到 ${p.id}`); continue }

      const result = await col.updateOne(
        { _id: new ObjectId(p.id) },
        { $set: { dag: p.dag, description: p.description, content: p.description } }
      )
      console.log(`✓ [${p.id}] ${before.title}  ${before.dag?.length ?? 0}节 → ${p.dag.length}节  modified=${result.modifiedCount}`)
    }
  } finally {
    await client.close()
  }
})()
