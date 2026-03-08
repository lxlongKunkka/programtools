/**
 * 迁移脚本：
 * 1. 删除 Level5 数学基础 中的"快速幂"章节
 * 2. 把 Level7 "快速幂" 整个专题（3章）插入 Level5，作为独立专题（紧跟数学基础之后）
 * 3. 把 Level9 数学进阶 中"矩阵快速幂加速线性递推"章节移到 Level7，作为新专题"矩阵快速幂"
 * 4. Level9 数学进阶 删除该章节
 */
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
dotenv.config({ path: './server/.env' });

const client = new MongoClient(process.env.APP_MONGODB_URI);

async function main() {
  await client.connect();
  const col = client.db().collection('courselevels');

  const [lv5, lv7, lv9] = await Promise.all([
    col.findOne({ level: 5 }),
    col.findOne({ level: 7 }),
    col.findOne({ level: 9 }),
  ]);

  // ── 1. Level5：删除 数学基础 里的"快速幂"章节 ──────────────────
  const mathBaseTopic = lv5.topics.find(t => t.title === '数学基础');
  if (!mathBaseTopic) throw new Error('Level5 找不到"数学基础"专题');
  const before5 = mathBaseTopic.chapters.length;
  mathBaseTopic.chapters = mathBaseTopic.chapters.filter(c => c.title !== '快速幂');
  console.log(`Level5 数学基础：删除"快速幂"章节（${before5} → ${mathBaseTopic.chapters.length} 章）`);

  // ── 2. Level7：取出整个"快速幂"专题 ────────────────────────────
  const lv7QsPowIdx = lv7.topics.findIndex(t => t.title === '快速幂');
  if (lv7QsPowIdx < 0) throw new Error('Level7 找不到"快速幂"专题');
  const [qsPowTopic] = lv7.topics.splice(lv7QsPowIdx, 1);
  console.log(`Level7：移出"快速幂"专题（${qsPowTopic.chapters.length} 章）→ Level5`);

  // ── 3. Level5：把该专题插入"数学基础"之后 ───────────────────────
  const mathBaseIdx5 = lv5.topics.findIndex(t => t.title === '数学基础');
  lv5.topics.splice(mathBaseIdx5 + 1, 0, qsPowTopic);
  console.log(`Level5：在"数学基础"（index ${mathBaseIdx5}）之后插入"快速幂"专题`);

  // ── 4. Level9：取出 数学进阶 中的"矩阵快速幂加速线性递推" ────────
  const mathAdvTopic9 = lv9.topics.find(t => t.title === '数学进阶');
  if (!mathAdvTopic9) throw new Error('Level9 找不到"数学进阶"专题');
  const matQsPowIdx = mathAdvTopic9.chapters.findIndex(c => c.title.includes('矩阵快速幂'));
  if (matQsPowIdx < 0) throw new Error('Level9 数学进阶 找不到矩阵快速幂章节');
  const [matQsPowChapter] = mathAdvTopic9.chapters.splice(matQsPowIdx, 1);
  console.log(`Level9 数学进阶：移出"${matQsPowChapter.title}" → Level7`);

  // ── 5. Level7：新建"矩阵快速幂"专题，放在原快速幂位置 ───────────
  const newL7Topic = {
    title: '矩阵快速幂',
    description: '矩阵快速幂加速线性递推与DP转移矩阵',
    chapters: [matQsPowChapter],
  };
  // 插入到原 快速幂 被移走的位置（lv7QsPowIdx），若已越界则追加
  const insertAt7 = Math.min(lv7QsPowIdx, lv7.topics.length);
  lv7.topics.splice(insertAt7, 0, newL7Topic);
  console.log(`Level7：在 index ${insertAt7} 插入"矩阵快速幂"专题`);

  // ── 6. 写回 DB ────────────────────────────────────────────────
  await Promise.all([
    col.replaceOne({ level: 5 }, lv5),
    col.replaceOne({ level: 7 }, lv7),
    col.replaceOne({ level: 9 }, lv9),
  ]);

  // ── 验证 ─────────────────────────────────────────────────────
  console.log('\n── Level5 专题列表 ──');
  (await col.findOne({ level: 5 })).topics.forEach((t, i) =>
    console.log(`  ${i+1}. ${t.title}（${t.chapters.length} 章）`));

  console.log('\n── Level7 专题列表 ──');
  (await col.findOne({ level: 7 })).topics.forEach((t, i) =>
    console.log(`  ${i+1}. ${t.title}（${t.chapters.length} 章）`));

  console.log('\n── Level9 数学进阶 ──');
  const l9 = await col.findOne({ level: 9 });
  l9.topics.find(t => t.title === '数学进阶').chapters.forEach((c, i) =>
    console.log(`  ${i+1}. ${c.title}`));

  console.log('\n✅ 迁移完成');
}

main().catch(console.error).finally(() => client.close());
