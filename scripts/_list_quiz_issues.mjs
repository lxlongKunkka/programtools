import { appConn } from '../server/db.js';
import { writeFileSync } from 'fs';

await new Promise(r => appConn.once('open', r));
const db = appConn.db;
const issues = await db.collection('quiz_question_issues')
  .find({ status: { $in: ['pending', 'reviewing'] } })
  .sort({ createdAt: 1 })
  .toArray();

writeFileSync('/tmp/quiz_issues_open.json', JSON.stringify(issues, null, 2));
console.log('Written', issues.length, 'issues to /tmp/quiz_issues_open.json');
process.exit(0);
