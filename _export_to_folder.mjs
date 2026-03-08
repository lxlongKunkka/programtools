import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
dotenv.config({ path: './server/.env' });
import fs from 'fs';
import path from 'path';

const uri = process.env.APP_MONGODB_URI;
const client = new MongoClient(uri);

// 清理文件名中的非法字符
function sanitize(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim();
}

// 零填充序号
function pad(n, len = 2) {
  return String(n).padStart(len, '0');
}

async function main() {
  await client.connect();
  const db = client.db();
  const col = db.collection('courselevels');

  const levels = await col.find({}).sort({ level: 1 }).toArray();

  const outRoot = path.join(process.cwd(), 'curriculum_export');

  // 清空已有输出目录
  if (fs.existsSync(outRoot)) {
    fs.rmSync(outRoot, { recursive: true, force: true });
  }
  fs.mkdirSync(outRoot, { recursive: true });

  let totalTopics = 0;
  let totalChapters = 0;
  let levelCount = 0;

  for (const lvl of levels) {
    levelCount++;
    const levelDirName = `Level${lvl.level}_${sanitize(lvl.title)}`;
    const levelDir = path.join(outRoot, levelDirName);
    fs.mkdirSync(levelDir, { recursive: true });

    // 写 README.md
    const readmeLines = [
      `# ${lvl.title}`,
      '',
      lvl.description || '',
      '',
      '## 专题列表',
      '',
    ];

    const topics = lvl.topics || [];
    for (let ti = 0; ti < topics.length; ti++) {
      const topic = topics[ti];
      totalTopics++;
      const topicIdx = pad(ti + 1);
      const topicDirName = `${topicIdx}_${sanitize(topic.title)}`;
      const topicDir = path.join(levelDir, topicDirName);
      fs.mkdirSync(topicDir, { recursive: true });

      readmeLines.push(`${ti + 1}. **${topic.title}**`);
      if (topic.description) readmeLines.push(`   > ${topic.description}`);

      const chapters = topic.chapters || [];
      for (let ci = 0; ci < chapters.length; ci++) {
        const ch = chapters[ci];
        totalChapters++;
        const chIdx = pad(ci + 1);
        const chFileName = `${chIdx}_${sanitize(ch.title)}.md`;
        const chFilePath = path.join(topicDir, chFileName);

        // 章节文件内容
        let content = `# ${ch.title}\n\n`;
        if (ch.content) {
          content += ch.content;
        } else {
          content += '_（暂无内容）_';
        }

        // 附加题目信息
        if (ch.problemIds && ch.problemIds.length > 0) {
          content += '\n\n---\n\n## 练习题\n\n';
          content += ch.problemIds.map(id => `- \`${id}\``).join('\n');
        }
        if (ch.optionalProblemIds && ch.optionalProblemIds.length > 0) {
          content += '\n\n## 选做题\n\n';
          content += ch.optionalProblemIds.map(id => `- \`${id}\``).join('\n');
        }

        fs.writeFileSync(chFilePath, content, 'utf-8');
      }
    }

    fs.writeFileSync(path.join(levelDir, 'README.md'), readmeLines.join('\n'), 'utf-8');
    console.log(`✓ Level ${lvl.level} — ${lvl.title}（${topics.length} 专题）`);
  }

  console.log(`\n✅ 导出完成！`);
  console.log(`   目录: ${outRoot}`);
  console.log(`   级别: ${levelCount}，专题: ${totalTopics}，章节: ${totalChapters}`);
}

main().catch(console.error).finally(() => client.close());
