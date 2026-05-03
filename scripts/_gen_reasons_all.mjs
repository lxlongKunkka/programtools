import fs from 'fs';
import path from 'path';

// Chapter name map will be loaded from changelogs/chapter-name-map.json if available
let chapterNameMap = {};
const nameMapPath = 'changelogs/chapter-name-map.json';
if (fs.existsSync(nameMapPath)) {
  chapterNameMap = JSON.parse(fs.readFileSync(nameMapPath, 'utf8'));
  console.log(`Loaded chapter name map: ${Object.keys(chapterNameMap).length} entries`);
} else {
  console.warn('Warning: chapter-name-map.json not found. Run scripts/_fetch_chapter_names.mjs on server first.');
}

const dir = 'changelogs';
const files = fs.readdirSync(dir)
  .filter(f => f.match(/^atcoder-classify-batch-\d{4}\.json$/))
  .sort();

const allProblems = [];

for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  for (const a of data.assignments) {
    const info = chapterNameMap[a.chapterId] || {};
    allProblems.push({
      pid: a.pid,
      chapterId: a.chapterId,
      chapterTopic: info.topic ?? '',
      chapterName: info.chapter ?? '',
      title: a.title ?? '',
      reason: a.reason ?? '',
    });
  }
}

// Sort by numeric pid
allProblems.sort((a, b) => {
  const na = parseInt(a.pid.split(':')[1]);
  const nb = parseInt(b.pid.split(':')[1]);
  return na - nb;
});

const out = {
  generated: new Date().toISOString().slice(0, 10),
  total: allProblems.length,
  problems: allProblems,
};

const outPath = 'changelogs/atcoder-reasons-all.json';
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
console.log(`Written: ${outPath}`);
console.log(`Total: ${allProblems.length}`);
