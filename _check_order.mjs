import dotenv from 'dotenv'; import { MongoClient } from 'mongodb';
dotenv.config({ path: './server/.env' });
const client = new MongoClient(process.env.APP_MONGODB_URI);
await client.connect();
const col = client.db().collection('courselevels');

// 检查所有 level 的 topics/chapters order 字段
const levels = await col.find({}).sort({ level: 1 }).toArray();
for (const lv of levels) {
  for (let ti = 0; ti < lv.topics.length; ti++) {
    const t = lv.topics[ti];
    const tOrder = t.order ?? '(无)';
    for (let ci = 0; ci < t.chapters.length; ci++) {
      const c = t.chapters[ci];
      const cOrder = c.order ?? '(无)';
      if (ti < 2 && ci < 3) // 只打印前几行示例
        console.log(`L${lv.level} topic[${ti}].order=${tOrder}  chapter[${ci}].order=${cOrder}  title=${c.title}`);
    }
  }
}
// 单独打印 L5 数学基础所有章
const lv5 = levels.find(l => l.level === 5);
const mb = lv5.topics.find(t => t.title === '数学基础');
console.log('\nL5 数学基础章节:');
mb.chapters.forEach((c, i) => console.log(`  array[${i}] order=${c.order ?? '(无)'}  title=${c.title}`));

await client.close();
