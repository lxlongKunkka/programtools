import { appConn } from '../server/db.js';
import { writeFileSync } from 'fs';

await new Promise(r => appConn.once('open', r));
const db = appConn.db;

const issues = JSON.parse(await (await import('fs')).promises.readFile('/tmp/quiz_issues_open.json', 'utf8'));

const uids = [...new Set(issues.map(i => i.questionUid))];
console.log('Unique questions:', uids.length);

const questions = await db.collection('quiz_questions')
  .find({ questionUid: { $in: uids } })
  .toArray();

const qmap = Object.fromEntries(questions.map(q => [q.questionUid, q]));

const result = issues.map(issue => ({
  _id: issue._id,
  questionUid: issue.questionUid,
  issueType: issue.issueType,
  detail: issue.detail,
  status: issue.status,
  question: qmap[issue.questionUid] ? {
    questionUid: qmap[issue.questionUid].questionUid,
    type: qmap[issue.questionUid].type,
    stem: qmap[issue.questionUid].stem,
    options: qmap[issue.questionUid].options,
    answer: qmap[issue.questionUid].answer,
    explanation: qmap[issue.questionUid].explanation,
    enabled: qmap[issue.questionUid].enabled,
  } : null,
}));

writeFileSync('/tmp/quiz_issues_detail.json', JSON.stringify(result, null, 2));
console.log('Written to /tmp/quiz_issues_detail.json');
process.exit(0);
