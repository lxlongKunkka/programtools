import { MongoClient } from 'mongodb'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../server/.env')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => l.split('=').map(s => s.trim()))
)

const c = new MongoClient(env.HYDRO_MONGODB_URI)
await c.connect()
const col = c.db().collection('document')
const docs = await col.find({ domainId: 'gesp6', docType: 40 }).sort({ _id: 1 }).toArray()
console.log(`gesp6 训练计划数: ${docs.length}`)
for (const d of docs) {
  console.log(`\n[${d._id}] ${d.title}`)
  console.log(`  dag 节点数: ${d.dag?.length ?? 0}`)
  d.dag?.forEach(n => console.log(`    ${n._id}. ${n.title}`))
}
await c.close()
