import { MongoClient } from 'mongodb';
const uri = 'mongodb://programtools:896b825efdb92b30989538ed3a6b167f324d4e2081adf040d91eadfd0be35b03@localhost:27017/programtools';
const client = await MongoClient.connect(uri);
const db = client.db('programtools');
const issues = db.collection('quiz_question_issues');
const questions = db.collection('quiz_questions');

const open = await issues.find({ status: { $in: ['pending','reviewing'] } }).sort({ createdAt: 1 }).toArray();
console.log('Open issues count:', open.length);

for (const i of open) {
  console.log('\n=== ISSUE', String(i._id), '===');
  console.log('questionUid:', i.questionUid);
  console.log('status:', i.status);
  console.log('description:', i.description);
  console.log('createdAt:', i.createdAt);

  if (i.questionUid) {
    const q = await questions.findOne({ uid: i.questionUid });
    if (q) {
      console.log('--- QUESTION ---');
      console.log('type:', q.type, '| enabled:', q.enabled);
      console.log('content:', (q.content||'').slice(0, 200));
      console.log('options:', JSON.stringify(q.options||[]).slice(0,300));
      console.log('answer:', q.answer);
      console.log('explanation:', (q.explanation||'').slice(0,150));
    } else {
      console.log('QUESTION NOT FOUND');
    }
  }
}
await client.close();
