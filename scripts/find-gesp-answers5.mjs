import { MongoClient } from 'mongodb';
const uri = process.env.HYDRO_MONGODB_URI;
const client = await MongoClient.connect(uri);
const db = client.db();
const docCollection = db.collection('document');

for (const docId of [241, 235]) {
  const doc = await docCollection.findOne({ domainId: 'gesp', docId });
  if (!doc) continue;
  console.log('\n=== gesp docId', docId, '===');
  console.log('All keys:', Object.keys(doc).join(', '));
  
  // Explore data field
  if (doc.data !== undefined) {
    console.log('data type:', typeof doc.data, Array.isArray(doc.data) ? 'array len='+doc.data.length : '');
    if (Array.isArray(doc.data)) {
      // Check each element
      for (let i = 0; i < Math.min(doc.data.length, 3); i++) {
        const d = doc.data[i];
        if (d) {
          console.log('  data['+i+'] type:', typeof d);
          if (typeof d === 'object') {
            console.log('  data['+i+'] keys:', Object.keys(d).join(', '));
            const dStr = JSON.stringify(d).slice(0, 200);
            console.log('  data['+i+'] sample:', dStr);
          }
        }
      }
    }
  }
  
  // Check additional fields  
  for (const key of ['config', 'answers', 'answer', 'solution']) {
    if (doc[key] !== undefined) {
      console.log(key + ':', JSON.stringify(doc[key]).slice(0, 200));
    }
  }
  
  // Check stats for hints
  if (doc.stats) {
    console.log('stats keys:', Object.keys(doc.stats || {}).join(', '));
  }
}

await client.close();
