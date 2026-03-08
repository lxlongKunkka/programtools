/**
 * 1. 删除 Level5 数学基础 中的"矩阵快速幂入门"
 * 2. 对所有 level 的全部 chapters 重新编号 id 为 {level}-{topicIdx}-{chapterIdx} (1-based)
 * 3. 重新生成 src/utils/gespTagMap.json
 */
import dotenv from 'dotenv'; import { MongoClient } from 'mongodb';
import fs from 'fs'; import path from 'path';
dotenv.config({ path: './server/.env' });
const client = new MongoClient(process.env.APP_MONGODB_URI);

async function main() {
  await client.connect();
  const col = client.db().collection('courselevels');
  const levels = await col.find({}).sort({ level: 1 }).toArray();

  // ── 1. 删除 矩阵快速幂入门 ──────────────────────────────────────
  const lv5 = levels.find(l => l.level === 5);
  const mathBase = lv5.topics.find(t => t.title === '数学基础');
  const before = mathBase.chapters.length;
  mathBase.chapters = mathBase.chapters.filter(c => c.title !== '矩阵快速幂入门');
  console.log(`L5 数学基础：删除"矩阵快速幂入门"（${before} → ${mathBase.chapters.length} 章）`);
  console.log('  现有章节:', mathBase.chapters.map(c => c.title).join(', '));

  // ── 2. 全量重编 id ─────────────────────────────────────────────
  // 同时建立 newIdMap: oldId → newId，用于更新 gespTagMap
  const oldToNew = {};  // old id → { newId, title }

  for (const lv of levels) {
    // 只处理 topics 结构（非扁平 chapters）
    if (!lv.topics || lv.topics.length === 0) continue;
    for (let ti = 0; ti < lv.topics.length; ti++) {
      const topic = lv.topics[ti];
      const chapters = topic.chapters || [];
      for (let ci = 0; ci < chapters.length; ci++) {
        const ch = chapters[ci];
        const newId = `${lv.level}-${ti + 1}-${ci + 1}`;
        if (ch.id && ch.id !== newId) {
          oldToNew[ch.id] = { newId, title: ch.title };
        }
        ch.id = newId;
      }
    }
  }

  const changed = Object.keys(oldToNew).length;
  console.log(`\n重编 id：共 ${changed} 个章节 id 发生变化`);
  // 打印变化样本（前10条）
  let shown = 0;
  for (const [o, { newId, title }] of Object.entries(oldToNew)) {
    if (shown++ >= 10) { console.log('  ...'); break; }
    console.log(`  ${o} → ${newId}  "${title}"`);
  }

  // ── 3. 写回 DB ─────────────────────────────────────────────────
  await Promise.all(levels.map(lv => {
    if (!lv.topics) return Promise.resolve();
    return col.updateOne({ _id: lv._id }, { $set: { topics: lv.topics } });
  }));
  console.log('\nDB 写回完成');

  // ── 4. 重新生成 gespTagMap.json ─────────────────────────────────
  // 从 GESP_TAGS.yaml 导入标签列表，匹配章节 title
  const yaml = fs.readFileSync('./GESP_TAGS.yaml', 'utf8');

  // 解析 yaml 中所有标签 label → 对应章节标题（用启发式匹配）
  // 建立 title → id 的映射（用完整 titles 匹配）
  const titleToId = {};
  for (const lv of levels) {
    if (!lv.topics) continue;
    for (const topic of lv.topics) {
      for (const ch of (topic.chapters || [])) {
        titleToId[ch.title] = ch.id;
      }
    }
  }

  // 读取旧 tagMap 并用 oldToNew 更新
  const tagMapPath = './src/utils/gespTagMap.json';
  const oldTagMap = JSON.parse(fs.readFileSync(tagMapPath, 'utf8'));
  let updatedCount = 0;
  const newTagMap = {};
  for (const [tag, oldId] of Object.entries(oldTagMap)) {
    if (oldToNew[oldId]) {
      newTagMap[tag] = oldToNew[oldId].newId;
      updatedCount++;
    } else {
      newTagMap[tag] = oldId;
    }
  }
  fs.writeFileSync(tagMapPath, JSON.stringify(newTagMap, null, 2), 'utf8');
  console.log(`\ngespTagMap.json 更新：${updatedCount} 条映射更新`);

  // ── 验证 L5 数学基础 ──────────────────────────────────────────
  const final5 = await col.findOne({ level: 5 });
  console.log('\n── Level5 数学基础章节（最终）──');
  final5.topics.find(t => t.title === '数学基础').chapters
    .forEach((c, i) => console.log(`  ${i+1}. [${c.id}] ${c.title}`));

  console.log('\n✅ 完成');
}
main().catch(console.error).finally(() => client.close());
