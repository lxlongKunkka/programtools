/**
 * 修补 gesp2 训练计划: 2.5 模拟
 * 69ad731bb4820e76092ac549
 *
 * curriculum_export/Level2/10_模拟 共 3 节:
 *   模拟思想与步骤拆解
 *   计数模拟类例题
 *   过程模拟类例题   ← DB 缺失，补上
 */

import { MongoClient, ObjectId } from 'mongodb'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const uri = process.env.HYDRO_MONGODB_URI || process.env.MONGODB_URI
if (!uri) throw new Error('HYDRO_MONGODB_URI 未配置')

const TARGET_ID = '69ad731bb4820e76092ac549'

const newDag = [
  { _id: 1, title: '模拟思想与步骤拆解', requireNids: [], pids: [1] },
  { _id: 2, title: '计数模拟类例题',     requireNids: [], pids: [1] },
  { _id: 3, title: '过程模拟类例题',     requireNids: [], pids: [1] },
]

const newDescription = '模拟思想与步骤拆解，计数模拟类例题，过程模拟类例题——系统掌握模拟算法的核心方法。'

;(async () => {
  const client = new MongoClient(uri)
  try {
    await client.connect()
    const col = client.db().collection('document')

    const before = await col.findOne({ _id: new ObjectId(TARGET_ID) })
    if (!before) throw new Error(`未找到 ${TARGET_ID}`)
    console.log('修改前:', before.dag.map(n => n.title))

    await col.updateOne(
      { _id: new ObjectId(TARGET_ID) },
      { $set: { dag: newDag, description: newDescription, content: newDescription } }
    )

    const after = await col.findOne({ _id: new ObjectId(TARGET_ID) })
    console.log('修改后:', after.dag.map(n => n.title))
  } finally {
    await client.close()
  }
})()
