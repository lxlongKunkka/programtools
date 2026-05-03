import { MongoClient } from 'mongodb';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// load .env manually
const envPath = join(__dirname, '../server/.env');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);

const client = new MongoClient(env.APP_MONGODB_URI);
await client.connect();
const db = client.db();
const docs = await db.collection('courselevels').find({ group: 'GESP C++ 认证课程' }).sort({ level: 1 }).toArray();
const map = {};
for (const lv of docs) {
  for (const t of lv.topics || []) {
    for (const ch of t.chapters || []) {
      map[ch.id] = { level: lv.title, topic: t.title, chapter: ch.title };
    }
  }
}
console.log(JSON.stringify(map, null, 2));
await client.close();
