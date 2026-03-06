/**
 * seed_gesp_curriculum.js
 * 补充 GESP C++ 课程体系框架：
 *   - L5：补充 STL/链表/双指针/三分/分治
 *   - L6：补充 栈/队列/哈夫曼树/DFS进阶/BFS进阶/线性DP/背包DP
 *   - L7：补充 快速幂/哈希/表达式求值/DFS进阶/BFS进阶/区间DP/树上DP/二维DP
 *   - L8：补充 并查集/Floyd/优先队列/拓扑排序/倍增LCA/树的直径/树上差分/数论进阶/离散化ST表/差分约束
 *   - L9：新建「CSP-S 竞赛基础」级别（完整12个主题）
 *   - L10：新建「NOI 竞赛提高」级别（完整10个主题）
 *
 * 特点：仅补充缺少的 topic，已存在同名 topic 不重复添加。
 * 章节设 2~3 个骨架章，title 有意义，content 为空，待后续填充。
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

// ──────────────────────────────────────────────
// 数据定义：每个 topic 包含 title + chapters[]
// ──────────────────────────────────────────────

/** 生成骨架章节列表（占位用） */
function ch(titles) {
  return titles.map(t => ({
    id: '_placeholder_',   // 运行时会重新计算
    title: t,
    content: '',
    contentType: 'markdown',
    problemIds: [],
    optionalProblemIds: [],
    optional: false
  }));
}

