import { MongoClient } from 'mongodb';
const uri = process.env.HYDRO_MONGODB_URI;
const client = await MongoClient.connect(uri);
const db = client.db();

const docCollection = db.collection('document');

// domainId = 'gesp', docIds: 241, 235
for (const { docId, questionNo } of [
  { docId: 241, questionNo: 19 },
  { docId: 235, questionNo: 21 }
]) {
  // Try with domainId = 'gesp'
  const doc = await docCollection.findOne({ domainId: 'gesp', docId });
  if (!doc) {
    console.log('Not found docId', docId, 'in gesp domain');
    // Try other domains
    const docs = await docCollection.find({ docId }).limit(3).toArray();
    console.log('Found in other domains:', docs.map(d => d.domainId + ':' + d.docId + ':' + d.title).join('; '));
    continue;
  }
  
  console.log('\n=== gesp docId', docId, '===');
  console.log('title:', doc.title);
  console.log('tag:', doc.tag);
  
  // Check the content field
  let contentStr = '';
  if (doc.content) {
    if (typeof doc.content === 'string') {
      // Try to parse as JSON
      try {
        const parsed = JSON.parse(doc.content);
        if (parsed.zh) contentStr = parsed.zh;
        else contentStr = doc.content;
      } catch { contentStr = doc.content; }
    } else {
      contentStr = JSON.stringify(doc.content);
    }
  }
  
  // Find question by number
  const lines = contentStr.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(new RegExp(`^\\s*${questionNo}[)）,]`))) {
      console.log('Q'+questionNo+' context:\n', lines.slice(i, i+8).join('\n'));
      break;
    }
  }
  
  // Find config/answer
  const dataArr = Array.isArray(doc.data) ? doc.data : Object.values(doc.data || {});
  for (const d of dataArr) {
    if (d && typeof d === 'object' && d.config) {
      const cfgStr = typeof d.config === 'string' ? d.config : JSON.stringify(d.config);
      if (cfgStr.includes('answers')) {
        const lines2 = cfgStr.split('\n');
        let inAnswers = false;
        const output = [];
        for (const line of lines2) {
          if (line.includes('answers:')) inAnswers = true;
          if (inAnswers) { output.push(line); if (output.length > 35) break; }
        }
        console.log('Config answers:\n', output.join('\n').slice(0, 600));
        break;
      }
    }
  }
}

await client.close();
