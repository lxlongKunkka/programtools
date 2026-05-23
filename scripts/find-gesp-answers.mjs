// Check Hydro gesp domain for GESP official answers
// paperUids: gesp-2023-09-cpp-1 -> docId 241, gesp-2023-03-cpp-1 -> docId 235
import { MongoClient } from 'mongodb';

// Try to get the real hydro URI from env
const hydroUri = process.env.HYDRO_MONGODB_URI || 'mongodb://localhost:27017/hydro';
console.log('Using Hydro URI:', hydroUri.replace(/:[^@]+@/, ':***@'));

const client = await MongoClient.connect(hydroUri);
const db = client.db();
console.log('Connected to DB:', db.databaseName);

const cols = await db.listCollections().toArray();
console.log('Collections:', cols.map(c=>c.name).join(', '));

// Try to find documents with the gesp paper IDs
const docCollection = db.collection('document');
// docIds from earlier: gesp-2023-09-cpp-1 -> sourceDocId: 241, gesp-2023-03-cpp-1 -> sourceDocId: 235
for (const docId of [241, 235]) {
  const doc = await docCollection.findOne({ docId }).catch(()=>null) 
    || await docCollection.findOne({ _id: docId }).catch(()=>null);
  if (doc) {
    console.log('\nFound docId', docId, 'fields:', Object.keys(doc).join(', '));
    if (doc.config) {
      const cfgStr = typeof doc.config === 'string' ? doc.config : JSON.stringify(doc.config);
      // Find answers section
      const answerIdx = cfgStr.indexOf('answers');
      if (answerIdx >= 0) {
        console.log('Config answers section:', cfgStr.slice(answerIdx, answerIdx + 300));
      }
    }
  } else {
    console.log('docId', docId, 'not found by docId field');
    // Try other fields
    const d2 = await docCollection.findOne({ 'data.docId': docId }).catch(()=>null);
    if (d2) console.log('Found via data.docId:', Object.keys(d2).join(', '));
  }
}

await client.close();
