import { MongoClient } from 'mongodb';
const uri = 'mongodb://programtools:896b825efdb92b30989538ed3a6b167f324d4e2081adf040d91eadfd0be35b03@localhost:27017/programtools';
const client = await MongoClient.connect(uri);
const db = client.db('programtools');
const papers = db.collection('quiz_papers');

async function getAnswerSection(paperUid) {
  const p = await papers.findOne({ paperUid });
  if (!p || !p.rawContentZh) { console.log('No raw content for', paperUid); return; }
  const raw = p.rawContentZh;
  // Find answer section - look for patterns like "答案", "参考答案", answer keys
  const answerIdx = raw.search(/答案|answer|Answer/i);
  if (answerIdx >= 0) {
    console.log('Answer section found at', answerIdx);
    console.log(raw.slice(answerIdx, answerIdx + 500));
  } else {
    // Look for the end of the document
    const last1000 = raw.slice(-1000);
    console.log('Last 1000 chars:\n', last1000);
  }
}

console.log('=== downloads-1104 ===');
await getAnswerSection('downloads-1104');

console.log('\n=== gesp-2023-09-cpp-1 ===');
await getAnswerSection('gesp-2023-09-cpp-1');

console.log('\n=== gesp-2023-03-cpp-1 ===');
await getAnswerSection('gesp-2023-03-cpp-1');

await client.close();
