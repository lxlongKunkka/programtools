
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import CourseGroup from '../server/models/CourseGroup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

const MONGO_URI = process.env.MONGODB_URI;

async function checkGroups() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
    
    const groups = await CourseGroup.find({}).sort({ order: 1 });
    console.log('Existing Groups:', groups.map(g => g.name));

  } catch (e) {
    console.error(e);
  } finally {
    mongoose.disconnect();
  }
}

checkGroups();
