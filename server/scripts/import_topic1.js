
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import CourseLevel from '../models/CourseLevel.js';
import Document from '../models/Document.js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in .env');
  process.exit(1);
}

async function importTopic() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const configPath = path.resolve(__dirname, '../public/courseware/level1/topic1/config.json');
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    console.log(`Processing topic: ${config.title}`);

    const chapters = [];

    for (const section of config.sections) {
      console.log(`Processing section: ${section.title}`);

      // Resolve problem IDs
      const problemObjectIds = [];
      if (section.problems && section.problems.length > 0) {
        for (const docId of section.problems) {
          // Try to find by docId (number or string)
          let doc = await Document.findOne({ docId: docId });
          if (!doc) {
             doc = await Document.findOne({ docId: String(docId) });
          }
          
          if (doc) {
            problemObjectIds.push(doc._id);
          } else {
            console.warn(`Warning: Problem with docId ${docId} not found.`);
          }
        }
      }

      // Read content if markdown
      let content = '';
      if (section.type === 'markdown' && section.contentFile) {
        const contentPath = path.resolve(__dirname, `../public/courseware/level1/topic1/${section.contentFile}`);
        if (fs.existsSync(contentPath)) {
          content = fs.readFileSync(contentPath, 'utf-8');
        } else {
          console.warn(`Warning: Content file ${section.contentFile} not found.`);
        }
      }

      const chapter = {
        id: `1-1-${section.id}`, // Level 1, Topic 1, Section ID
        title: section.title,
        contentType: section.type === 'slide' ? 'html' : 'markdown',
        content: content,
        resourceUrl: section.type === 'slide' ? `/public/courseware/level1/topic1/${section.contentFile}` : undefined,
        problemIds: problemObjectIds,
        optional: false
      };

      chapters.push(chapter);
    }

    const newTopic = {
      title: config.title,
      description: "C++ 编程入门，学习基础语法、变量、输入输出等核心概念。",
      chapters: chapters
    };

    // Find CourseLevel 1
    const courseLevel = await CourseLevel.findOne({ level: 1 });
    if (!courseLevel) {
      console.error('CourseLevel 1 not found!');
      process.exit(1);
    }

    // Check if topic already exists
    const existingTopicIndex = courseLevel.topics.findIndex(t => t.title === config.title);

    if (existingTopicIndex !== -1) {
      console.log('Updating existing topic...');
      courseLevel.topics[existingTopicIndex] = newTopic;
    } else {
      console.log('Adding new topic to the beginning...');
      courseLevel.topics.unshift(newTopic);
    }

    await courseLevel.save();
    console.log('CourseLevel updated successfully!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

importTopic();
