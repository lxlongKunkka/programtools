
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import CourseGroup from '../models/CourseGroup.js';
import CourseLevel from '../models/CourseLevel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/programtools';

const gespPythonData = [
  {
    level: 1,
    title: "GESP Python 一级 (基础语法与绘图)",
    description: "零基础入门，掌握Python基本语法与Turtle绘图，培养编程兴趣与计算思维。",
    topics: [
      {
        title: "Python 初体验",
        chapters: [
          { title: "Hello Python (print输出)", id: "gesp-py-1-1-1", desc: "学习 print 函数，输出字符串和数字。" },
          { title: "代码的注释与格式", id: "gesp-py-1-1-2", desc: "学习单行注释 #，了解缩进的重要性。" },
          { title: "输入与输出 (input/print)", id: "gesp-py-1-1-3", desc: "学习 input 函数获取用户输入，并进行简单交互。" }
        ]
      },
      {
        title: "变量与运算",
        chapters: [
          { title: "神奇的盒子 (变量)", id: "gesp-py-1-2-1", desc: "理解变量的概念，变量命名规则，赋值操作。" },
          { title: "数学运算 (+ - * /)", id: "gesp-py-1-2-2", desc: "掌握基本的四则运算。" },
          { title: "取余与整除 (% //)", id: "gesp-py-1-2-3", desc: "理解取余和整除运算，并应用于实际问题（如判断奇偶）。" }
        ]
      },
      {
        title: "海龟画图 (Turtle)",
        chapters: [
          { title: "初识海龟 (forward/right)", id: "gesp-py-1-3-1", desc: "引入 turtle 库，控制海龟移动和转向。" },
          { title: "画出几何图形", id: "gesp-py-1-3-2", desc: "使用 turtle 画正方形、三角形等简单图形。" },
          { title: "给图形填色 (fill)", id: "gesp-py-1-3-3", desc: "学习 begin_fill, end_fill 给封闭图形填充颜色。" }
        ]
      },
      {
        title: "逻辑判断",
        chapters: [
          { title: "真与假 (bool类型)", id: "gesp-py-1-4-1", desc: "理解布尔类型 True/False。" },
          { title: "比较大小 (>, <, ==)", id: "gesp-py-1-4-2", desc: "掌握比较运算符。" },
          { title: "if 条件语句", id: "gesp-py-1-4-3", desc: "学习单分支结构。" },
          { title: "if-else 双分支", id: "gesp-py-1-4-4", desc: "学习双分支结构，处理两种情况。" }
        ]
      },
      {
        title: "简单的循环",
        chapters: [
          { title: "for 循环与 range", id: "gesp-py-1-5-1", desc: "掌握 for 循环的基本语法，使用 range 生成序列。" },
          { title: "用循环画图", id: "gesp-py-1-5-2", desc: "结合 turtle 和 for 循环画出重复图形（如正多边形）。" },
          { title: "累加求和", id: "gesp-py-1-5-3", desc: "使用循环计算 1 到 100 的和。" }
        ]
      }
    ]
  },
  {
    level: 2,
    title: "GESP Python 二级 (数据结构与逻辑)",
    description: "掌握列表、字符串等基本数据结构，学习多重循环与复杂逻辑。",
    topics: [
      {
        title: "逻辑进阶",
        chapters: [
          { title: "逻辑运算 (and, or, not)", id: "gesp-py-2-1-1", desc: "掌握逻辑与、或、非运算。" },
          { title: "if-elif-else 多分支", id: "gesp-py-2-1-2", desc: "处理多种条件的情况。" },
          { title: "闰年判断", id: "gesp-py-2-1-3", desc: "综合运用逻辑运算符和分支结构判断闰年。" }
        ]
      },
      {
        title: "循环深入",
        chapters: [
          { title: "while 循环", id: "gesp-py-2-2-1", desc: "掌握 while 循环的语法和应用场景。" },
          { title: "break 与 continue", id: "gesp-py-2-2-2", desc: "控制循环的流程，跳出循环或跳过本次迭代。" },
          { title: "循环嵌套 (打印图形)", id: "gesp-py-2-2-3", desc: "使用双重循环打印矩形、三角形等字符图形。" },
          { title: "百钱买百鸡 (穷举法)", id: "gesp-py-2-2-4", desc: "使用嵌套循环解决经典的数学问题。" }
        ]
      },
      {
        title: "列表 (List)",
        chapters: [
          { title: "列表的定义与访问", id: "gesp-py-2-3-1", desc: "创建列表，使用索引访问元素。" },
          { title: "列表的操作 (append, insert)", id: "gesp-py-2-3-2", desc: "向列表中添加、插入元素。" },
          { title: "列表遍历与统计", id: "gesp-py-2-3-3", desc: "使用 for 循环遍历列表，计算总和、最大值等。" },
          { title: "列表切片", id: "gesp-py-2-3-4", desc: "掌握切片语法 [start:end:step]，提取列表子集。" }
        ]
      },
      {
        title: "字符串 (String)",
        chapters: [
          { title: "字符串遍历", id: "gesp-py-2-4-1", desc: "逐个访问字符串中的字符。" },
          { title: "字符串常用方法", id: "gesp-py-2-4-2", desc: "学习 split, join, replace, find 等常用方法。" },
          { title: "ASCII 码与字符转换", id: "gesp-py-2-4-3", desc: "理解字符编码，使用 ord() 和 chr() 函数。" }
        ]
      }
    ]
  },
  {
    level: 3,
    title: "GESP Python 三级 (函数与算法基础)",
    description: "学习函数封装，掌握字典、集合等高级数据结构，接触基础算法。",
    topics: [
      {
        title: "函数 (Function)",
        chapters: [
          { title: "函数的定义与调用", id: "gesp-py-3-1-1", desc: "学习 def 关键字，封装代码块。" },
          { title: "参数与返回值", id: "gesp-py-3-1-2", desc: "理解形参、实参，使用 return 返回结果。" },
          { title: "变量作用域 (global)", id: "gesp-py-3-1-3", desc: "理解局部变量和全局变量的区别。" }
        ]
      },
      {
        title: "高级数据结构",
        chapters: [
          { title: "元组 (Tuple)", id: "gesp-py-3-2-1", desc: "理解元组的不可变性及其应用。" },
          { title: "字典 (Dictionary) 基础", id: "gesp-py-3-2-2", desc: "掌握键值对结构，字典的增删改查。" },
          { title: "字典的应用 (词频统计)", id: "gesp-py-3-2-3", desc: "使用字典统计字符串中字符出现的次数。" },
          { title: "集合 (Set) 与去重", id: "gesp-py-3-2-4", desc: "利用集合的特性进行列表去重。" }
        ]
      },
      {
        title: "常用模块",
        chapters: [
          { title: "math 数学模块", id: "gesp-py-3-3-1", desc: "使用 math.sqrt, math.ceil 等函数。" },
          { title: "random 随机数模块", id: "gesp-py-3-3-2", desc: "生成随机整数、随机选择等。" },
          { title: "time 时间模块", id: "gesp-py-3-3-3", desc: "简单的延时和时间获取。" }
        ]
      },
      {
        title: "算法入门",
        chapters: [
          { title: "进制转换 (二/八/十/十六)", id: "gesp-py-3-4-1", desc: "理解不同进制，使用 bin, oct, hex 函数。" },
          { title: "简单模拟算法", id: "gesp-py-3-4-2", desc: "根据题目描述模拟过程解决问题。" },
          { title: "解析字符串", id: "gesp-py-3-4-3", desc: "处理复杂的字符串解析问题。" }
        ]
      }
    ]
  },
  {
    level: 4,
    title: "GESP Python 四级 (算法进阶与综合)",
    description: "掌握递归、排序算法，学习文件操作与异常处理，具备解决复杂问题的能力。",
    topics: [
      {
        title: "递归算法",
        chapters: [
          { title: "什么是递归", id: "gesp-py-4-1-1", desc: "理解函数调用自身的概念，递归的终止条件。" },
          { title: "斐波那契数列", id: "gesp-py-4-1-2", desc: "使用递归计算斐波那契数列。" },
          { title: "汉诺塔问题", id: "gesp-py-4-1-3", desc: "经典的递归问题求解。" }
        ]
      },
      {
        title: "排序算法",
        chapters: [
          { title: "冒泡排序", id: "gesp-py-4-2-1", desc: "理解冒泡排序的原理并实现。" },
          { title: "选择排序", id: "gesp-py-4-2-2", desc: "理解选择排序的原理并实现。" },
          { title: "插入排序", id: "gesp-py-4-2-3", desc: "理解插入排序的原理并实现。" },
          { title: "sort 方法与 lambda", id: "gesp-py-4-2-4", desc: "使用 Python 内置的排序方法及自定义排序规则。" }
        ]
      },
      {
        title: "文件与异常",
        chapters: [
          { title: "文件的读写 (open)", id: "gesp-py-4-3-1", desc: "学习打开、读取、写入和关闭文件。" },
          { title: "异常处理 (try-except)", id: "gesp-py-4-3-2", desc: "捕获和处理程序运行时的错误。" }
        ]
      },
      {
        title: "综合能力",
        chapters: [
          { title: "自定义类 (Class) 初探", id: "gesp-py-4-4-1", desc: "了解面向对象编程的基本概念（类与对象）。" },
          { title: "综合项目：学生管理系统", id: "gesp-py-4-4-2", desc: "综合运用文件、列表、字典、函数等知识实现一个小型系统。" }
        ]
      }
    ]
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Create or Update Course Group
    let group = await CourseGroup.findOne({ name: 'GESP_Python' });
    if (!group) {
      group = await CourseGroup.create({
        name: 'GESP_Python',
        title: 'GESP Python 考级课程',
        language: 'Python',
        order: 2
      });
      console.log('Created CourseGroup: GESP_Python');
    } else {
      console.log('Found CourseGroup: GESP_Python');
    }

    // 2. Create Levels and Topics
    for (const levelData of gespPythonData) {
      // Construct topics structure
      const topics = levelData.topics.map((topic, tIndex) => ({
        title: topic.title,
        chapters: topic.chapters.map((chapter, cIndex) => ({
          id: chapter.id,
          title: chapter.title,
          content: `**本节课核心目标**：${chapter.desc}\n\n**建议教学大纲**：\n1. **引入**：通过生活案例引入本节课主题。\n2. **知识点**：详细讲解 ${chapter.title.split(' ')[0]} 的相关概念与语法。\n3. **练习**：完成 3-5 道相关练习题。\n\n**提示**：请根据此大纲生成详细的教案或 PPT 内容。`,
          order: cIndex + 1
        })),
        order: tIndex + 1
      }));

      const updateData = {
        title: levelData.title,
        description: levelData.description,
        group: 'GESP_Python',
        level: levelData.level,
        subject: 'Python',
        label: `Level ${levelData.level}`,
        topics: topics,
        order: levelData.level
      };

      await CourseLevel.findOneAndUpdate(
        { group: 'GESP_Python', level: levelData.level },
        updateData,
        { upsert: true, new: true }
      );
      console.log(`Processed Level ${levelData.level}: ${levelData.title}`);
    }

    console.log('Seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seed();
