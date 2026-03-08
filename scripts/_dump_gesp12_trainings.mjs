import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const uri = process.env.HYDRO_MONGODB_URI || process.env.MONGODB_URI
const client = new MongoClient(uri)
await client.connect()
const docs = await client.db().collection('document')
  .find({ domainId: { $in: ['gesp1', 'gesp2'] }, docType: 40 })
  .sort({ domainId: 1, pin: -1 })
  .toArray()
docs.forEach(d => console.log(`${d.domainId} | ${d._id} | ${d.title} | dag: ${JSON.stringify(d.dag?.map(n => n.title))}`))
await client.close()
