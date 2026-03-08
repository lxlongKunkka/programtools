import { MongoClient, ObjectId } from 'mongodb'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const uri = process.env.HYDRO_MONGODB_URI || process.env.MONGODB_URI

const ids = [
  '69ad6fdc7b5211962568b860',
  '69ad6fdc7b5211962568b861',
  '69ad6fdc7b5211962568b862',
  '69ad6fdc7b5211962568b863',
  '69ad6fdc7b5211962568b864',
  '69ad6fdc7b5211962568b865',
]

;(async () => {
  const client = new MongoClient(uri)
  await client.connect()
  const result = await client.db().collection('document').deleteMany({
    _id: { $in: ids.map(id => new ObjectId(id)) },
  })
  console.log('已删除文档数:', result.deletedCount)
  await client.close()
})()
