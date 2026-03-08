/**
 * 把 Level8 "组合数学" 整个专题移到 Level5 "数学基础" 专题之后
 */
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
dotenv.config({ path: './server/.env' });

const client = new MongoClient(process.env.APP_MONGODB_URI);

async function main() {
  await client.connect();
  const col = client.db().collection('courselevels');

  const [lv5, lv8] = await Promise.all([
    col.findOne({ level: 5 }),
    col.findOne({ level: 8 }),
  ]);

  // ── 1. Level8：移出"组合数学"专题 ──────────────────────────────
  const zuheIdx = lv8.topics.findIndex(t => t.title === '组合数学');
  if (zuheIdx < 0) throw new Error('Level8 找不到"组合数学"专题');
  const [zuheTopic] = lv8.topics.splice(zuheIdx, 1);
  console.log(`Level8：移出"组合数学"专题（${zuheTopic.chapters.length} 章）`);

  // ── 2. Level5：插入到"数学基础"之后 ────────────────────────────
  const mathBaseIdx = lv5.topics.findIndex(t => t.title === '数学基础');
  if (mathBaseIdx < 0) throw new Error('Level5 找不到"数学基础"专题');
  lv5.topics.splice(mathBaseIdx + 1, 0, zuheTopic);
  console.log(`Level5：在"数学基础"（index ${mathBaseIdx}）之后插入"组合数学"专题`);

  // ── 3. 写回 DB ────────────────────────────────────────────────
  await Promise.all([
    col.replaceOne({ level: 5 }, lv5),
    col.replaceOne({ level: 8 }, lv8),
  ]);

  // ── 验证 ─────────────────────────────────────────────────────
  console.log('\n── Level5 专题列表 ──');
  (await col.findOne({ level: 5 })).topics.forEach((t, i) =>
    console.log(`  ${i+1}. ${t.title}（${t.chapters.length} 章）`));

  console.log('\n── Level8 专题列表 ──');
  (await col.findOne({ level: 8 })).topics.forEach((t, i) =>
    console.log(`  ${i+1}. ${t.title}（${t.chapters.length} 章）`));

  console.log('\n✅ 迁移完成');
}

main().catch(console.error).finally(() => client.close());
