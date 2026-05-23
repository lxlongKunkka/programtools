import { MongoClient } from 'mongodb';
const uri = process.env.HYDRO_MONGODB_URI || 'mongodb://localhost:27017/hydro';
const client = await MongoClient.connect(uri);
const db = client.db();
const docCollection = db.collection('document');

for (const { docId, questionNo } of [
  { docId: 241, questionNo: 19 },
  { docId: 235, questionNo: 21 }
]) {
  const doc = await docCollection.findOne({ docId });
  if (!doc) { console.log('Not found docId', docId); continue; }
  
  console.log('\n=== docId', docId, '===');
  console.log('title:', doc.title);
  console.log('domainId:', doc.domainId);
  
  // Check data field
  const data = doc.data;
  if (data) {
    console.log('data type:', typeof data, Array.isArray(data) ? 'array' : '');
    if (typeof data === 'object') {
      console.log('data keys:', Object.keys(data).join(', '));
      if (data.config) {
        const cfgStr = typeof data.config === 'string' ? data.config : JSON.stringify(data.config);
        // Find the specific question answer
        const lines = cfgStr.split('\n');
        let inAnswers = false;
        let questionAnswers = [];
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('answers:')) inAnswers = true;
          if (inAnswers) {
            questionAnswers.push(lines[i]);
            if (questionAnswers.length > 60) break;
          }
        }
        console.log('Config answers:\n', questionAnswers.join('\n').slice(0, 600));
      } else if (data.answers) {
        console.log('answers:', JSON.stringify(data.answers).slice(0,300));
      }
    }
  }
  
  // Check if content has answers embedded
  if (doc.content) {
    const contentStr = typeof doc.content === 'string' ? doc.content : JSON.stringify(doc.content);
    const answerIdx = contentStr.indexOf('答案');
    if (answerIdx >= 0) {
      console.log('Content answer section:', contentStr.slice(answerIdx, answerIdx + 200));
    }
    // Try to find the specific question
    const qPattern = new RegExp(`${questionNo}[)）,]`);
    const lines = contentStr.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (qPattern.test(lines[i]) && lines[i].length < 200) {
        console.log('Q'+questionNo+' context:', lines.slice(i, i+8).join(' | ').slice(0,300));
        break;
      }
    }
  }
}

await client.close();
