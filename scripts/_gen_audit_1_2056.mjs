import fs from "fs";

function getTopic(chapterId) {
  const topics = {
    "cpp-1": {1:"I/O与变量",2:"运算符",3:"数据类型",4:"条件结构",5:"循环结构",6:"检测"},
    "cpp-2": {1:"循环进阶",2:"数学函数",3:"ASCII与字符",4:"模拟",5:"枚举",6:"一维数组"},
    "cpp-3": {1:"数组基础",2:"字符串",3:"进制转换",4:"位运算",5:"枚举进阶",6:"模拟进阶"},
    "cpp-4": {1:"函数",2:"二维数组",3:"结构体",4:"指针",5:"复杂度",6:"排序",7:"递推"},
    "cpp-5": {1:"思维训练",2:"STL容器",3:"数学基础",4:"高精度",5:"前缀和差分",6:"二分法",7:"三分法",8:"贪心",9:"双指针",10:"递归",11:"分治"},
    "cpp-6": {1:"栈",2:"队列",3:"链表",4:"堆",5:"树结构",6:"哈夫曼树",7:"图论基础",8:"BFS",9:"DFS",10:"基础DP",11:"背包DP"},
    "cpp-7": {1:"DFS进阶",2:"BFS进阶",3:"矩阵快速幂",4:"倍增LCA",5:"离散化ST表",6:"字符串算法",7:"表达式求值",8:"单调栈队列",9:"区间DP",10:"树上DP",11:"二维DP"},
    "cpp-8": {1:"数论进阶",2:"并查集",3:"优先队列/堆",4:"Floyd",5:"最短路径",6:"最小生成树",7:"拓扑排序",8:"树直径/重心",9:"树上差分",10:"树状数组",11:"线段树",12:"差分约束"},
    "cpp-9": {1:"字符串算法",2:"搜索进阶贪心",3:"数论进阶",4:"状压/数位DP",5:"概率期望换根DP",6:"DP优化",7:"分治根号",8:"图论进阶",9:"网络流二分图",10:"数学进阶",11:"线段树进阶"},
    "cpp-10": {1:"NOI综合",2:"NOI综合",3:"NOI综合",4:"NOI综合",5:"NOI综合"},
  };
  const m = chapterId.match(/^cpp-(\d+)-(\d+)-(\d+)$/);
  if (!m) return "?";
  const [,l,t] = m;
  return "L"+l+" "+(topics["cpp-"+l]?.[parseInt(t)] || "?");
}

function abcLetter(title) {
  const m = title.match(/\[?ABC\d+([A-G])\]?/);
  return m ? m[1] : null;
}

const corrections = {
  "atcoder:727":  { from:"cpp-6-7-2", to:"cpp-3-1-3", reason:"B题，统计所有节点的度，度为N-1的节点存在即为星形树，无需图论概念" },
  "atcoder:957":  { from:"cpp-3-1-3", to:"cpp-5-1-1", reason:"G题，连续互换段分析：头部被推入新段尾、尾部留原段头，思维题找规律，非数组遍历" },
  "atcoder:997":  { from:"cpp-2-5-2", to:"cpp-4-2-2", reason:"G题，输入为N×N邻接矩阵，N≤10三重枚举，需二维数组读取，L2枚举不够" },
  "atcoder:1429": { from:"cpp-5-2-3", to:"cpp-1-4-1", reason:"A题，10名选手固定映射，if-else链即可，不需要STL map" },
  "atcoder:1437": { from:"cpp-9-1-5", to:"cpp-3-2-6", reason:"B题，最长回文子串N≤1000，O(N²)中心扩展即可，不需要Manacher算法" },
  "atcoder:1645": { from:"cpp-3-6-3", to:"cpp-8-2-3", reason:"G题，回文约束传播需并查集合并对称位置并检测冲突，L3模拟远不够" },
  "atcoder:1780": { from:"cpp-6-10-2", to:"cpp-2-4-2", reason:"B题，左右手分别独立跟踪当前位置，纯模拟累加|y-x|，不需要DP" },
  "atcoder:1899": { from:"cpp-6-10-2", to:"cpp-2-4-2", reason:"B题，贪心扫描字符串合并连续00，纯模拟，不需要DP" },
};

const results = [];
for (let i = 1; i <= 65; i++) {
  const f = "changelogs/atcoder-classify-batch-" + String(i).padStart(4,"0") + ".json";
  if (!fs.existsSync(f)) continue;
  const data = JSON.parse(fs.readFileSync(f, "utf8"));
  for (const a of data.assignments) {
    const pid = a.pid;
    const finalChapterId = corrections[pid] ? corrections[pid].to : a.chapterId;
    const topic = getTopic(finalChapterId);
    const letter = abcLetter(a.title);
    const verdict = corrections[pid] ? "corrected" : "ok";
    const note = corrections[pid] ? corrections[pid].reason : (a.reason || "");
    results.push({ batch: String(i).padStart(4,"0"), pid, title: a.title, originalChapterId: a.chapterId, finalChapterId, topic, abcLetter: letter, verdict, note });
  }
}

const summary = {
  generated: "2026-05-03",
  range: "atcoder:1-2056 (batch-0001 ~ batch-0065)",
  total: results.length,
  corrected: results.filter(r=>r.verdict==="corrected").length,
  ok: results.filter(r=>r.verdict==="ok").length,
  corrections_made: Object.entries(corrections).map(([pid,c])=>({pid, from:c.from, to:c.to, reason:c.reason})),
  problems: results,
};

fs.writeFileSync("changelogs/atcoder-chapter-audit-1-2056.json", JSON.stringify(summary, null, 2), "utf8");
console.log("Written: changelogs/atcoder-chapter-audit-1-2056.json");
console.log("Total:", results.length, "| Corrected:", summary.corrected, "| OK:", summary.ok);
