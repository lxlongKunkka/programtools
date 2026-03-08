/**
 * 完善 gesp2 剩余 4 个训练计划
 *
 * 2.2 ASCII 编码与字符处理  69ad72c0b4820e76092ac543  ← 07_ASCII 编码与字符处理
 * 2.3 数学函数              69ad72d4b4820e76092ac545  ← 08_数学函数
 * 2.4 枚举                  69ad7306b4820e76092ac548  ← 09_暴力枚举
 * 2.5 模拟                  69ad731bb4820e76092ac549  ← 10_模拟
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
  {
    id: '69ad72c0b4820e76092ac543',
    description: 'ASCII 编码表与字符读取，字符与整数的相互转换，字符判断与大小写转换。',
    dag: [
      { _id: 1, title: 'ASCII 编码表与字符读取',     requireNids: [], pids: [1] },
      { _id: 2, title: '字符与整数的相互转换',       requireNids: [], pids: [1] },
      { _id: 3, title: '字符判断与大小写转换',       requireNids: [], pids: [1] },
    ],
  },
  {
    id: '69ad72d4b4820e76092ac545',
    description: 'max/min 比较函数，sqrt/pow/abs 的用法，floor/ceil/round 取整函数。',
    dag: [
      { _id: 1, title: 'max / min 与比较函数',       requireNids: [], pids: [1] },
      { _id: 2, title: 'sqrt / pow / abs 的用法',    requireNids: [], pids: [1] },
      { _id: 3, title: 'floor / ceil / round 取整函数', requireNids: [], pids: [1] },
    ],
  },
  {
    id: '69ad7306b4820e76092ac548',
    description: '从单层枚举到双重、三重枚举，结合综合例题掌握暴力枚举的核心思路。',
    dag: [
      { _id: 1, title: '单层枚举基础',               requireNids: [], pids: [1] },
      { _id: 2, title: '双重枚举与三重枚举',         requireNids: [], pids: [1] },
      { _id: 3, title: '枚举综合例题',               requireNids: [], pids: [1] },
    ],
  },
  {
    id: '69ad731bb4820e76092ac549',
    description: '模拟思想与步骤拆解，计数模拟类例题练习。',
    dag: [
      { _id: 1, title: '模拟思想与步骤拆解',         requireNids: [], pids: [1] },
      { _id: 2, title: '计数模拟类例题',             requireNids: [], pids: [1] },
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
      console.log(`✓ [${p.id.slice(-8)}] ${before.title}  ${before.dag?.length ?? 0}节 → ${p.dag.length}节  modified=${result.modifiedCount}`)
    }
  } finally {
    await client.close()
  }
})()
