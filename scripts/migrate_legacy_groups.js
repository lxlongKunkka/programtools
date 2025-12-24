
import mongoose from 'mongoose';
import CourseLevel from '../server/models/CourseLevel.js';
import CourseGroup from '../server/models/CourseGroup.js';
import { SUBJECTS_CONFIG } from '../src/utils/courseConfig.js';

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/programtools')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

async function migrate() {
  try {
    console.log('Starting migration...');
    
    // 1. Ensure Groups Exist
    for (const config of SUBJECTS_CONFIG) {
        if (!config.minLevel) continue; // Skip non-level based subjects like Python/Web for now if they don't have ranges

        const exists = await CourseGroup.findOne({ name: config.name });
        if (!exists) {
            console.log(`Creating group: ${config.name}`);
            await CourseGroup.create({
                name: config.name,
                title: config.name,
                order: config.minLevel // Use minLevel as rough order
            });
        }
    }

    // 2. Update Levels
    const levels = await CourseLevel.find({});
    let updatedCount = 0;

    for (const level of levels) {
        // Skip if already has a group
        if (level.group) continue;

        // Find matching config
        const config = SUBJECTS_CONFIG.find(c => {
            if (!c.minLevel) return false;
            return level.level >= c.minLevel && level.level <= (c.maxLevel || 999);
        });

        if (config) {
            console.log(`Migrating Level ${level.level} ("${level.title}") to Group "${config.name}"`);
            level.group = config.name;
            await level.save();
            updatedCount++;
        } else {
            console.log(`Level ${level.level} ("${level.title}") does not match any legacy range.`);
        }
    }

    console.log(`Migration complete. Updated ${updatedCount} levels.`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    mongoose.disconnect();
  }
}

migrate();
