/**
 * 为 gesp1 域批量新建训练计划（第 04～09 单元）
 * 对应 Level1_GESP 一级 (语法与顺序逻辑) 中除已有训练计划外的所有单元
 */

import { MongoClient, ObjectId } from 'mongodb'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const uri = process.env.HYDRO_MONGODB_URI || process.env.MONGODB_URI
if (!uri) throw new Error('HYDRO_MONGODB_URI 未配置')

const OWNER = 7
const DOMAIN = 'gesp1'
const DOC_TYPE = 40

const plans = [
  // ── 04_计算机算术 (运算) ──────────────────────────────────────────────
  {
    title: '计算机算术与运算',
    description: '从加减乘除到取余、复合赋值，掌握 C++ 中最基础的算术运算体系。',
    dag: [
      { _id: 1, title: '加减乘除 (+ - * /)', requireNids: [], pids: [1] },
      { _id: 2, title: '取余运算 (%) 的妙用', requireNids: [], pids: [1] },
      { _id: 3, title: '取余运算练习', requireNids: [], pids: [1] },
      { _id: 4, title: '复合赋值 (+=, -=)', requireNids: [], pids: [1] },
    ],
  },
  // ── 05_更多数据类型 ───────────────────────────────────────────────────
  {
    title: '更多数据类型',
    description: '探索 double、char、bool 等数据类型，以及 scanf/printf 的格式化输入输出。',
    dag: [
      { _id: 1, title: '小数类型 (double)', requireNids: [], pids: [1] },
      { _id: 2, title: '算术运算练习', requireNids: [], pids: [1] },
      { _id: 3, title: '字符类型 (char) 与 ASCII', requireNids: [], pids: [1] },
      { _id: 4, title: '布尔类型 (bool) 与比较运算', requireNids: [], pids: [1] },
      { _id: 5, title: 'scanf 和 printf', requireNids: [], pids: [1] },
      { _id: 6, title: 'scanf 和 printf 真题练习', requireNids: [], pids: [1] },
    ],
  },
  // ── 06_简单的逻辑 (分支与循环) ───────────────────────────────────────
  {
    title: '简单的逻辑：分支与循环',
    description: '初识 if/if-else 条件判断与 for 循环，编写能做决策、能重复的程序。',
    dag: [
      { _id: 1, title: 'if 判断语句', requireNids: [], pids: [1] },
      { _id: 2, title: 'if-else 双分支', requireNids: [], pids: [1] },
      { _id: 3, title: 'for 循环基础', requireNids: [], pids: [1] },
      { _id: 4, title: '函数初探', requireNids: [], pids: [1] },
    ],
  },
  // ── 07_条件结构专题 ───────────────────────────────────────────────────
  {
    title: '条件结构专题',
    description: '深入练习 if/else if/switch 多分支结构，攻克条件判断类题目。',
    dag: [
      { _id: 1, title: 'if / else 单分支与双分支', requireNids: [], pids: [1] },
      { _id: 2, title: '多分支 if-else if 与 switch', requireNids: [], pids: [1] },
      { _id: 3, title: '条件结构综合例题', requireNids: [], pids: [1] },
    ],
  },
  // ── 08_循环结构专题 ───────────────────────────────────────────────────
  {
    title: '循环结构专题',
    description: '系统训练 for、while、do-while，以及 break/continue 循环控制。',
    dag: [
      { _id: 1, title: 'for 循环基础', requireNids: [], pids: [1] },
      { _id: 2, title: 'while 与 do-while 循环', requireNids: [], pids: [1] },
      { _id: 3, title: 'break / continue 与循环控制', requireNids: [], pids: [1] },
    ],
  },
  // ── 09_数学基础 ───────────────────────────────────────────────────────
  {
    title: '数学基础',
    description: '整除与取模、浮点数精度、绝对值——夯实编程竞赛所需的数学基础。',
    dag: [
      { _id: 1, title: '整除与取模', requireNids: [], pids: [1] },
      { _id: 2, title: '四舍五入与浮点数精度', requireNids: [], pids: [1] },
      { _id: 3, title: '绝对值与数学基础综合例题', requireNids: [], pids: [1] },
    ],
  },
]

;(async () => {
  const client = new MongoClient(uri)
  try {
    await client.connect()
    const db = client.db()
    const col = db.collection('document')

    for (const plan of plans) {
      const oid = new ObjectId()
      const doc = {
        _id: oid,
        docId: oid.toHexString(),
        domainId: DOMAIN,
        docType: DOC_TYPE,
        owner: OWNER,
        title: plan.title,
        description: plan.description,
        content: plan.description,
        dag: plan.dag,
        attend: 0,
        pin: 0,
      }
      await col.insertOne(doc)
      console.log(`✓ 已创建: [${oid.toHexString()}] ${plan.title}  (${plan.dag.length} 节)`)
    }

    console.log(`\n共新建 ${plans.length} 个训练计划。`)
  } finally {
    await client.close()
  }
})()
