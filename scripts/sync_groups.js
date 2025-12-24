
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import CourseGroup from '../server/models/CourseGroup.js';
import { SUBJECTS_CONFIG } from '../src/utils/courseConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

const MONGO_URI = process.env.MONGODB_URI;

async function syncGroups() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
    
    const existingGroups = await CourseGroup.find({});
    const existingNames = new Set(existingGroups.map(g => g.name));

    let orderCounter = existingGroups.length > 0 ? Math.max(...existingGroups.map(g => g.order || 0)) + 1 : 1;

    for (const config of SUBJECTS_CONFIG) {
        if (!existingNames.has(config.name)) {
            console.log(`Adding missing group: ${config.name}`);
            await CourseGroup.create({
                name: config.name,
                title: config.name,
                order: orderCounter++
            });
        }
    }

    console.log('Sync complete.');

  } catch (e) {
    console.error(e);
  } finally {
    mongoose.disconnect();
  }
}

syncGroups();
