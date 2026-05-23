// Close 3 misreported quiz issues as 'ignored'
import { MongoClient, ObjectId } from 'mongodb';
const uri = 'mongodb://programtools:896b825efdb92b30989538ed3a6b167f324d4e2081adf040d91eadfd0be35b03@localhost:27017/programtools';
const client = await MongoClient.connect(uri);
const db = client.db('programtools');
const issues = db.collection('quiz_question_issues');

const now = new Date();
const handledByName = 'admin';

const fixList = [
  {
    id: '6a0ef9cd72fb5578b2cd3f33',
    questionUid: 'downloads-1104-q23',
    adminNote: '误报：题目说 ** 是C++运算符为假，官方答案 B(false) 与题库一致，** 在C++中不是独立运算符。'
  },
  {
    id: '6a11029572fb5578b2e1a0d0',
    questionUid: 'gesp-2023-09-cpp-1-q19',
    adminNote: '误报：逗号运算符返回最右值 "23"，输出为 23 而非 2,3,23；官方卷 Hydro 答案 B(false) 与题库 false 一致。'
  },
  {
    id: '6a1103c372fb5578b2e1b2e2',
    questionUid: 'gesp-2023-03-cpp-1-q21',
    adminNote: '误报：C++ if 条件不必须为 bool 类型（整数/指针类型均可隐式转换）；官方卷 Hydro 答案 B(false) 与题库 false 一致。'
  }
];

for (const fix of fixList) {
  const result = await issues.updateOne(
    { _id: new ObjectId(fix.id) },
    {
      $set: {
        status: 'ignored',
        adminNote: fix.adminNote,
        handledAt: now,
        handledByName
      }
    }
  );
  console.log(`${fix.questionUid}: matched=${result.matchedCount}, modified=${result.modifiedCount}`);
}

// Verify
const remaining = await issues.countDocuments({ status: { $in: ['pending', 'reviewing'] } });
console.log('\nRemaining open issues:', remaining);

await client.close();
