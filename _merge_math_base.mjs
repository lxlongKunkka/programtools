/**
 * Level5：
 * 1. 从 数学基础 中删除"排列组合"章节（与组合数学重复）
 * 2. 把 组合数学 的所有章节追加到 数学基础 末尾
 * 3. 把 快速幂 的所有章节追加到 数学基础 末尾
 * 4. 删除空出的 组合数学 和 快速幂 专题
 */
import dotenv from 'dotenv'; import { MongoClient } from 'mongodb';
dotenv.config({ path: './server/.env' });
const client = new MongoClient(process.env.APP_MONGODB_URI);

async function main() {
  await client.connect();
  const col = client.db().collection('courselevels');
  const lv5 = await col.findOne({ level: 5 });

  const mathBase  = lv5.topics.find(t => t.title === '数学基础');
  const zuhe      = lv5.topics.find(t => t.title === '组合数学');
  const kuaisumi  = lv5.topics.find(t => t.title === '快速幂');

  // 1. 删除 数学基础 里已有的"排列组合"（与 组合数学 重复）
  const before = mathBase.chapters.length;
  mathBase.chapters = mathBase.chapters.filter(c => c.title !== '排列组合');
  console.log(`数学基础：删除"排列组合"（${before} → ${mathBase.chapters.length} 章）`);

  // 2. 追加 组合数学 各章
  mathBase.chapters.push(...zuhe.chapters);
  console.log(`数学基础：追加 组合数学 ${zuhe.chapters.length} 章 → [${zuhe.chapters.map(c=>c.title).join(', ')}]`);

  // 3. 追加 快速幂 各章
  mathBase.chapters.push(...kuaisumi.chapters);
  console.log(`数学基础：追加 快速幂 ${kuaisumi.chapters.length} 章 → [${kuaisumi.chapters.map(c=>c.title).join(', ')}]`);

  // 4. 删除空专题
  lv5.topics = lv5.topics.filter(t => t.title !== '组合数学' && t.title !== '快速幂');

  await col.replaceOne({ level: 5 }, lv5);

  // 验证
  const result = await col.findOne({ level: 5 });
  console.log('\n── Level5 专题列表 ──');
  result.topics.forEach((t, i) => {
    console.log(`  ${i+1}. ${t.title}（${t.chapters.length} 章）`);
    if (t.title === '数学基础') t.chapters.forEach((c,j) => console.log(`       ${j+1}. ${c.title}`));
  });
  console.log('\n✅ 合并完成');
}
main().catch(console.error).finally(() => client.close());
