
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

const gespData = [
  {
    level: 1,
    title: "GESP 一级 (语法与顺序逻辑)",
    description: "零基础入门，掌握C++基本语法，培养计算思维，能够将简单数学问题转化为代码。",
    topics: [
      {
        title: "第一次交互 (IO基础)",
        chapters: [
          { title: "Hello World (cout输出)", id: "gesp-1-1-1" },
          { title: "换行与格式 (endl)", id: "gesp-1-1-2" },
          { title: "代码的注释 (//)", id: "gesp-1-1-3" }
        ]
      },
      {
        title: "整数的盒子 (变量基础)",
        chapters: [
          { title: "什么是变量 (int定义)", id: "gesp-1-2-1" },
          { title: "给变量赋值 (=)", id: "gesp-1-2-2" },
          { title: "交换两个变量", id: "gesp-1-2-3" }
        ]
      },
      {
        title: "数据的输入 (交互)",
        chapters: [
          { title: "cin 读取整数", id: "gesp-1-3-1" },
          { title: "一次读取多个数据", id: "gesp-1-3-2" }
        ]
      },
      {
        title: "计算机算术 (运算)",
        chapters: [
          { title: "加减乘除 (+ - * /)", id: "gesp-1-4-1" },
          { title: "取余运算 (%) 的妙用", id: "gesp-1-4-2" },
          { title: "复合赋值 (+=, -=)", id: "gesp-1-4-3" }
        ]
      },
      {
        title: "更多数据类型",
        chapters: [
          { title: "小数类型 (double)", id: "gesp-1-5-1" },
          { title: "字符类型 (char)与ASCII", id: "gesp-1-5-2" },
          { title: "布尔类型 (bool)与比较运算", id: "gesp-1-5-3" }
        ]
      },
      {
        title: "简单的逻辑 (分支与循环)",
        chapters: [
          { title: "if 判断语句", id: "gesp-1-6-1" },
          { title: "if-else 双分支", id: "gesp-1-6-2" },
          { title: "for 循环基础 (输出1-100)", id: "gesp-1-6-3" }
        ]
      }
    ]
  },
  {
    level: 2,
    title: "GESP 二级 (逻辑进阶)",
    description: "掌握复杂逻辑，学会画流程图，处理更复杂的情况。",
    topics: [
      {
        title: "逻辑运算",
        chapters: [
          { title: "逻辑与 (&&)", id: "gesp-2-1-1" },
          { title: "逻辑或 (||) 与 非 (!)", id: "gesp-2-1-2" },
          { title: "闰年判断综合练习", id: "gesp-2-1-3" }
        ]
      },
      {
        title: "多重选择",
        chapters: [
          { title: "if-else if 多分支", id: "gesp-2-2-1" },
          { title: "switch-case 语句", id: "gesp-2-2-2" }
        ]
      },
      {
        title: "循环进阶",
        chapters: [
          { title: "while 循环", id: "gesp-2-3-1" },
          { title: "do-while 循环", id: "gesp-2-3-2" },
          { title: "break 与 continue", id: "gesp-2-3-3" }
        ]
      },
      {
        title: "数位拆解专题",
        chapters: [
          { title: "拆解个位、十位、百位", id: "gesp-2-4-1" },
          { title: "水仙花数实战", id: "gesp-2-4-2" }
        ]
      },
      {
        title: "嵌套结构",
        chapters: [
          { title: "双层 for 循环 (打印图形)", id: "gesp-2-5-1" },
          { title: "九九乘法表", id: "gesp-2-5-2" }
        ]
      },
      {
        title: "数组初探",
        chapters: [
          { title: "一维数组定义与访问", id: "gesp-2-6-1" },
          { title: "数组遍历与求和", id: "gesp-2-6-2" }
        ]
      }
    ]
  },
  {
    level: 3,
    title: "GESP 三级 (算法萌芽)",
    description: "掌握数据批量处理能力，学会函数封装，接触基础算法思想。",
    topics: [
      {
        title: "数组应用",
        chapters: [
          { title: "数组找最大/最小值", id: "gesp-3-1-1" },
          { title: "数组计数 (桶的思想)", id: "gesp-3-1-2" }
        ]
      },
      {
        title: "字符串处理",
        chapters: [
          { title: "字符数组 vs string", id: "gesp-3-2-1" },
          { title: "字符串遍历与统计", id: "gesp-3-2-2" },
          { title: "字符串查找与替换", id: "gesp-3-2-3" }
        ]
      },
      {
        title: "进制与编码",
        chapters: [
          { title: "二进制与十进制转换", id: "gesp-3-3-1" },
          { title: "8进制与16进制", id: "gesp-3-3-2" },
          { title: "原码、反码、补码", id: "gesp-3-3-3" }
        ]
      },
      {
        title: "位运算",
        chapters: [
          { title: "按位与(&)、或(|)、异或(^)", id: "gesp-3-4-1" },
          { title: "左移(<<) 与 右移(>>)", id: "gesp-3-4-2" }
        ]
      },
      {
        title: "基础算法思想",
        chapters: [
          { title: "枚举法 (暴力破解)", id: "gesp-3-5-1" },
          { title: "模拟法 (按题意实现)", id: "gesp-3-5-2" }
        ]
      }
    ]
  },
  {
    level: 4,
    title: "GESP 四级 (函数与排序)",
    description: "学会封装，学会让数据有序，掌握基础排序算法。",
    topics: [
      {
        title: "函数编程",
        chapters: [
          { title: "函数的定义与调用", id: "gesp-4-1-1" },
          { title: "局部变量与全局变量", id: "gesp-4-1-2" },
          { title: "值传递与引用传递", id: "gesp-4-1-3" }
        ]
      },
      {
        title: "结构体",
        chapters: [
          { title: "struct 定义与使用", id: "gesp-4-2-1" },
          { title: "结构体数组 (学生成绩表)", id: "gesp-4-2-2" }
        ]
      },
      {
        title: "排序算法",
        chapters: [
          { title: "冒泡排序", id: "gesp-4-3-1" },
          { title: "选择排序", id: "gesp-4-3-2" },
          { title: "插入排序", id: "gesp-4-3-3" },
          { title: "sort 函数的使用", id: "gesp-4-3-4" }
        ]
      },
      {
        title: "二维数组",
        chapters: [
          { title: "矩阵的定义与遍历", id: "gesp-4-4-1" },
          { title: "杨辉三角 (二维数组版)", id: "gesp-4-4-2" }
        ]
      },
      {
        title: "递推算法",
        chapters: [
          { title: "斐波那契数列", id: "gesp-4-5-1" },
          { title: "简单递推模型", id: "gesp-4-5-2" }
        ]
      }
    ]
  },
  {
    level: 5,
    title: "GESP 五级 (数论与效率)",
    description: "关注程序效率，掌握常用数据结构，学习分治与贪心。",
    topics: [
      {
        title: "算法效率",
        chapters: [
          { title: "时间复杂度 (Big O)", id: "gesp-5-1-1" },
          { title: "空间复杂度", id: "gesp-5-1-2" }
        ]
      },
      {
        title: "数论基础",
        chapters: [
          { title: "质数判定 (试除法)", id: "gesp-5-2-1" },
          { title: "埃氏筛法与线性筛", id: "gesp-5-2-2" },
          { title: "GCD 与 LCM", id: "gesp-5-2-3" }
        ]
      },
      {
        title: "高精度运算",
        chapters: [
          { title: "高精度加法", id: "gesp-5-3-1" },
          { title: "高精度减法", id: "gesp-5-3-2" },
          { title: "高精度乘法", id: "gesp-5-3-3" }
        ]
      },
      {
        title: "二分与贪心",
        chapters: [
          { title: "二分查找 (Binary Search)", id: "gesp-5-4-1" },
          { title: "二分答案", id: "gesp-5-4-2" },
          { title: "简单贪心策略", id: "gesp-5-4-3" }
        ]
      }
    ]
  },
  {
    level: 6,
    title: "GESP 六级 (数据结构)",
    description: "掌握非线性结构（树）和暴力搜索的优化。",
    topics: [
      {
        title: "线性结构进阶",
        chapters: [
          { title: "栈 (Stack) 与 STL", id: "gesp-6-1-1" },
          { title: "队列 (Queue) 与 STL", id: "gesp-6-1-2" }
        ]
      },
      {
        title: "树结构",
        chapters: [
          { title: "树与二叉树概念", id: "gesp-6-2-1" },
          { title: "二叉树遍历 (前中后)", id: "gesp-6-2-2" },
          { title: "哈夫曼树", id: "gesp-6-2-3" }
        ]
      },
      {
        title: "搜索算法",
        chapters: [
          { title: "深度优先搜索 (DFS)", id: "gesp-6-3-1" },
          { title: "广度优先搜索 (BFS)", id: "gesp-6-3-2" }
        ]
      },
      {
        title: "动态规划入门",
        chapters: [
          { title: "记忆化搜索", id: "gesp-6-4-1" },
          { title: "简单一维 DP", id: "gesp-6-4-2" }
        ]
      }
    ]
  },
  {
    level: 7,
    title: "GESP 七级 (图论与DP)",
    description: "攻克复杂问题，掌握图论、复杂DP及组合数学。",
    topics: [
      {
        title: "图的存储与遍历",
        chapters: [
          { title: "邻接矩阵与邻接表", id: "gesp-7-1-1" },
          { title: "图的 DFS 与 BFS", id: "gesp-7-1-2" }
        ]
      },
      {
        title: "进阶动态规划",
        chapters: [
          { title: "最长上升子序列 (LIS)", id: "gesp-7-2-1" },
          { title: "最长公共子序列 (LCS)", id: "gesp-7-2-2" },
          { title: "0/1 背包与完全背包", id: "gesp-7-2-3" }
        ]
      },
      {
        title: "进阶图算法",
        chapters: [
          { title: "Flood Fill (泛洪算法)", id: "gesp-7-3-1" },
          { title: "拓扑排序", id: "gesp-7-3-2" }
        ]
      }
    ]
  },
  {
    level: 8,
    title: "GESP 八级 (综合巅峰)",
    description: "算法的巅峰，数学与计算机的完美结合。",
    topics: [
      {
        title: "最短路径",
        chapters: [
          { title: "Dijkstra 算法", id: "gesp-8-1-1" },
          { title: "Floyd 算法", id: "gesp-8-1-2" }
        ]
      },
      {
        title: "最小生成树",
        chapters: [
          { title: "Prim 算法", id: "gesp-8-2-1" },
          { title: "Kruskal 算法 (并查集)", id: "gesp-8-2-2" }
        ]
      },
      {
        title: "组合数学",
        chapters: [
          { title: "排列与组合公式", id: "gesp-8-3-1" },
          { title: "杨辉三角与组合数", id: "gesp-8-3-2" }
        ]
      },
      {
        title: "算法优化技巧",
        chapters: [
          { title: "倍增法 (LCA)", id: "gesp-8-4-1" },
          { title: "前缀和与差分", id: "gesp-8-4-2" }
        ]
      }
    ]
  }
];

async function seedGespCourses() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const groupName = "GESP C++ 认证课程";
    
    // 1. Create or Update CourseGroup
    let group = await CourseGroup.findOne({ name: groupName });
    if (!group) {
      group = new CourseGroup({
        name: groupName,
        title: groupName,
        language: 'C++',
        order: 1
      });
      await group.save();
      console.log(`Created CourseGroup: ${groupName}`);
    } else {
      console.log(`CourseGroup already exists: ${groupName}`);
    }

    // 2. Create or Update CourseLevels
    for (const levelData of gespData) {
      const filter = { group: groupName, level: levelData.level };
      const update = {
        title: levelData.title,
        description: levelData.description,
        subject: 'C++',
        label: `Level ${levelData.level}`,
        topics: levelData.topics
      };

      const result = await CourseLevel.findOneAndUpdate(filter, update, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      });

      console.log(`Processed Level ${levelData.level}: ${levelData.title}`);
    }

    console.log('All GESP courses seeded successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Error seeding courses:', error);
    process.exit(1);
  }
}

seedGespCourses();
