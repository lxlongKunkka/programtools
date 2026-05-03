/**
 * Phase 1: Contradiction detection
 * Checks if `reason` and `chapterName` are inconsistent.
 *
 * Rules:
 * A. Chapter is about X, but reason says "不需要/无需/不用 X"
 * B. Reason says simple concept (纯模拟/纯if-else…), but chapter is L6+
 * C. Reason explicitly says "需要X", but chapter is not about X
 */
import fs from 'fs';

const data   = JSON.parse(fs.readFileSync('changelogs/atcoder-reasons-all.json', 'utf8'));

function chapterId2Level(id) { return parseInt(id.match(/^cpp-(\d+)/)?.[1] ?? 0); }

// Return true if `text` contains `kw` NOT preceded by a negation word
function isPositive(text, kw) {
  const idx = text.indexOf(kw);
  if (idx < 0) return false;
  const pre = text.slice(Math.max(0, idx - 5), idx);
  return !/不需要|无需|不用|不必/.test(pre);
}

// Return true if `text` says "not needed" for `kw`
function isNegated(text, kw) {
  const idx = text.indexOf(kw);
  if (idx < 0) return false;
  const pre = text.slice(Math.max(0, idx - 5), idx);
  return /不需要|无需|不用|不必/.test(pre);
}

// -----------------------------------------------------------------------
// Rule A: chapter is about X but reason says not needed
// Each entry: { chapterKeywords, reasonKeywords }
// -----------------------------------------------------------------------
const ruleA = [
  {
    label: 'DP/动态规划',
    chapterKw: ['DP', '动态规划', '背包', '记忆化'],
    reasonKw: ['DP', '动态规划', '背包'],
  },
  {
    label: '图论/BFS/DFS',
    chapterKw: ['图论', 'BFS', 'DFS', '搜索', '广度', '深度', '最短路', '最小生成'],
    reasonKw: ['图论', 'BFS', 'DFS', '搜索', '最短路'],
  },
  {
    label: '排序',
    chapterKw: ['排序'],
    reasonKw: ['排序'],
  },
  {
    label: '并查集',
    chapterKw: ['并查集'],
    reasonKw: ['并查集'],
  },
  {
    label: '线段树',
    chapterKw: ['线段树'],
    reasonKw: ['线段树'],
  },
  {
    label: '树状数组',
    chapterKw: ['树状数组'],
    reasonKw: ['树状数组'],
  },
  {
    label: 'Manacher/马拉车',
    chapterKw: ['Manacher', '马拉车', '回文'],
    reasonKw: ['Manacher', '马拉车'],
  },
  {
    label: '二分',
    chapterKw: ['二分'],
    reasonKw: ['二分'],
  },
  {
    label: '贪心',
    chapterKw: ['贪心'],
    reasonKw: ['贪心'],
  },
  {
    label: '前缀和',
    chapterKw: ['前缀和'],
    reasonKw: ['前缀和'],
  },
  {
    label: 'STL/map/set',
    chapterKw: ['STL', 'map', 'set', '容器'],
    reasonKw: ['STL', 'map', 'set'],
  },
  {
    label: '栈',
    chapterKw: ['栈'],
    reasonKw: ['栈'],
  },
  {
    label: '队列',
    chapterKw: ['队列'],
    reasonKw: ['队列'],
  },
];

// -----------------------------------------------------------------------
// Rule C: reason positively says "需要X" but chapter prefix is wrong
// -----------------------------------------------------------------------
const ruleC = [
  { reasonKw: ['需要并查集'],   goodPrefixes: ['cpp-8-2'] },
  { reasonKw: ['需要线段树'],   goodPrefixes: ['cpp-8-11', 'cpp-9-11'] },
  { reasonKw: ['需要树状数组'], goodPrefixes: ['cpp-8-10'] },
  { reasonKw: ['需要Manacher', '需要马拉车'], goodPrefixes: ['cpp-9-1'] },
  { reasonKw: ['需要二维数组'], goodPrefixes: ['cpp-4-2'] },
  { reasonKw: ['需要前缀和'],   goodPrefixes: ['cpp-5-5'] },
  { reasonKw: ['需要二分'],     goodPrefixes: ['cpp-5-6', 'cpp-5-7'] },
];

const suspects = [];

for (const p of data.problems) {
  const { pid, chapterId, chapterTopic, chapterName, title, reason } = p;
  const lv = chapterId2Level(chapterId);
  const cn = chapterName + ' ' + chapterTopic;
  const issues = [];

  // --- Rule A ---
  for (const rule of ruleA) {
    const chapterHasIt = rule.chapterKw.some(k => cn.includes(k));
    if (!chapterHasIt) continue;
    const reasonNegatesIt = rule.reasonKw.some(k => isNegated(reason, k));
    if (reasonNegatesIt) {
      issues.push(`[A] 章节"${chapterTopic} > ${chapterName}"涉及${rule.label}，但reason说不需要`);
    }
  }

  // --- Rule B: simple reason in advanced chapter ---
  const simpleMatch = reason.match(/纯模拟|纯枚举|纯条件|纯if|纯判断|直接输出|一行公式|if-else链/);
  if (simpleMatch && lv >= 6) {
    // Don't flag if chapter IS about simulation/enumeration
    if (!cn.includes('模拟') && !cn.includes('枚举')) {
      issues.push(`[B] reason含"${simpleMatch[0]}"（简单题特征），但章节是L${lv}"${chapterTopic} > ${chapterName}"`);
    }
  }

  // --- Rule C ---
  for (const rule of ruleC) {
    const mentioned = rule.reasonKw.some(k => reason.includes(k));
    if (!mentioned) continue;
    const inGoodChapter = rule.goodPrefixes.some(pre => chapterId.startsWith(pre));
    if (!inGoodChapter) {
      issues.push(`[C] reason说"${rule.reasonKw[0]}"，但章节是${chapterId}("${chapterTopic} > ${chapterName}")`);
    }
  }

  if (issues.length > 0) {
    suspects.push({ pid, chapterId, chapterTopic, chapterName, title, reason, issues });
  }
}

suspects.sort((a, b) => parseInt(a.pid.split(':')[1]) - parseInt(b.pid.split(':')[1]));

const out = { total: suspects.length, items: suspects };
fs.writeFileSync('changelogs/atcoder-contradictions.json', JSON.stringify(out, null, 2), 'utf8');
console.log(`Found ${suspects.length} suspects / 2217 total`);
console.log('Written: changelogs/atcoder-contradictions.json');

// Summary by rule type
const byRule = { A: 0, B: 0, C: 0 };
for (const s of suspects) {
  for (const iss of s.issues) {
    const m = iss.match(/^\[([ABC])\]/);
    if (m) byRule[m[1]]++;
  }
}
console.log('Rule A (章节说X但reason否定X):', byRule.A);
console.log('Rule B (简单特征在高级章节)  :', byRule.B);
console.log('Rule C (reason说需要X但章节错):', byRule.C);
