import { MongoClient } from 'mongodb';
const uri = 'mongodb://programtools:896b825efdb92b30989538ed3a6b167f324d4e2081adf040d91eadfd0be35b03@localhost:27017/programtools';
const client = await MongoClient.connect(uri);
const db = client.db('programtools');
const papers = db.collection('quiz_papers');

// Check a sample for field structure
const sample = await papers.findOne({});
console.log('Paper fields:', sample ? Object.keys(sample).join(', ') : 'empty');
if (sample) {
  console.log('Sample uid:', sample.uid || sample.paperUid || sample._id);
  console.log('Sample title:', sample.title);
}

// Search for papers by uid
const paperUids = ['downloads-1104', 'gesp-2023-09-cpp-1', 'gesp-2023-03-cpp-1'];
for (const uid of paperUids) {
  // Try different field names
  const p = await papers.findOne({ $or: [
    { uid }, { paperUid: uid }, { id: uid }
  ]});
  if (p) {
    console.log('\nFound paper:', uid);
    console.log('Fields:', Object.keys(p).join(', '));
    console.log('Questions count:', (p.questions||p.questionList||[]).length);
  } else {
    // Try partial match
    const pp = await papers.findOne({ $or: [
      { uid: { $regex: '1104' } },
      { uid: { $regex: 'gesp-2023-09-cpp-1' } },
      { uid: { $regex: 'gesp-2023-03-cpp-1' } }
    ]});
    console.log('\nNot found:', uid, '| regex try:', pp ? (pp.uid || String(pp._id)) : 'not found');
  }
}

// List some paper uids to understand the structure
const someUids = await papers.find({}).limit(5).project({ uid: 1, title: 1, paperUid: 1 }).toArray();
console.log('\nSome papers:', someUids.map(p => p.uid || p.paperUid || String(p._id)).join(', '));
await client.close();