const SUPPLEMENT = {
  // ── L5 补充 ──────────────────────────────────
  5: [
    {
      title: 'STL 容器',
      description: 'vector、set、map、pair、priority_queue 等常用 STL 容器的用法与应用',
      chapters: ch([
        'vector 与 pair 基础用法',
        'set / map 的遍历与查找',
        'priority_queue 优先队列'
      ])
    },
    {
      title: '链表',
      description: '单链表、双链表、循环链表的构造与基本操作',
      chapters: ch([
        '单链表基础（数组模拟）',
        '双链表与循环链表',
        '链表综合例题'
      ])
    },
    {
      title: '双指针',
      description: '同向双指针（滑动窗口）与相向双指针的技巧与经典题型',
      chapters: ch([
        '相向双指针',
        '同向双指针（滑动窗口）',
        '双指针综合例题'
      ])
    },
    {
      title: '三分法',
      description: '针对单峰/单谷函数求极值的三分查找',
      chapters: ch([
        '整数三分',
        '实数三分与精度控制'
      ])
    },
    {
      title: '分治算法',
      description: '分治思想、归并排序原理与经典分治例题',
      chapters: ch([
        '分治思想与归并排序',
        '逆序对统计',
        '经典分治例题'
      ])
    }
  ],

  // ── L6 补充 ──────────────────────────────────
  6: [
    {
      title: '栈',
      description: 'LIFO 结构、括号匹配、单调栈入门、表达式求值基础',
      chapters: ch([
        '栈的基本用法',
        '括号匹配与合法性判断',
        '栈的应用例题'
      ])
    },
    {
      title: '队列',
      description: 'FIFO 结构、循环队列、双端队列 deque 的使用',
      chapters: ch([
        '队列基本用法',
        '双端队列 deque',
        '队列的应用例题'
      ])
    },
    {
      title: '哈夫曼树',
      description: '哈夫曼编码、最优二叉树的贪心构造与带权路径长度',
      chapters: ch([
        '哈夫曼树的构造',
        '哈夫曼编码与解码',
        '带权路径长度练习'
      ])
    },
    {
      title: 'DFS 深度优先搜索',
      description: '系统学习 DFS 框架、连通块、路径枚举与剪枝',
      chapters: ch([
        'DFS 基本框架',
        '连通块与涂色问题',
        '路径枚举与剪枝'
      ])
    },
    {
      title: 'BFS 广度优先搜索',
      description: 'BFS 层序遍历、最短步数、迷宫最短路等经典题型',
      chapters: ch([
        'BFS 基本框架',
        '迷宫最短路',
        '多源 BFS 与 0-1 BFS'
      ])
    },
    {
      title: '线性 DP',
      description: '一维 DP、最长递增子序列 LIS、最长公共子序列 LCS',
      chapters: ch([
        '线性 DP 基础与状态设计',
        '最长递增子序列 LIS',
        '最长公共子序列 LCS'
      ])
    },
    {
      title: '背包 DP',
      description: '0-1 背包、完全背包、多重背包及其变种',
      chapters: ch([
        '0-1 背包',
        '完全背包',
        '多重背包与混合背包'
      ])
    }
  ],

  // ── L7 补充 ──────────────────────────────────
  7: [
    {
      title: '快速幂',
      description: '快速幂算法（整数/矩阵）、取模运算与幂运算应用',
      chapters: ch([
        '快速幂基础',
        '矩阵快速幂入门',
        '快速幂应用例题'
      ])
    },
    {
      title: '哈希',
      description: '哈希表原理、字符串哈希（多项式哈希）与应用',
      chapters: ch([
        '哈希表与冲突处理',
        '字符串哈希（多项式哈希）',
        '哈希应用例题'
      ])
    },
    {
      title: '表达式求值',
      description: '栈模拟中缀/后缀表达式、运算符优先级处理',
      chapters: ch([
        '后缀（逆波兰）表达式计算',
        '中缀表达式转后缀',
        '带括号的表达式求值'
      ])
    },
    {
      title: 'DFS 进阶',
      description: '回溯与剪枝优化、全排列/子集生成、搜索顺序优化',
      chapters: ch([
        '全排列与回溯',
        '子集生成与组合枚举',
        '剪枝技巧与优化'
      ])
    },
    {
      title: 'BFS 进阶',
      description: '多源 BFS、双向 BFS、A* 启发式搜索思想',
      chapters: ch([
        '多源 BFS 与泛洪算法',
        '双向 BFS',
        'A* 思想入门'
      ])
    },
    {
      title: '区间 DP',
      description: '区间动态规划经典模型：矩阵链乘、石子归并、括号合并',
      chapters: ch([
        '区间 DP 基本框架',
        '石子归并问题',
        '括号合并与字符串区间DP'
      ])
    },
    {
      title: '树上 DP',
      description: '树形动态规划、以某节点为根的状态转移',
      chapters: ch([
        '树形 DP 基础框架',
        '树上独立集与点覆盖',
        '树上路径与直径DP'
      ])
    },
    {
      title: '二维 DP',
      description: '二维状态的动态规划、方格路径类、编辑距离等',
      chapters: ch([
        '二维 DP 基础（方格路径）',
        '编辑距离',
        '二维 DP 综合例题'
      ])
    }
  ],

  // ── L8 补充 ──────────────────────────────────
  8: [
    {
      title: '并查集',
      description: '路径压缩与按秩合并的并查集，及带权、扩展并查集',
      chapters: ch([
        '并查集基础（路径压缩）',
        '带权并查集',
        '扩展并查集与应用'
      ])
    },
    {
      title: '优先队列与堆',
      description: '堆的原理、STL priority_queue 的使用与贪心中的应用',
      chapters: ch([
        '二叉堆与优先队列',
        '堆优化 Dijkstra',
        '优先队列贪心例题'
      ])
    },
    {
      title: '拓扑排序',
      description: 'DAG 有向无环图的拓扑排序与依赖关系建模',
      chapters: ch([
        '拓扑排序 BFS 实现',
        '拓扑排序判环',
        '拓扑排序上的 DP'
      ])
    },
    {
      title: 'Floyd 全源最短路',
      description: 'Floyd-Warshall 全源最短路算法与传递闭包',
      chapters: ch([
        'Floyd 算法原理',
        '传递闭包',
        'Floyd 综合例题'
      ])
    },
    {
      title: '倍增与 LCA',
      description: '倍增法、最近公共祖先（LCA）与树上路径查询',
      chapters: ch([
        '倍增法基础',
        '最近公共祖先（LCA）',
        'LCA 的应用：树上路径距离'
      ])
    },
    {
      title: '树的直径与重心',
      description: '两次 DFS 求树的直径、树的重心及其应用',
      chapters: ch([
        '树的直径（两次 DFS）',
        '树的重心',
        '直径与重心综合例题'
      ])
    },
    {
      title: '树上差分',
      description: '树上路径差分（点差分与边差分）',
      chapters: ch([
        '树上点差分',
        '树上边差分',
        '树上差分综合例题'
      ])
    },
    {
      title: '数论进阶',
      description: '欧拉函数、逆元（费马小定理/线性逆元）、容斥原理',
      chapters: ch([
        '欧拉函数与欧拉定理',
        '乘法逆元（费马小定理 & 线性逆元）',
        '容斥原理'
      ])
    },
    {
      title: '离散化与 ST 表',
      description: '坐标压缩（离散化）与 ST 表静态 RMQ',
      chapters: ch([
        '离散化（坐标压缩）',
        'ST 表与稀疏表',
        'RMQ 综合例题'
      ])
    },
    {
      title: '差分约束',
      description: '差分约束系统建图与 SPFA 求解',
      chapters: ch([
        '差分约束系统原理',
        'SPFA 判负环',
        '差分约束综合例题'
      ])
    }
  ]
};

