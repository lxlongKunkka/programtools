import { MongoClient } from 'mongodb';
const uri = 'mongodb://programtools:896b825efdb92b30989538ed3a6b167f324d4e2081adf040d91eadfd0be35b03@localhost:27017/programtools';
const client = await MongoClient.connect(uri);
const db = client.db('programtools');
const cols = await db.listCollections().toArray();
const quizCols = cols.filter(x => x.name.includes('quiz') || x.name.includes('issue'));
console.log('Quiz-related collections:', quizCols.map(x=>x.name).join(', '));

// Check each for count
for (const col of quizCols) {
  const count = await db.collection(col.name).countDocuments();
  const openCount = await db.collection(col.name).countDocuments({ status: { $in: ['pending','reviewing'] } }).catch(()=>'-');
  console.log(`  ${col.name}: total=${count}, open=${openCount}`);
}
await client.close();
