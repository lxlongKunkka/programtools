// 通用空章节候选搜索：根据 (chapterId, 标题正则, 排除标签) 在 hydro 找题
// 用法：node scripts/recommend_empty_chapters.mjs --level=7
//
// 配置在脚本顶部 LEVEL_CONFIG。每个 chapter 给一个 keywords 数组（OR 关系，匹配 tag 或 title）
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const LEVEL_CONFIG = {
  4: {
    domains: ['Level1','Level2','Level3','Level4','gesp2','gesp3','gesp4','atcoder'],
    chapters: {
      // 指针/复杂度题库无 tag — 略，留讲义型
    }
  },
  5: {
    domains: ['Level2','Level3','Level4','Level5','gesp4','gesp5','atcoder'],
    chapters: {
      'cpp-5-1-1': { kw: [/思维/, /构造/], titleKw: [/思维/, /构造/], note: '思维训练' },
      'cpp-5-4-1': { kw: [/高精度.*加|高精.*加|大数加法/i], titleKw: [/高精|大数/, /加/], note: '高精度加法' },
      'cpp-5-4-2': { kw: [/高精度.*减|高精.*减|大数减法/i], titleKw: [/高精|大数/, /减/], note: '高精度减法' },
      'cpp-5-4-3': { kw: [/高精度.*乘|高精.*乘|大数乘法/i], titleKw: [/高精|大数/, /乘/], note: '高精度乘法' },
      'cpp-5-7-1': { kw: [/三分/], titleKw: [/三分/], note: '整数三分' },
      'cpp-5-7-2': { kw: [/三分/], titleKw: [/三分/], note: '实数三分' },
    }
  },
  6: {
    domains: ['Level3','Level4','Level5','Level6','gesp5','gesp6','atcoder'],
    chapters: {
      'cpp-6-2-2': { kw: [/deque|双端队列/i], titleKw: [/deque|双端/i], note: '双端队列' },
      'cpp-6-2-3': { kw: [/队列/], titleKw: [/队列/], note: '队列应用' },
      'cpp-6-3-1': { kw: [/单链表|链表/], titleKw: [/链表/], note: '单链表' },
      'cpp-6-4-2': { kw: [/优先队列|priority/i], titleKw: [/优先队列|堆/], note: '优先队列' },
      'cpp-6-6-1': { kw: [/哈夫曼|huffman/i], titleKw: [/哈夫曼|huffman/i], note: '哈夫曼树' },
      'cpp-6-6-2': { kw: [/哈夫曼|huffman/i], titleKw: [/哈夫曼|huffman/i], note: '哈夫曼编码' },
      'cpp-6-6-3': { kw: [/哈夫曼|huffman|带权.*路径/i], titleKw: [/哈夫曼|带权/i], note: '带权路径长度' },
      'cpp-6-8-1': { kw: [/^bfs|广度优先/i], titleKw: [/bfs|广度优先/i], note: 'BFS基础' },
      'cpp-6-9-1': { kw: [/^dfs|深度优先/i], titleKw: [/dfs|深度优先/i], note: 'DFS基础' },
      'cpp-6-10-4': { kw: [/lcs|最长公共子序列/i], titleKw: [/最长公共|lcs/i], note: 'LCS' },
      'cpp-6-11-3': { kw: [/多重背包|混合背包/], titleKw: [/多重|混合/, /背包/], note: '多重/混合背包' },
    }
  },
  7: {
    domains: ['Level4','Level5','Level6','Level7','gesp6','gesp7','atcoder'],
    chapters: {
      'cpp-7-1-1': { kw: [/全排列|排列|回溯/], titleKw: [/全排列|回溯/], note: '全排列回溯' },
      'cpp-7-1-2': { kw: [/子集|组合枚举/], titleKw: [/子集|组合/], note: '子集生成' },
      'cpp-7-1-3': { kw: [/剪枝/], titleKw: [/剪枝/], note: '剪枝' },
      'cpp-7-2-1': { kw: [/多源.*bfs|多源bfs|泛洪/i], titleKw: [/多源|泛洪/i], note: '多源BFS' },
      'cpp-7-2-2': { kw: [/双向.*bfs|双向bfs/i], titleKw: [/双向/i], note: '双向BFS' },
      'cpp-7-2-3': { kw: [/a\*|启发式/i], titleKw: [/a\*/i], note: 'A*' },
      'cpp-7-3-2': { kw: [/矩阵.*快速幂|矩阵幂/], titleKw: [/矩阵.*幂/], note: '矩阵幂线性递推' },
      'cpp-7-3-3': { kw: [/矩阵.*快速幂|矩阵幂/], titleKw: [/矩阵.*幂/], note: '矩阵幂应用' },
      'cpp-7-4-3': { kw: [/lca|最近公共祖先|树上路径/i], titleKw: [/lca|公共祖先|路径/i], note: 'LCA应用' },
      'cpp-7-5-1': { kw: [/离散化|坐标压缩/], titleKw: [/离散化|压缩/], note: '离散化' },
      'cpp-7-5-3': { kw: [/rmq|区间最值/i], titleKw: [/rmq|最值/i], note: 'RMQ应用' },
      'cpp-7-7-1': { kw: [/逆波兰|后缀表达式|波兰式/], titleKw: [/逆波兰|后缀表达式/], note: '逆波兰' },
      'cpp-7-7-2': { kw: [/中缀.*后缀|表达式转/], titleKw: [/中缀|表达式/], note: '中缀转后缀' },
      'cpp-7-7-3': { kw: [/表达式.*求值|括号.*表达式/], titleKw: [/表达式|求值/], note: '表达式求值' },
      'cpp-7-9-2': { kw: [/石子.*归并|石子合并/], titleKw: [/石子/], note: '石子归并' },
      'cpp-7-9-3': { kw: [/区间.*dp|括号.*合并/i], titleKw: [/区间.*dp|括号/i], note: '区间DP字符串' },
      'cpp-7-10-2': { kw: [/树.*独立集|树.*覆盖|树形.*dp/i], titleKw: [/独立集|覆盖/], note: '树独立集' },
      'cpp-7-10-3': { kw: [/树.*直径|树上路径|树形.*dp/i], titleKw: [/直径|路径/], note: '树直径路径' },
      'cpp-7-11-1': { kw: [/方格.*路径|二维.*dp|网格.*路径/i], titleKw: [/方格|路径|网格/], note: '方格DP' },
      'cpp-7-11-2': { kw: [/编辑距离|levenshtein/i], titleKw: [/编辑距离/], note: '编辑距离' },
      'cpp-7-11-3': { kw: [/二维.*dp/i], titleKw: [/二维.*dp/i], note: '二维DP综合' },
    }
  }
}

