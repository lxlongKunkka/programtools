/**
 * Fetch problem content for the 3 catch-all chapters from MongoDB.
 * Output: changelogs/_catchall_problems.json
 * Format: [ { pid, docId, title, content } ]
 */
import { MongoClient } from 'mongodb';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envRaw = readFileSync(join(__dirname, '../server/.env'), 'utf8');
const env = Object.fromEntries(
  envRaw.split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);

// Load the batch JSONs to find pids in the 3 catch-all chapters
// (this file runs on server; use relative path from /var/www/programtools)
const catchallIds = new Set(['cpp-5-2-3','cpp-9-5-4','cpp-7-11-3']);
const targets = [];
const batchDir = join(__dirname, '../changelogs');
const { readdirSync } = await import('fs');
const batchFiles = readdirSync(batchDir).filter(f => f.match(/^atcoder-classify-batch-\d{4}\.json$/));
for (const f of batchFiles) {
  const data = JSON.parse(readFileSync(join(batchDir, f), 'utf8'));
  for (const a of data.assignments) {
    if (catchallIds.has(a.chapterId)) targets.push(a);
  }
}
const docIds = targets.map(p => parseInt(p.pid.split(':')[1]));

console.error(`Found ${docIds.length} problems in catch-all chapters`);

const client = new MongoClient(env.HYDRO_MONGODB_URI);
await client.connect();
const db = client.db();

const docs = await db.collection('document').find(
  { domainId: 'atcoder', docType: 10, docId: { $in: docIds } },
  { projection: { docId: 1, title: 1, content: 1 } }
).toArray();

await client.close();

// Build pid→meta map
const metaMap = {};
for (const p of targets) metaMap[p.pid] = p;

// Merge
const result = docs.map(d => {
  const pid = `atcoder:${d.docId}`;
  const meta = metaMap[pid] || {};
  // content may be a string (markdown) or object
  let content = d.content ?? '';
  if (typeof content === 'object') content = JSON.stringify(content);
  // Truncate to 800 chars to keep AI prompt manageable
  const snippet = content.slice(0, 800);
  return {
    pid,
    chapterId: meta.chapterId,
    chapterTopic: meta.chapterTopic,
    chapterName: meta.chapterName,
    title: d.title || meta.title || '',
    oldReason: meta.reason || '',
    snippet,
  };
}).sort((a,b) => parseInt(a.pid.split(':')[1]) - parseInt(b.pid.split(':')[1]));

writeFileSync('/tmp/catchall_problems.json', JSON.stringify(result, null, 2), 'utf8');
process.stderr.write(`Written ${result.length} problems to /tmp/catchall_problems.json\n`);
