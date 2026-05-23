import { MongoClient } from 'mongodb';
const uri = 'mongodb://programtools:896b825efdb92b30989538ed3a6b167f324d4e2081adf040d91eadfd0be35b03@localhost:27017/programtools';
const client = await MongoClient.connect(uri);
const db = client.db('programtools');

// Get the papers and look for source configs
const papers = db.collection('quiz_papers');
const paperUids = ['downloads-1104', 'gesp-2023-09-cpp-1', 'gesp-2023-03-cpp-1'];

for (const uid of paperUids) {
  const p = await papers.findOne({ uid });
  if (p) {
    console.log('\n=== PAPER', uid, '===');
    console.log('Fields:', Object.keys(p).join(', '));
    console.log('title:', p.title);
    // print questions array if small enough
    if (p.questions) {
      const questions = Array.isArray(p.questions) ? p.questions : [];
      const relevant = questions.filter(q => q.no === 19 || q.no === 21 || q.no === 23);
      for (const rq of relevant) {
        console.log('  Q', rq.no, ':', JSON.stringify(rq).slice(0, 200));
      }
    }
  } else {
    console.log('\nPaper NOT found:', uid);
  }
}

// Also check source documents
const sourceDocs = db.collection('source_documents').catch ? null : db.collection('source_documents');
const docIds = [1104, 241, 235];
for (const id of docIds) {
  const doc = await db.collection('source_documents').findOne({ id }).catch(() => null);
  if (doc) {
    console.log('\n=== SOURCE DOC', id, '===');
    // find the relevant question blocks
    const content = doc.content || doc.raw || '';
    if (typeof content === 'string') {
      // look for question 19, 21, 23 context
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (line.match(/^(19|21|23)[.、。]/)) {
          console.log('Line', i, ':', lines.slice(i, i+5).join(' | ').slice(0,200));
        }
      });
    }
  } else {
    console.log('Source doc', id, 'not found or no such collection');
  }
}

await client.close();