// ── L9 全新结构 ──────────────────────────────────
const LEVEL_9 = {
  level: 9,
  group: GROUP_CPP,
  subject: 'C++',
  title: 'GESP 九级 (CSP-S 竞赛基础)',
  description: '对应 CSP-S/NOIP 提高级水平，系统学习字符串、树结构与图论高级算法、DP 优化、高级数据结构等。',
  topics: [
    {
      title: '字符串算法',
      description: 'KMP、Z函数（扩展KMP）、Trie 字典树、AC 自动机、Manacher 回文算法',
      chapters: ch([
        'KMP 字符串匹配',
        'Z 函数（扩展 KMP）',
        'Trie 字典树',
        'AC 自动机（多模式串匹配）',
        'Manacher 回文算法'
      ])
    },
    {
      title: '搜索进阶与贪心',
      description: '迭代加深搜索 IDA*、反悔贪心、随机化算法',
      chapters: ch([
        '迭代加深搜索（IDA*）',
        '反悔贪心与可撤销决策',
        '随机化算法入门'
      ])
    },
    {
      title: '数论进阶',
      description: '数论分块（整除分块）、扩展 GCD、BSGS、中国剩余定理（CRT）、Lucas 定理',
      chapters: ch([
        '数论分块（整除分块）',
        '扩展 GCD 与裴蜀定理',
        'BSGS 大步小步算法',
        '中国剩余定理（CRT）',
        'Lucas 定理与大组合数取模'
      ])
    },
    {
      title: 'DP 进阶 · 状压与数位',
      description: '状压 DP（集合状态压缩）、数位 DP（按位枚举限制上界）',
      chapters: ch([
        '状压 DP 基础',
        '状压 DP 经典：TSP / 最小覆盖',
        '数位 DP 基础（不含前导零处理）',
        '数位 DP 进阶（前导零 & 限高位）'
      ])
    },
    {
      title: 'DP 进阶 · 概率期望与换根',
      description: '概率 DP、期望 DP（逆推期望）、换根 DP（两次 DFS）、计数 DP、树上背包',
      chapters: ch([
        '概率 DP 基础',
        '期望 DP（逆推期望步数）',
        '换根 DP（全树最优根）',
        '计数 DP 基础',
        '树上背包 DP'
      ])
    },
    {
      title: 'DP 优化',
      description: '单调队列优化 DP（滑动窗口维护最值）、斜率优化 DP（CHT 凸包）',
      chapters: ch([
        '单调队列优化 DP',
        '斜率优化 DP（CHT 凸包）',
        'Li Chao 线段树'
      ])
    },
    {
      title: '线性数据结构',
      description: '单调栈、单调队列、线性基（异或线性基）、树状数组（BIT）',
      chapters: ch([
        '单调栈（下一个更大/更小元素）',
        '单调队列（滑动窗口最值）',
        '异或线性基',
        '树状数组（BIT）单点修改与区间查询',
        '树状数组进阶（差分树状数组）'
      ])
    },
    {
      title: '线段树',
      description: '线段树区间修改（懒标记）、区间查询的完整实现',
      chapters: ch([
        '线段树基础（单点修改）',
        '线段树区间修改（懒标记 pushdown）',
        '线段树综合例题'
      ])
    },
    {
      title: '高级分治与根号算法',
      description: '树链剖分、分块（根号分治）、莫队算法、CDQ 分治、整体二分',
      chapters: ch([
        '树链剖分（重链剖分）',
        '分块（根号分治）',
        '普通莫队',
        'CDQ 分治（离线三维偏序）',
        '整体二分'
      ])
    },
    {
      title: '图论进阶',
      description: 'Tarjan 强连通分量/缩点、双连通分量/割点割边、欧拉路、2-SAT',
      chapters: ch([
        'Tarjan 强连通分量（SCC）与缩点',
        '双连通分量、割点与桥',
        '欧拉路与欧拉回路',
        '2-SAT 布尔可满足'
      ])
    },
    {
      title: '网络流与二分图',
      description: '二分图匹配（匈牙利/Hopcroft-Karp）、最大流（Dinic）、最小割',
      chapters: ch([
        '二分图判断与匈牙利算法',
        'Dinic 最大流算法',
        '最小割与最大流最小割定理',
        '网络流建模例题'
      ])
    },
    {
      title: '数学进阶',
      description: '矩阵快速幂加速线性递推、高斯消元、博弈论（Nim/SG函数）、计算几何基础',
      chapters: ch([
        '矩阵快速幂加速线性递推',
        '高斯消元法',
        'Nim 游戏与 SG 函数',
        '计算几何：点积叉积与凸包'
      ])
    }
  ]
};

