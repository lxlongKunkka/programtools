import { MongoClient } from 'mongodb';
const uri = 'mongodb://programtools:896b825efdb92b30989538ed3a6b167f324d4e2081adf040d91eadfd0be35b03@localhost:27017/programtools';
const client = await MongoClient.connect(uri);
const db = client.db('programtools');
const questions = db.collection('quiz_questions');

const uids = ['gesp-2023-09-cpp-1-q19', 'gesp-2023-03-cpp-1-q21'];
for (const uid of uids) {
  const q = await questions.findOne({ questionUid: uid });
  if (q) {
    console.log('uid:', uid);
    console.log('  sourceDocId:', q.sourceDocId);
    console.log('  sourceDomainId:', q.sourceDomainId);
    console.log('  source:', q.source);
    console.log('  paperUid:', q.paperUid);
    console.log('  paperQuestionNo:', q.paperQuestionNo);
  }
}
await client.close();
