import { MongoClient } from 'mongodb';
const uri = process.env.HYDRO_MONGODB_URI;
const client = await MongoClient.connect(uri);
const db = client.db();
const docCollection = db.collection('document');

function parseAnswers(yamlStr) {
  const answers = {};
  const lines = yamlStr.split('\n');
  let inAnswers = false;
  let currentQ = null;
  for (const line of lines) {
    if (line.trim() === 'answers:') { inAnswers = true; continue; }
    if (!inAnswers) continue;
    if (line.trim().startsWith("'") || line.trim().match(/^\d+:/)) {
      const m = line.match(/^\s+'(\d+)':|^\s+(\d+):/);
      if (m) { currentQ = m[1] || m[2]; answers[currentQ] = []; continue; }
    }
    if (currentQ && line.trim().startsWith('- ')) {
      const val = line.trim().slice(2).trim();
      answers[currentQ].push(val);
    } else if (currentQ && !line.trim().startsWith('-') && line.trim() && !line.trim().startsWith("'")) {
      // New section started
      if (!line.match(/^\s/)) inAnswers = false;
    }
  }
  return answers;
}

for (const { docId, questionNo, paperUid } of [
  { docId: 241, questionNo: 19, paperUid: 'gesp-2023-09-cpp-1' },
  { docId: 235, questionNo: 21, paperUid: 'gesp-2023-03-cpp-1' }
]) {
  const doc = await docCollection.findOne({ domainId: 'gesp', docId });
  if (!doc || !doc.config) { console.log('No config for', docId); continue; }
  
  const answers = parseAnswers(doc.config);
  console.log(paperUid + ' Q' + questionNo + ': official answer =', answers[String(questionNo)]);
  // Print all answers around the question for context
  for (let i = questionNo - 2; i <= questionNo + 2; i++) {
    if (answers[String(i)]) console.log('  Q'+i+':', answers[String(i)]);
  }
}

await client.close();