// ── L10 全新结构 ──────────────────────────────────
const LEVEL_10 = {
  level: 10,
  group: GROUP_CPP,
  subject: 'C++',
  title: 'GESP 十级 (NOI 竞赛提高)',
  description: '对应 NOI/IOI 水平，包含高级字符串、可持久化数据结构、LCT、点分治、多项式算法、高级数论与组合数学等。',
  topics: [
    {
      title: '字符串高级',
      description: '后缀数组（SA+LCP）、后缀自动机（SAM）、广义后缀自动机',
      chapters: ch([
        '后缀数组（SA）的构造与 LCP 数组',
        '后缀自动机（SAM）',
        '广义 SAM（多串共用）',
        '字符串高级综合例题'
      ])
    },
    {
      title: '可持久化数据结构',
      description: '可持久化线段树（主席树）、可持久化并查集',
      chapters: ch([
        '主席树（可持久化线段树）原理',
        '主席树区间第 k 小',
        '可持久化并查集',
        '可持久化数据结构综合例题'
      ])
    },
    {
      title: '高级数据结构',
      description: '可合并堆（左偏树/斜堆）、线段树合并与分裂、树套树',
      chapters: ch([
        '左偏树（可合并堆）',
        '线段树合并（动态开点）',
        '线段树分裂',
        '树套树（线段树套线段树）'
      ])
    },
    {
      title: 'LCT 动态树',
      description: 'Link-Cut Tree：支持链路切割、动态树上路径维护',
      chapters: ch([
        'LCT 基本原理与 Access/makeRoot',
        'LCT 实现链接/断开',
        'LCT 综合例题'
      ])
    },
    {
      title: '树上高级算法',
      description: '点分治、树上启发式合并（DSU on Tree）、虚树、KD树',
      chapters: ch([
        '点分治（树上路径统计）',
        '树上启发式合并（DSU on Tree）',
        '虚树（关键点构造）',
        'KD 树（多维最近邻）'
      ])
    },
    {
      title: 'DP 极限优化',
      description: '四边形不等式优化 DP（决策单调性）、WQS 二分（凸优化）',
      chapters: ch([
        '四边形不等式优化（决策单调性）',
        'WQS 二分（λ 优化 DP）',
        '综合例题'
      ])
    },
    {
      title: '多项式算法',
      description: 'FFT 快速傅里叶变换、NTT 快速数论变换及多项式基本操作',
      chapters: ch([
        'FFT 原理与实现',
        'NTT（模意义下的 FFT）',
        '多项式乘法与卷积应用',
        '多项式求逆与 exp（选读）'
      ])
    },
    {
      title: '高级数论',
      description: '莫比乌斯反演、狄利克雷卷积、积性函数、原根',
      chapters: ch([
        '积性函数与狄利克雷卷积',
        '莫比乌斯函数与莫比乌斯反演',
        '原根与离散对数',
        '高级数论综合例题'
      ])
    },
    {
      title: '高级组合数学',
      description: '斯特林数、母函数（EGF/OGF）、Burnside 引理与 Polya 定理',
      chapters: ch([
        '第一/第二类斯特林数',
        '普通母函数（OGF）',
        '指数母函数（EGF）',
        'Burnside 引理与 Polya 定理'
      ])
    },
    {
      title: '计算几何高级',
      description: '半平面交、旋转卡壳、闵可夫斯基和',
      chapters: ch([
        '半平面交求可行区域',
        '旋转卡壳（最远点对）',
        '闵可夫斯基和'
      ])
    }
  ]
};

