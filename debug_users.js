import mongoose from 'mongoose';
import User from './server/models/User.js';
import { DIRS } from './server/config.js';

mongoose.connect('mongodb://localhost:27017/programtools').then(async () => {
  console.log('Connected to DB');
  
  const adminDb = mongoose.connection.db.admin();
  const dbs = await adminDb.listDatabases();
  console.log('Databases:', dbs.databases.map(d => d.name));
  
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name));

  const countUser = await mongoose.connection.db.collection('user').countDocuments();
  console.log('Count in "user" collection:', countUser);
  
  const countUsers = await mongoose.connection.db.collection('users').countDocuments();
  console.log('Count in "users" collection:', countUsers);

  const users = await User.find({});
  console.log('Total users:', users.length);

  if (users.length === 0) {
      console.log('Attempting to insert a test user...');
      try {
          const testUser = new User({
              _id: 99999,
              uname: 'test_admin',
              hash: 'test',
              priv: -1
          });
          await testUser.save();
          console.log('Test user inserted.');
          
          const check = await User.find({});
          console.log('Total users after insert:', check.length);
      } catch (e) {
          console.error('Insert failed:', e);
      }
  }

  
  for(const u of users) {
    const isT = u.role === 'teacher';
    const isAdmin = u.priv === -1 || u.uname === 'admin';
    
    if (isT) console.log(`Teacher: ${u.uname} (${u._id})`);
    if (isAdmin) console.log(`Admin: ${u.uname} (${u._id})`);
  }
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