const ARG_LEVEL = Number((process.argv.find(a=>a.startsWith('--level=')) || '--level=7').split('=')[1])
const cfg = LEVEL_CONFIG[ARG_LEVEL]
if (!cfg) { console.error('No config for level ' + ARG_LEVEL); process.exit(1) }

async function main() {
  const app = mongoose.createConnection(process.env.APP_MONGODB_URI)
  const CL = app.model('CourseLevel', new mongoose.Schema({}, { collection: 'courselevels', strict: false }))
  await app.asPromise()
  // 排除：所有同等级及以下 cpp 课程已使用的 pid（避免重复）
  const cppLevels = await CL.find({ level: { $lte: ARG_LEVEL }, group: /C\+\+/ }).lean()
  const used = new Set()
  for (const lv of cppLevels) for (const t of (lv.topics||[])) for (const c of (t.chapters||[])) {
    for (const id of c.problemIds||[]) used.add(id)
    for (const id of c.optionalProblemIds||[]) used.add(id)
  }
  await app.close()
  console.error(`Used pids (cpp L1-L${ARG_LEVEL}): ${used.size}`)

  const hy = mongoose.createConnection(process.env.HYDRO_MONGODB_URI)
  const D = hy.model('Doc', new mongoose.Schema({}, { collection: 'document', strict: false }))
  await hy.asPromise()
  const cur = D.find({ docType: 10, domainId: { $in: cfg.domains } })
    .select({ docId:1, domainId:1, title:1, tag:1, nAccept:1, nSubmit:1 })
    .lean().cursor()
  const buckets = {}
  for (const id of Object.keys(cfg.chapters)) buckets[id] = []
  let scanned = 0
  for await (const doc of cur) {
    scanned++
    const pid = `${doc.domainId}:${doc.docId}`
    if (used.has(pid)) continue
    const tags = (doc.tag||[]).map(String)
    const title = String(doc.title||'')
    const ac = doc.nSubmit ? doc.nAccept/doc.nSubmit : null
    for (const [chId, ch] of Object.entries(cfg.chapters)) {
      const matchTag = tags.some(t => ch.kw.some(re => re.test(t)))
      const matchTitle = ch.titleKw && ch.titleKw.every(re => re.test(title))
      if (!matchTag && !matchTitle) continue
      buckets[chId].push({ pid, title, tags, ac: ac==null?null:+ac.toFixed(2), ns: doc.nSubmit||0, matchTag, matchTitle })
    }
  }
  await hy.close()
  for (const id of Object.keys(buckets)) {
    buckets[id].sort((a,b) => {
      const score = (x) => {
        let s = 0
        if (x.matchTag) s += 5
        if (x.matchTitle) s += 3
        if (x.tags.some(t=>new RegExp(`gesp${ARG_LEVEL}|Level${ARG_LEVEL}`,'i').test(t))) s += 4
        if (x.tags.some(t=>new RegExp(`gesp${ARG_LEVEL-1}|Level${ARG_LEVEL-1}`,'i').test(t))) s += 2
        if (x.ac!=null && x.ac >= 0.3 && x.ac <= 0.85) s += 2
        if (x.ns >= 5) s += 1
        return s
      }
      return score(b) - score(a)
    })
    buckets[id] = buckets[id].slice(0, 12)
  }
  const out = path.resolve(__dirname, `../changelogs/gesp${ARG_LEVEL}-empty-candidates.json`)
  fs.writeFileSync(out, JSON.stringify({ scanned, buckets }, null, 2))
  console.error(`scanned=${scanned} -> ${out}\n`)
  for (const [id, ch] of Object.entries(cfg.chapters)) {
    const b = buckets[id]
    console.log(`\n## ${id} ${ch.note} (${b.length})`)
    for (const c of b.slice(0, 8)) console.log(`  ${c.pid} | ac=${c.ac} ns=${c.ns} | ${c.title.slice(0,50)} | ${c.tags.slice(0,5).join(',')}`)
  }
}
main().catch(e=>{console.error(e);process.exit(1)})
