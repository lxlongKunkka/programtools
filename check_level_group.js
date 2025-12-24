import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CourseLevel from './server/models/CourseLevel.js';

dotenv.config({ path: 'server/.env' });

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/programtools')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Find levels with "算法" or "进阶" in title
    const levels = await CourseLevel.find({ 
      title: { $regex: /算法|进阶/ } 
    });
    
    console.log('Found levels:');
    levels.forEach(l => {
      console.log(`- Title: "${l.title}", Group: "${l.group}", Level: ${l.level}`);
    });

    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
