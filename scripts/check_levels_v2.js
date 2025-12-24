
import mongoose from 'mongoose';
import CourseLevel from '../server/models/CourseLevel.js';

const uri = 'mongodb://localhost:27017/programtools';

async function run() {
  try {
    await mongoose.connect(uri);
    console.log('Connected.');
    
    // Wait a bit to ensure connection is fully ready (though await connect should be enough)
    // Access native driver
    if (mongoose.connection.readyState !== 1) {
        console.log('State:', mongoose.connection.readyState);
    }

    const admin = mongoose.connection.db.admin();
    const dbs = await admin.listDatabases();
    console.log('Databases:', dbs.databases.map(d => d.name));

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections in programtools:', collections.map(c => c.name));

    const levels = await CourseLevel.find({});
    console.log(`Found ${levels.length} levels in 'courselevels'.`);
    
    // Check if there is a 'levels' collection
    const levelsCollection = mongoose.connection.db.collection('levels');
    const rawLevels = await levelsCollection.find({}).toArray();
    console.log(`Found ${rawLevels.length} documents in 'levels' collection.`);

  } catch (e) {
    console.error(e);
  } finally {
    mongoose.disconnect();
  }
}

run();
