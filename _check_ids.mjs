import dotenv from 'dotenv'; import { MongoClient } from 'mongodb';
dotenv.config({ path: './server/.env' });
const client = new MongoClient(process.env.APP_MONGODB_URI);
await client.connect();
const col = client.db().collection('courselevels');
const lv5 = await col.findOne({ level: 5 });

// 显示所有 chapters 的 id 字段
for (const topic of lv5.topics) {
  for (const c of topic.chapters) {
    console.log(`topic="${topic.title}" chapter="${c.title}" id=${c.id || '(无)'} _id=${c._id || '(无)'}`);
  }
}
await client.close();