// ──────────────────────────────────────────────
// 帮助函数
// ──────────────────────────────────────────────

/** 重新计算 topic 里每个章节的 id，确保唯一不冲突 */
function recomputeIds(levelNum, topicIndex, chapters) {
  const prefix = `${levelNum}-${topicIndex + 1}`;
  chapters.forEach((ch, idx) => {
    ch.id = `${prefix}-${idx + 1}`;
  });
}

/** 向 level 的 topics 追加缺失的 topic（按 title 判重） */
async function appendMissingTopics(levelDoc, newTopics) {
  const existingTitles = new Set(levelDoc.topics.map(t => t.title));
  let added = 0;
  for (const t of newTopics) {
    if (existingTitles.has(t.title)) {
      console.log(`  [SKIP] L${levelDoc.level} topic 已存在: "${t.title}"`);
      continue;
    }
    const topicIndex = levelDoc.topics.length;  // 追加到末尾
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

// ──────────────────────────────────────────────
// 主逻辑
// ──────────────────────────────────────────────

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ 已连接 MongoDB\n');

  let totalTopicAdded = 0;

  // ── 补充 L5 / L6 / L7 / L8 ──
  for (const [levelNum, newTopics] of Object.entries(SUPPLEMENT)) {
    const lvl = parseInt(levelNum);
    const doc = await CourseLevel.findOne({ level: lvl, group: GROUP_CPP });
    if (!doc) {
      console.warn(`⚠️  未找到 ${GROUP_CPP} Level ${lvl}，跳过`);
      continue;
    }
    console.log(`\n── 处理 L${lvl}: ${doc.title} ──`);
    totalTopicAdded += await appendMissingTopics(doc, newTopics);
  }

  // ── 新建或补充 L9 ──
  console.log('\n── 处理 L9 ──');
  let doc9 = await CourseLevel.findOne({ level: 9, group: GROUP_CPP });
  if (!doc9) {
    // 先创建骨架，再填充 topics
    doc9 = new CourseLevel({
      level: LEVEL_9.level,
      group: LEVEL_9.group,
      subject: LEVEL_9.subject,
      title: LEVEL_9.title,
      description: LEVEL_9.description,
      topics: [],
      chapters: []
    });
    await doc9.save();
    console.log(`  [CREATE] 已创建 L9: ${LEVEL_9.title}`);
  } else {
    console.log(`  [EXIST]  L9 已存在: ${doc9.title}`);
  }
  totalTopicAdded += await appendMissingTopics(doc9, LEVEL_9.topics);

  // ── 新建或补充 L10 ──
  console.log('\n── 处理 L10 ──');
  let doc10 = await CourseLevel.findOne({ level: 10, group: GROUP_CPP });
  if (!doc10) {
    doc10 = new CourseLevel({
      level: LEVEL_10.level,
      group: LEVEL_10.group,
      subject: LEVEL_10.subject,
      title: LEVEL_10.title,
      description: LEVEL_10.description,
      topics: [],
      chapters: []
    });
    await doc10.save();
    console.log(`  [CREATE] 已创建 L10: ${LEVEL_10.title}`);
  } else {
    console.log(`  [EXIST]  L10 已存在: ${doc10.title}`);
  }
  totalTopicAdded += await appendMissingTopics(doc10, LEVEL_10.topics);

  // ── 汇总 ──
  console.log(`\n✅ 完成！本次新增 ${totalTopicAdded} 个 topic。`);
  await mongoose.disconnect();
}

main().catch(e => {
  console.error('❌ 出错：', e.message);
  process.exit(1);
});
