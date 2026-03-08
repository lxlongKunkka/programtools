/**
 * 修补 gesp2 训练计划: 2.1 循环进阶
 * 69ad729db4820e76092ac537
 *
 * 课程 03_循环进阶 共 6 节，DB 当前只有 5 节，补上「循环练习」
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
  { _id: 6, title: '循环练习',             requireNids: [], pids: [1] },
]

;(async () => {
  const client = new MongoClient(uri)
  try {
    await client.connect()
    const col = client.db().collection('document')
    const before = await col.findOne({ _id: new ObjectId(TARGET_ID) })
    if (!before) throw new Error(`未找到 ${TARGET_ID}`)
    console.log('修改前:', before.dag.map(n => n.title))

    await col.updateOne({ _id: new ObjectId(TARGET_ID) }, { $set: { dag: newDag } })

    const after = await col.findOne({ _id: new ObjectId(TARGET_ID) })
    console.log('修改后:', after.dag.map(n => n.title))
  } finally {
    await client.close()
  }
})()
