import { MongoClient } from 'mongodb';
const uri = 'mongodb://programtools:896b825efdb92b30989538ed3a6b167f324d4e2081adf040d91eadfd0be35b03@localhost:27017/programtools';
const client = await MongoClient.connect(uri);
const db = client.db('programtools');
const papers = db.collection('quiz_papers');

async function extractQuestion(paperUid, questionNo, contextLines = 12) {
  const p = await papers.findOne({ paperUid });
  if (!p || !p.rawContentZh) { console.log('No raw content for', paperUid); return; }
  const lines = p.rawContentZh.split('\n');
  let found = false;
  const output = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match question number patterns: "23.", "23、", "23）", "(23)"
    if (line.match(new RegExp(`^\\s*${questionNo}[.、。）)\\s]`)) || 
        line.match(new RegExp(`^\\s*\\(${questionNo}\\)`)) ||
        line.match(new RegExp(`^第${questionNo}题`))) {
      found = true;
      output.push(...lines.slice(i, i + contextLines));
      break;
    }
  }
  if (!found) {
    // Try broader search
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(`${questionNo}.`) || lines[i].includes(`${questionNo}、`)) {
        output.push(`(approx match at line ${i}):`, ...lines.slice(i, i + contextLines));
        break;
      }
    }
  }
  return output.join('\n');
}

console.log('=== downloads-1104 Q23 ===');
console.log(await extractQuestion('downloads-1104', 23) || '(not found)');

console.log('\n=== gesp-2023-09-cpp-1 Q19 ===');
console.log(await extractQuestion('gesp-2023-09-cpp-1', 19) || '(not found)');

console.log('\n=== gesp-2023-03-cpp-1 Q21 ===');
console.log(await extractQuestion('gesp-2023-03-cpp-1', 21) || '(not found)');

await client.close();
