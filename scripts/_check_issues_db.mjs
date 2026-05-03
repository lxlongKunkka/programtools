import { appConn } from '../server/db.js';

await new Promise(r => appConn.once('open', r));
const db = appConn.db;

const total = await db.collection('quiz_question_issues').countDocuments({});
const open = await db.collection('quiz_question_issues').countDocuments({ reviewStatus: { $in: ['pending', 'reviewing'] } });
console.log('total:', total, 'open:', open);

const sample = await db.collection('quiz_question_issues').findOne({});
if (sample) console.log('sample keys:', Object.keys(sample));

process.exit(0);
