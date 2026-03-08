import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const uri = process.env.APP_MONGODB_URI || process.env.MONGODB_URI
const client = new MongoClient(uri)
await client.connect()
const lv9 = await client.db().collection('courselevels').findOne({ level: 9 })
console.log('level:', lv9?.level)
console.log('title:', JSON.stringify(lv9?.title))
console.log('subject:', lv9?.subject)
console.log('topics count:', lv9?.topics?.length)
await client.close()
