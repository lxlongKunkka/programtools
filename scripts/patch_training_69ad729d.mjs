/**
 * 完善 gesp2 训练计划: 2.1 循环进阶
 * docId: 69ad729db4820e76092ac537
 *
 * 对应单元: Level2 / 03_循环进阶
 *   while 循环
 *   do-while 循环
 *   循环累加
 *   统计和最值
 *   break 与 continue
 */

import { MongoClient, ObjectId } from 'mongodb'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const uri = process.env.HYDRO_MONGODB_URI || process.env.MONGODB_URI
if (!uri) throw new Error('HYDRO_MONGODB_URI 未配置')

const TARGET_ID = '69ad729db4820e76092ac537'

const newDag = [
  { _id: 1, title: 'while 循环',          requireNids: [], pids: [1] },
  { _id: 2, title: 'do-while 循环',        requireNids: [], pids: [1] },
  { _id: 3, title: '循环累加',             requireNids: [], pids: [1] },
  { _id: 4, title: '统计和最值',           requireNids: [], pids: [1] },
  { _id: 5, title: 'break 与 continue',   requireNids: [], pids: [1] },
]

const newDescription = 'while、do-while 循环的用法，循环累加与统计最值，以及 break/continue 的流程控制。'

;(async () => {
  const client = new MongoClient(uri)
  try {
    await client.connect()
    const col = client.db().collection('document')

    const before = await col.findOne({ _id: new ObjectId(TARGET_ID) })
    if (!before) throw new Error(`未找到文档 ${TARGET_ID}`)
    console.log('修改前 dag 节点数:', before.dag?.length ?? 0)

    const result = await col.updateOne(
      { _id: new ObjectId(TARGET_ID) },
      { $set: { dag: newDag, description: newDescription, content: newDescription } }
    )
    console.log(`更新结果: matched=${result.matchedCount} modified=${result.modifiedCount}`)

    const after = await col.findOne({ _id: new ObjectId(TARGET_ID) })
    console.log('修改后 dag 节点数:', after.dag.length)
    after.dag.forEach(n => console.log(`  节点 ${n._id}: ${n.title}`))
  } finally {
    await client.close()
  }
})()
