// 重排 GESP 二级 cpp-2-6-1/2/3 一维数组入门章节的题目（基于人工读题判断）
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const MONGO = process.env.APP_MONGODB_URI || 'mongodb://localhost:27017/programtools';
const APPLY = process.argv.includes('--apply');

const PLAN = {
  'cpp-2-6-1': {
    title: '数组的定义与初始化',
    required: [
      'Level1:275', // 按序输出偶数
      'Level1:282', // 数列偶数筛选
      'Level1:318', // 编程竞赛低分题总分
      'Level1:329', // 寻找首个更高建筑
    ],
    optional: [
      'Level1:339', // 神秘按钮糖果（选做）
    ],
  },
  'cpp-2-6-2': {
    title: '数组的输入与输出',
    required: [
      'Level1:332', // 序列子段反转
      'Level1:279', // 筛选K的倍数升序输出商
      'Level2:64',  // 数组逆序存放（一本通经典）
      'Level1:367', // 最长连续签到天数（多组+双数组）
    ],
    optional: [
      'Level2:170', // 零终止序列逆序输出（选做）
    ],
  },
  'cpp-2-6-3': {
    title: '数组遍历：求和与最值',
    required: [
      'Level1:283', // 每周步数求和
      'Level1:402', // 奇数位置求和
      'Level1:298', // 数组最小值
      'Level1:172', // 最大跨度值
      'Level1:182', // 土拨鼠求和
    ],
    optional: [
      'atcoder:12',   // ABC102B 最大差值
      'atcoder:1500', // ABC329B 次大值
    ],
  },
};

const COURSE_LEVEL = 2; const SUBJECT = 'cpp';

const courseLevelSchema = new mongoose.Schema({}, { strict: false, collection: 'courselevels' });
const CourseLevel = mongoose.model('CourseLevel', courseLevelSchema);

await mongoose.connect(MONGO);
const doc = await CourseLevel.findOne({ level: COURSE_LEVEL, subject: SUBJECT });
if (!doc) { console.error('no course level'); process.exit(1); }

let dirty = false;
for (const topic of doc.topics || []) {
  for (const ch of topic.chapters || []) {
    const plan = PLAN[ch.id];
    if (!plan) continue;
    const oldR = (ch.problemIds || []).slice();
    const oldO = (ch.optionalProblemIds || []).slice();
    ch.problemIds = plan.required.slice();
    ch.optionalProblemIds = plan.optional.slice();
    console.log(`# ${ch.id} ${ch.title || plan.title}`);
    console.log('  required:', oldR.join(', '), '=>', ch.problemIds.join(', '));
    console.log('  optional:', oldO.join(', '), '=>', ch.optionalProblemIds.join(', '));
    dirty = true;
  }
}

if (!dirty) { console.log('nothing to update'); process.exit(0); }
if (!APPLY) { console.log('\n(dry-run) pass --apply to write.'); process.exit(0); }

doc.markModified('topics');
await doc.save();
console.log('\nSAVED.');
process.exit(0);
