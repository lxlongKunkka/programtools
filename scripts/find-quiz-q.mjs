import { MongoClient } from 'mongodb';
const uri = 'mongodb://programtools:896b825efdb92b30989538ed3a6b167f324d4e2081adf040d91eadfd0be35b03@localhost:27017/programtools';
const client = await MongoClient.connect(uri);
const db = client.db('programtools');
const questions = db.collection('quiz_questions');

// Check one sample to see field structure
const sample = await questions.findOne({});
if (sample) console.log('Fields:', Object.keys(sample).join(', '));

// Search by the 3 UIDs using different possible field names
const uids = ['downloads-1104-q23','gesp-2023-09-cpp-1-q19','gesp-2023-03-cpp-1-q21'];
for (const uid of uids) {
  const q = await questions.findOne({ $or: [
    { uid }, { questionUid: uid }, { id: uid }, { qid: uid }, { uniqueId: uid }
  ]});
  if (q) {
    console.log('\nFound', uid, '=> fields:', Object.keys(q).join(', '));
    console.log('type:', q.type, 'enabled:', q.enabled, 'answer:', q.answer);
    console.log('content:', (q.content||q.question||'').slice(0,200));
    console.log('options:', JSON.stringify(q.options||[]).slice(0,300));
    console.log('explanation:', (q.explanation||'').slice(0,150));
  } else {
    // Try partial text search on various id-like fields  
    const all = await questions.find({ $or: [
      { uid: { $regex: uid.split('-').slice(-1)[0] } }
    ]}).limit(2).toArray();
    console.log('\nNOT found by uid:', uid, ', trying regex hits:', all.map(x=>x.uid||x.id||String(x._id)));
  }
}
await client.close();
