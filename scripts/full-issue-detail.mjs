import { MongoClient } from 'mongodb';
const uri = 'mongodb://programtools:896b825efdb92b30989538ed3a6b167f324d4e2081adf040d91eadfd0be35b03@localhost:27017/programtools';
const client = await MongoClient.connect(uri);
const db = client.db('programtools');
const issues = db.collection('quiz_question_issues');
const questions = db.collection('quiz_questions');

const open = await issues.find({ status: { $in: ['pending','reviewing'] } }).sort({ createdAt: 1 }).toArray();
console.log('Open issues:', open.length, '\n');

for (const i of open) {
  console.log('=== ISSUE', String(i._id), '===');
  console.log('questionUid:', i.questionUid);
  console.log('status:', i.status);
  console.log('issueType:', i.issueType);
  console.log('description:', i.description);
  console.log('note:', i.note);
  console.log('reporterNote:', i.reporterNote);
  console.log('userNote:', i.userNote);
  // print all non-standard fields
  const knownFields = ['_id','questionUid','status','createdAt','updatedAt'];
  const extra = Object.entries(i).filter(([k])=>!knownFields.includes(k));
  if (extra.length) console.log('Extra fields:', JSON.stringify(Object.fromEntries(extra)).slice(0,300));
  console.log('createdAt:', i.createdAt);

  const q = await questions.findOne({ questionUid: i.questionUid });
  if (q) {
    console.log('--- QUESTION ---');
    console.log('type:', q.type, '| answer:', q.answer);
    console.log('STEM:', typeof q.stem === 'string' ? q.stem.slice(0,400) : JSON.stringify(q.stem).slice(0,400));
    console.log('options:', JSON.stringify(q.options||[]).slice(0,400));
    console.log('EXPLANATION:', (q.explanation||'').slice(0,500));
    console.log('paperUid:', q.paperUid, '| paperQuestionNo:', q.paperQuestionNo);
    console.log('source:', q.source, '| sourceTitle:', q.sourceTitle);
  }
  console.log();
}
await client.close();
