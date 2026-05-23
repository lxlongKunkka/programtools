import { MongoClient } from 'mongodb';
// Hydro uses a different DB - typically 'hydro' 
const uri = 'mongodb://localhost:27017';
const client = await MongoClient.connect(uri);

// List databases to find Hydro
const adminDb = client.db('admin');
const dbList = await adminDb.admin().listDatabases();
console.log('Databases:', dbList.databases.map(d=>d.name).join(', '));

// Try hydro DB
for (const dbName of ['hydro', 'Hydro', 'acjudge', 'judge']) {
  const db = client.db(dbName);
  const cols = await db.listCollections().toArray().catch(()=>[]);
  if (cols.length > 0) {
    console.log('\nDB', dbName, 'has', cols.length, 'collections:', cols.slice(0,5).map(c=>c.name).join(', '));
  }
}

await client.close();
