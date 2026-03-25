export const KNOWLEDGE_TAG_GROUPS = {
  gesp1: ['顺序结构', '条件结构', '循环结构', '数学基础'],
  gesp2: ['循环嵌套', '暴力枚举', '模拟', '数学函数'],
  gesp3: ['位运算', '进制转换', '一维数组', '字符串'],
  gesp4: ['函数', '结构体', '二维数组', '递推', '排序', '算法复杂度'],
  gesp5: ['数论基础', '素数筛', '质因数分解', '高精度', '链表', '前缀和', '差分', '二分', '三分', '贪心', '分治', '递归', 'STL'],
  gesp6: ['栈', '队列', '树形结构', 'DFS', 'BFS', 'DP', '线性DP', '背包DP'],
  gesp7: ['哈希', '图论基础', 'DFS进阶', 'BFS进阶', '双指针', '区间DP', '树上DP', '二维DP'],
  gesp8: ['组合数学', '倍增', 'LCA', '树的直径', '最小生成树', '单源最短路径', 'floyd', '并查集', '优先队列', '拓扑排序', '树的重心', '树上差分', '容斥原理', '离散化', 'ST表', '差分约束'],
  gesp9: ['KMP', 'Z函数', '字典树', 'AC自动机', '回文串', '构造', '反悔贪心', '环', '扫描线', '搜索进阶', '次短路', '状压DP', '数位DP', '概率DP', '期望DP', '换根DP', '计数DP', '单调队列优化DP', '斜率优化DP', '树上背包DP', '单调栈', '单调队列', '线性基', '树状数组', '线段树', '笛卡尔树', '平衡树', '树链剖分', '分块', '莫队', '离线算法', '强连通分量', '双连通分量', '欧拉路', '2-SAT', '二分图', '网络流', 'CDQ分治', '整体二分', '博弈论', '矩阵快速幂', '高斯消元', '计算几何', '概率论基础', '卡特兰数', '扩展GCD', '中国剩余定理'],
  gesp10: ['后缀数组', '后缀自动机', '四边形不等式优化DP', 'WQS二分', '可合并堆', '可持久化数据结构', '块状链表', '点分治', '树上启发式合并', '虚树', '费用流', '半平面交', '原根', '狄利克雷卷积', '莫比乌斯反演', 'FFT', 'NTT', '斯特林数', '母函数', 'Burnside引理']
}

export const LEVEL_TAGS = Object.keys(KNOWLEDGE_TAG_GROUPS)
export const KNOWLEDGE_TAGS = [...new Set(Object.values(KNOWLEDGE_TAG_GROUPS).flat())]
export const KNOWLEDGE_TAG_SET = new Set(KNOWLEDGE_TAGS)
export const KNOWLEDGE_TAG_ALIASES = new Map([
  ['广度优先搜索', 'BFS'],
  ['宽度优先搜索', 'BFS'],
  ['广搜', 'BFS'],
  ['breadth-first search', 'BFS'],
  ['深度优先搜索', 'DFS'],
  ['深搜', 'DFS'],
  ['depth-first search', 'DFS'],
  ['动态规划', 'DP'],
  ['线性动态规划', '线性DP'],
  ['线性 dp', '线性DP'],
  ['背包动态规划', '背包DP'],
  ['背包 dp', '背包DP'],
  ['0-1 bfs', 'BFS进阶'],
  ['多源bfs', 'BFS进阶'],
  ['多源 bfs', 'BFS进阶'],
  ['双向bfs', 'BFS进阶'],
  ['双向 bfs', 'BFS进阶'],
  ['0-1 dp', 'DP']
])

export function normalizeQuizKnowledgeTags(tags = []) {
  const values = Array.isArray(tags) ? tags : [tags]
  const normalized = []

  for (const value of values) {
    const text = String(value || '').trim()
    if (!text) continue

    if (KNOWLEDGE_TAG_SET.has(text) && !normalized.includes(text)) {
      normalized.push(text)
      continue
    }

    const aliasMatch = KNOWLEDGE_TAG_ALIASES.get(text)
    if (aliasMatch && !normalized.includes(aliasMatch)) {
      normalized.push(aliasMatch)
    }
  }

  return normalized
}

export function extractQuizKnowledgeTagsFromText(...parts) {
  const combined = parts
    .flat()
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join('\n')

  if (!combined) return []

  const normalized = []
  const lowerText = combined.toLowerCase()

  for (const tag of KNOWLEDGE_TAGS) {
    if (combined.includes(tag) && !normalized.includes(tag)) {
      normalized.push(tag)
    }
  }

  for (const [alias, tag] of KNOWLEDGE_TAG_ALIASES.entries()) {
    const matched = /[A-Za-z]/.test(alias)
      ? lowerText.includes(alias.toLowerCase())
      : combined.includes(alias)
    if (matched && !normalized.includes(tag)) {
      normalized.push(tag)
    }
  }

  return normalized
}

export function buildQuizKnowledgeTaggingPrompt({
  levelTag = '',
  sourceTitle = '',
  type = '',
  text = ''
} = {}) {
  const scopedTags = KNOWLEDGE_TAG_GROUPS[levelTag] || KNOWLEDGE_TAGS
  const scopeLine = levelTag && KNOWLEDGE_TAG_GROUPS[levelTag]
    ? `题目当前已知级别为 ${levelTag}，优先从这一等级对应的知识点中选择。若题目明显跨级，也可以从完整候选列表中选更准确的标签。`
    : '题目级别未知，请直接从完整候选列表中选最准确的知识点标签。'

  return `你是算法客观题知识点标注专家。请阅读下面这道题，只输出 1 到 3 个最准确的知识点标签。

严格规则：
1. 标签必须从给定列表中原文选取，禁止自造标签。
2. 只输出 JSON，不要输出解释、Markdown 或多余文字。
3. 如果题目是基础语法/流程控制，优先标注基础类标签；如果题目涉及算法，优先标注核心算法标签。
4. 不要输出级别标签，只输出知识点标签。

${scopeLine}

当前优先候选：${scopedTags.join('、')}
完整候选：${KNOWLEDGE_TAGS.join('、')}

输出格式：
{"tags":["排序","模拟"]}

题目来源：${sourceTitle || '未知'}
题型：${type || '未知'}
题面：
${String(text || '').slice(0, 2400)}`
}

export function parseQuizKnowledgeTaggingResult(content) {
  const text = String(content || '').trim()
  if (!text) return []

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      return normalizeQuizKnowledgeTags(parsed?.tags || [])
    } catch {
      // Fall through to keyword extraction.
    }
  }

  return extractQuizKnowledgeTagsFromText(text)
}