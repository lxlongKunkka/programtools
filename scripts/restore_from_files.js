
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import CourseLevel from '../server/models/CourseLevel.js';
import CourseGroup from '../server/models/CourseGroup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

const ROOT_DIR = path.resolve(__dirname, '../server/public/courseware/C++');
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/programtools';

console.log('Using MongoDB URI:', MONGO_URI);
console.log('Scanning directory:', ROOT_DIR);

const GROUP_MAPPING = {
    1: 'C++基础',
    2: 'C++基础',
    3: 'C++进阶',
    4: 'C++进阶',
    5: 'C++提高'
};

async function restore() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Ensure Groups Exist
        const groups = ['C++基础', 'C++进阶', 'C++提高'];
        for (const name of groups) {
            const exists = await CourseGroup.findOne({ name });
            if (!exists) {
                await CourseGroup.create({ name, title: name, order: groups.indexOf(name) + 1 });
                console.log(`Created group: ${name}`);
            }
        }

        // Scan Levels
        const entries = fs.readdirSync(ROOT_DIR, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory() && entry.name.startsWith('level')) {
                const levelNum = parseInt(entry.name.replace('level', ''));
                if (isNaN(levelNum)) continue;

                console.log(`Processing Level ${levelNum}...`);
                
                const targetGroup = GROUP_MAPPING[levelNum] || 'C++提高';

                // Check if level exists specifically in this group
                let levelDoc = await CourseLevel.findOne({ level: levelNum, group: targetGroup });
                
                if (!levelDoc) {
                    levelDoc = new CourseLevel({
                        level: levelNum,
                        title: `Level ${levelNum}`,
                        group: targetGroup,
                        subject: 'C++',
                        topics: []
                    });
                    console.log(`  Creating new Level ${levelNum} in group ${targetGroup}`);
                } else {
                    console.log(`  Found existing Level ${levelNum} in group ${targetGroup}`);
                }

                const levelPath = path.join(ROOT_DIR, entry.name);
                const topicEntries = fs.readdirSync(levelPath, { withFileTypes: true });

                for (const topicEntry of topicEntries) {
                    if (topicEntry.isDirectory()) {
                        const topicTitle = topicEntry.name;
                        console.log(`  Found Topic: ${topicTitle}`);

                        // Check if topic exists
                        let topic = levelDoc.topics.find(t => t.title === topicTitle);
                        if (!topic) {
                            // Create and push, then get reference to subdocument
                            levelDoc.topics.push({ title: topicTitle, chapters: [] });
                            topic = levelDoc.topics[levelDoc.topics.length - 1];
                        }

                        // Scan Chapters
                        const topicPath = path.join(levelPath, topicTitle);
                        const chapterFiles = fs.readdirSync(topicPath);
                        
                        for (const file of chapterFiles) {
                            if (file.endsWith('.html') || file.endsWith('.md')) {
                                const title = path.basename(file, path.extname(file));
                                // Fix path to include C++
                                const relativePath = `/public/courseware/C++/${entry.name}/${topicTitle}/${file}`;
                                
                                // Check if chapter exists
                                const chapterExists = topic.chapters.find(c => c.title === title);
                                if (!chapterExists) {
                                    topic.chapters.push({
                                        id: `${levelNum}-${topic.chapters.length + 1}`, // Simple ID generation
                                        title: title,
                                        contentType: file.endsWith('.html') ? 'html' : 'markdown',
                                        resourceUrl: relativePath,
                                        content: '' // Content is in the file
                                    });
                                    console.log(`    Added Chapter: ${title}`);
                                }
                            }
                        }
                    }
                }

                await levelDoc.save();
                console.log(`Saved Level ${levelNum}`);
            }
        }

        console.log('Restore complete.');

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}

restore();
