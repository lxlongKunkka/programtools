/**
 * seed_gesp_l1_l4.js
 * 补充 L1-L4 在 GESP 官方知识体系中缺失的 topic 框架
 *
 * L1 补充：条件结构专题 / 循环结构专题 / 数学基础
 * L2 补充：ASCII编码与字符处理 / 数学函数 / 暴力枚举 / 模拟
 * L3 补充：原码反码补码 / 枚举法专题 / 模拟专题
 * L4 补充：指针与引用 / 算法复杂度
 */

import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import CourseLevel from '../server/models/CourseLevel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

const GROUP_CPP = 'GESP C++ 认证课程';

function ch(titles) {
  return titles.map(t => ({
    id: '_placeholder_',
    title: t,
    content: '',
    contentType: 'markdown',
    problemIds: [],
    optionalProblemIds: [],
    optional: false
  }));
}

const SUPPLEMENT = {
  // ── L1 补充 ──────────────────────────────────
  1: [
    {
      title: '条件结构专题',
      description: 'if/else 单分支与双分支、多分支嵌套、switch 语句的用法与经典例题',
      chapters: ch([
        'if / else 单分支与双分支',
        '多分支 if-else if 与 switch',
        '条件结构综合例题'
      ])
    },
    {
      title: '循环结构专题',
      description: 'for / while / do-while 三种循环、break 与 continue 的用法与经典题',
      chapters: ch([
        'for 循环基础',
        'while 与 do-while 循环',
        'break / continue 与循环控制'
      ])
    },
    {
      title: '数学基础',
      description: '整除与取模（%）、四舍五入、绝对值等程序中常见数学运算',
      chapters: ch([
        '整除与取模',
        '四舍五入与浮点数精度',
        '绝对值与数学基础综合例题'
      ])
    }
  ],

  // ── L2 补充 ──────────────────────────────────
  2: [
    {
      title: 'ASCII 编码与字符处理',
      description: 'ASCII 编码表、字符与整数互转、字符类型 char 的使用',
      chapters: ch([
        'ASCII 编码表与字符读取',
        '字符与整数的相互转换',
        '字符判断与大小写转换'
      ])
    },
    {
      title: '数学函数',
      description: 'C++ 标准库常用数学函数：max/min、sqrt、abs、pow、floor/ceil',
      chapters: ch([
        'max / min 与比较函数',
        'sqrt / pow / abs 的用法',
        'floor / ceil / round 取整函数'
      ])
    },
    {
      title: '暴力枚举',
      description: '利用单层或多层循环穷举所有可能情况，找出满足条件的答案',
      chapters: ch([
        '单层枚举基础',
        '双重枚举与三重枚举',
        '枚举综合例题'
      ])
    },
    {
      title: '模拟',
      description: '按题目描述的流程直接逐步模拟，将现实过程转化为代码',
      chapters: ch([
        '模拟思想与步骤拆解',
        '计数模拟类例题',
        '过程模拟类例题'
      ])
    }
  ],

  // ── L3 补充 ──────────────────────────────────
  3: [
    {
      title: '原码反码补码',
      description: '整数的二进制表示方法：原码、反码、补码以及溢出的理解',
      chapters: ch([
        '原码与无符号整数表示',
        '反码与补码',
        '溢出与数据范围'
      ])
    },
    {
      title: '枚举法专题',
      description: 'GESP三级枚举考点：多维枚举与子集枚举，结合数组的综合应用',
      chapters: ch([
        '多维枚举与数组结合',
        '子集枚举（位运算辅助）',
        '枚举剪枝与效率分析'
      ])
    },
    {
      title: '模拟专题',
      description: 'GESP三级模拟考点：数组模拟、矩阵模拟与字符串模拟',
      chapters: ch([
        '数组模拟栈/队列',
        '矩阵/方格模拟',
        '字符串模拟类例题'
      ])
    }
  ],

  // ── L4 补充 ──────────────────────────────────
  4: [
    {
      title: '指针与引用',
      description: 'C++ 指针基础、值传递与引用传递的区别，GESP四级官方考点',
      chapters: ch([
        '指针的概念与基本操作',
        '值传递与引用传递（& 参数）',
        '指针与数组的关系'
      ])
    },
    {
      title: '算法复杂度',
      description: '时间复杂度与空间复杂度的概念、O 记号、常见复杂度量级分析',
      chapters: ch([
        '时间复杂度概念与 O 记号',
        '常见复杂度量级（O(1)/O(n)/O(n²)/O(log n)）',
        '复杂度估算与超时判断'
      ])
    }
  ]
};

function recomputeIds(levelNum, topicIndex, chapters) {
  const prefix = `${levelNum}-${topicIndex + 1}`;
  chapters.forEach((ch, idx) => { ch.id = `${prefix}-${idx + 1}`; });
}

async function appendMissingTopics(levelDoc, newTopics) {
  const existingTitles = new Set(levelDoc.topics.map(t => t.title));
  let added = 0;
  for (const t of newTopics) {
    if (existingTitles.has(t.title)) {
      console.log(`  [SKIP] L${levelDoc.level} topic 已存在: "${t.title}"`);
      continue;
    }
    const topicIndex = levelDoc.topics.length;
    recomputeIds(levelDoc.level, topicIndex, t.chapters);
    levelDoc.topics.push(t);
    console.log(`  [ADD]  L${levelDoc.level} 新增 topic: "${t.title}" (${t.chapters.length} 章)`);
    added++;
    existingTitles.add(t.title);
  }
  if (added > 0) {
    levelDoc.markModified('topics');
    await levelDoc.save();
  }
  return added;
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ 已连接 MongoDB\n');

  let totalAdded = 0;
  for (const [levelNum, newTopics] of Object.entries(SUPPLEMENT)) {
    const lvl = parseInt(levelNum);
    const doc = await CourseLevel.findOne({ level: lvl, group: GROUP_CPP });
    if (!doc) { console.warn(`⚠️  未找到 L${lvl}，跳过`); continue; }
    console.log(`── 处理 L${lvl}: ${doc.title} ──`);
    totalAdded += await appendMissingTopics(doc, newTopics);
  }

  console.log(`\n✅ 完成！本次新增 ${totalAdded} 个 topic。`);
  await mongoose.disconnect();
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
