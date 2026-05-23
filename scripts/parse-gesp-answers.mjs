import { MongoClient } from 'mongodb';
import { parse as yamlParse } from '/var/www/programtools/node_modules/js-yaml/lib/js-yaml.js';

const uri = process.env.HYDRO_MONGODB_URI;
const client = await MongoClient.connect(uri);
const db = client.db();
const docCollection = db.collection('document');

for (const { docId, questionNo, paperUid } of [
  { docId: 241, questionNo: 19, paperUid: 'gesp-2023-09-cpp-1' },
  { docId: 235, questionNo: 21, paperUid: 'gesp-2023-03-cpp-1' }
]) {
  const doc = await docCollection.findOne({ domainId: 'gesp', docId });
  if (!doc || !doc.config) continue;
  
  // Parse the YAML config
  const cfg = yamlParse(doc.config);
  const answer = cfg.answers?.[String(questionNo)];
  console.log(paperUid + ' Q' + questionNo + ': official answer =', answer ? answer[0] : 'not found');
}

await client.close();
