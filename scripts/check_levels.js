
import mongoose from 'mongoose';
import CourseLevel from '../server/models/CourseLevel.js';
import CourseGroup from '../server/models/CourseGroup.js';

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/programtools')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

async function checkLevels() {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));

    const levels = await CourseLevel.find({});
    console.log(`Found ${levels.length} levels.`);
    
    if (levels.length > 0) {
        console.log('--- Level Details ---');
        levels.forEach(l => {
          console.log(`Level ${l.level}: Title="${l.title}", Group="${l.group}", Subject="${l.subject}"`);
        });
    }

  } catch (error) {
    console.error('Error checking levels:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkLevels();
