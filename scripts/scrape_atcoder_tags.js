/**
 * scrape_atcoder_tags.js
 *
 * 策略：按【分类页】爬取，而非逐题爬取。
 *   - 从 /explain 提取所有顶级标签（/tags/X 和 /tag_search/X）
 *   - 对有子标签的 /tags/X，先爬子标签链接，再爬各子标签的题目列表
 *   - 对直接是题目列表的 /tag_search/X，直接解析表格
 *   - 全程只需几十个请求（而非 2755 个），几分钟完成
 *
 * 输出：
 *   scripts/atcoder_abc_tags.json  -- 题目 -> 标签映射（含 kenkoooo 难度数据）
 *
 * 使用方法：
 *   node scripts/scrape_atcoder_tags.js
 *   node scripts/scrape_atcoder_tags.js --proxy http://127.0.0.1:7890  # 自定义代理
 *   node scripts/scrape_atcoder_tags.js --abc-only                     # 只保留 ABC 题
 */

import axios from 'axios'
import { HttpsProxyAgent } from 'https-proxy-agent'
import * as cheerio from 'cheerio'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

// -- 参数 --
const PROXY    = (() => { const i = process.argv.indexOf('--proxy'); return i > -1 ? process.argv[i+1] : 'http://127.0.0.1:10808' })()
const ABC_ONLY = process.argv.includes('--abc-only')

const BASE         = 'https://atcoder-tags.herokuapp.com'
const RESULT_FILE  = path.resolve(__dirname, 'atcoder_abc_tags.json')
const KENKOOOO_URL = 'https://kenkoooo.com/atcoder/resources/problems.json'
const MODELS_URL   = 'https://kenkoooo.com/atcoder/resources/problem-models.json'

const sleep = ms => new Promise(r => setTimeout(r, ms))

// -- HTTP 客户端 --
function makeClient() {
  const agent = new HttpsProxyAgent(PROXY)
  return axios.create({
    timeout: 20000,
    httpsAgent: agent,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,*/*'
    }
  })
}

// -- HTML 解析：从题目列表页提取所有 problem_id --
function parseProblemIds(html) {
  const $ = cheerio.load(html)
  const ids = []
  $('a[href^="/check/"]').each((_, el) => {
    const id = $(el).attr('href').replace('/check/', '').trim()
    if (id) ids.push(id)
  })
  return [...new Set(ids)]
}

// -- 收集所有叶子标签 URL --
async function collectTagUrls(client) {
  const explainRes = await client.get(`${BASE}/explain`)
  const $ = cheerio.load(explainRes.data)

  const internalLinks = new Set()
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    if (href && href.startsWith('/')) internalLinks.add(href)
  })

  const directTags = []
  const parentTags = []

  for (const link of internalLinks) {
    if (link.startsWith('/tag_search/')) directTags.push(link)
    else if (link.startsWith('/tags/') && link.split('/').length === 3) parentTags.push(link)
  }

  console.log(`   直接标签: ${directTags.length}`)
  console.log(`   父级标签: ${parentTags.length}（含子标签）`)

  const subTags = []
  for (const parent of parentTags) {
    try {
      const r = await client.get(`${BASE}${parent}`)
      const $p = cheerio.load(r.data)
      $p('a[href]').each((_, el) => {
        const href = $p(el).attr('href')
        if (href && href.startsWith('/tags/') && href.split('/').length === 4) {
          subTags.push(href)
        }
      })
      await sleep(600)
    } catch (err) {
      console.warn(`   ! 父标签 ${parent} 失败: ${err.message}`)
    }
  }

  const allTagUrls = [
    ...directTags.map(t => ({ url: `${BASE}${t}`, label: t.replace('/tag_search/', '') })),
    ...subTags.map(t => ({ url: `${BASE}${t}`, label: t.slice(1).replace(/\//g, '/') })),
    ...parentTags.map(t => ({ url: `${BASE}${t}`, label: t.replace('/tags/', '') })),
  ]

  return allTagUrls
}

// -- 主流程 --
async function main() {
  const client = makeClient()
  console.log(`Proxy: ${PROXY}\n`)

  // 1. 收集所有标签 URL
  console.log('[1/4] 收集标签分类列表...')
  const tagUrls = await collectTagUrls(client)
  console.log(`   共 ${tagUrls.length} 个标签页\n`)

  // 2. 拉取 kenkoooo 数据
  console.log('[2/4] 加载 kenkoooo 元数据...')
  const [probRes, modelRes] = await Promise.all([
    client.get(KENKOOOO_URL, { timeout: 30000 }),
    client.get(MODELS_URL,   { timeout: 30000 }),
  ])
  const problemMeta = {}
  for (const p of probRes.data) problemMeta[p.id] = p
  const models = modelRes.data
  console.log(`   题目元数据: ${Object.keys(problemMeta).length}\n`)

  // 3. 逐标签爬取
  console.log('[3/4] 爬取各标签页面...')
  const tagMap = {}

  for (const { url, label } of tagUrls) {
    try {
      const r = await client.get(url)
      const ids = parseProblemIds(r.data)
      if (ids.length > 0) {
        console.log(`  OK  ${label.padEnd(40)} -> ${ids.length} 道`)
        for (const id of ids) {
          if (!tagMap[id]) tagMap[id] = new Set()
          tagMap[id].add(label)
        }
      } else {
        process.stdout.write(`  --  ${label} (0)\r`)
      }
      await sleep(700)
    } catch (err) {
      console.warn(`  ERR ${label}: ${err.message}`)
      await sleep(1500)
    }
  }

  // 4. 组装最终结果
  console.log('\n[4/4] 组装结果...')
  const result = {}

  const sourceIds = ABC_ONLY
    ? Object.keys(tagMap).filter(id => problemMeta[id]?.contest_id?.startsWith('abc'))
    : Object.keys(tagMap)

  for (const id of sourceIds) {
    const meta  = problemMeta[id] || {}
    const model = models[id] || {}
    result[id] = {
      id,
      contest_id: meta.contest_id || '',
      title:      meta.title || '',
      tags: [...(tagMap[id] || [])],
      difficulty: model.difficulty != null ? Math.round(model.difficulty) : null,
    }
  }

  fs.writeFileSync(RESULT_FILE, JSON.stringify(result, null, 2))

  const withTags = Object.values(result).filter(p => p.tags.length > 0).length
  console.log(`\n${'─'.repeat(50)}`)
  console.log(`完成`)
  console.log(`   总题目: ${Object.keys(result).length}`)
  console.log(`   有标签: ${withTags}`)
  console.log(`\n   结果：${RESULT_FILE}`)
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
