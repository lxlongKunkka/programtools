// Run on server to export chapterId -> { topic, chapter } map for the C++ group
// Usage: node scripts/_fetch_chapter_names.mjs
import { appConn } from '../server/db.js';
import CourseLevel from '../server/models/CourseLevel.js';
import fs from 'fs';

await appConn.asPromise();

const levels = await CourseLevel.find({ group: 'C++' }).select('level topics').lean();

const map = {};

for (const level of levels) {
  for (let ti = 0; ti < (level.topics || []).length; ti++) {
    const topic = level.topics[ti];
    for (let ci = 0; ci < (topic.chapters || []).length; ci++) {
      const chapter = topic.chapters[ci];
      const id = chapter.id || `cpp-${level.level}-${ti + 1}-${ci + 1}`;
      map[id] = {
        topic: topic.title || '',
        chapter: chapter.title || '',
      };
    }
  }
}

const outPath = 'changelogs/chapter-name-map.json';
fs.writeFileSync(outPath, JSON.stringify(map, null, 2), 'utf8');
console.log(`Written: ${outPath} (${Object.keys(map).length} entries)`);

await appConn.close();
