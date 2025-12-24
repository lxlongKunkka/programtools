
import mongoose from 'mongoose';
import CourseLevel from '../server/models/CourseLevel.js';

mongoose.connect('mongodb://localhost:27017/programtools');

async function checkLevel3() {
  try {
    const level3 = await CourseLevel.findOne({ level: 3 });
    if (level3) {
      console.log('Level 3 found:');
      console.log('ID:', level3._id);
      console.log('Title:', level3.title);
      console.log('Group:', level3.group);
      console.log('Subject:', level3.subject);
      console.log('Topics count:', level3.topics.length);
    } else {
      console.log('Level 3 NOT found.');
    }
    
    const allLevels = await CourseLevel.find({}, 'level title group subject');
    console.log('All Levels:', allLevels.map(l => ({ l: l.level, g: l.group })));

  } catch (e) {
    console.error(e);
  } finally {
    mongoose.disconnect();
  }
}

checkLevel3();
