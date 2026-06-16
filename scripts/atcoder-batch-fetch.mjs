/**
 * atcoder-batch-fetch.mjs
 *
 * 批量抓取 AtCoder ABC 比赛题目 + AC C++ 代码
 * - 复刻 server/routes/atcoder.js 的核心抓取逻辑
 * - 走 kenkoooo.com 多用户池找 AC 提交 id（kmjp/qqqaaazzz/potato167/...）
 * - SQLite 断点续传（node:sqlite 内置）
 * - 失败重试（429 指数退避）
 * - 输出 D:\webapp\course\gesp\data\atcoder_c\ABCxxx\abcxxx_y\solution.md
 *
 * 用法:
 *   node scripts/atcoder-batch-fetch.mjs                  # 全量 ABC001-461
 *   node scripts/atcoder-batch-fetch.mjs --from=460       # 只跑 ABC460-461
 *   node scripts/atcoder-batch-fetch.mjs --contest=abc261 # 单场
 *   node scripts/atcoder-batch-fetch.mjs --no-ac          # 跳过 AC 代码（只抓题干）
 *   node scripts/atcoder-batch-fetch.mjs --dry-run        # 试抓不写文件
 *   node scripts/atcoder-batch-fetch.mjs --resume=0       # 强制重抓已存在的
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
import { createRequire } from 'node:module'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { DatabaseSync } = require('node:sqlite')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ─── 配置 ───────────────────────────────────────────────────────────────────
// 新根目录（用户最新要求）：gesp/abc/abc461/abc461_a/solution.md
//                                └─ abc461_a/ac.cpp
// 专用于本次脚本抓取，干净目录，不和 atcoder_a/b/d/e 混在一起
const OUTPUT_ROOT = 'D:\\webapp\\course\\gesp\\abc'
const DB_PATH = path.join(__dirname, '..', 'logs', 'atcoder-batch.db')
const LOG_PATH = path.join(__dirname, '..', 'logs', 'atcoder-batch.log')

// kenkoooo 用户池（精简版：只查两个人 + 全站兜底）
// 优先级：kunkka → qqqaaazzz → 全站任意 C++ AC
// qqqaaazzz 是 Python/Rust 大神，几乎每场都打，能覆盖大部分你打过的题
const PRIORITY_USERS = ['kunkka', 'qqqaaazzz']

// kenkoooo 翻页配置
// 优化：自己/qqqaaazzz 8 页（覆盖全量），全站流 4 页
const KENKOOOO_USER_PAGES = {
  self: 8,
  priority: 8,
  global: 4,
}
const RECENT_WINDOW_SEC = 18 * 30 * 24 * 3600  // 18 个月

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,ja;q=0.8',
}

const HTTP_OPTS = {
  headers: HEADERS,
  timeout: 20000,
  validateStatus: s => s < 500,
}

const KENKOOOO_OPTS = {
  ...HTTP_OPTS,
  validateStatus: s => s === 200 || s === 429,
}

// ─── CLI 参数 ───────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2)
    .map(a => a.replace(/^--/, '').split('='))
    .filter(p => p[0])
    .map(([k, v]) => [k, v ?? 'true'])
)
// 默认倒序：ABC461 → ABC001（新比赛先抓）
const FROM = args.from ? parseInt(args.from) : 461
const TO = args.to ? parseInt(args.to) : 1
const CONTEST = args.contest?.toLowerCase() || null
const NO_AC = args['no-ac'] === 'true'
const DRY_RUN = args['dry-run'] === 'true'
const RESUME = args.resume !== '0'  // 默认 true
const ASCENDING = args.asc === 'true'  // 强制正序
const LIMIT = args.limit ? parseInt(args.limit) : Infinity  // 测试用：限制题数

// ─── 工具 ───────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))

function nowSec() { return Math.floor(Date.now() / 1000) }

function pad3(n) { return String(n).padStart(3, '0') }

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

function logToFile(line) {
  const stamp = new Date().toISOString()
  const text = `[${stamp}] ${line}\n`
  fs.appendFileSync(LOG_PATH, text)
  process.stdout.write(text)
}

// ─── SQLite ─────────────────────────────────────────────────────────────────
function initDb() {
  ensureDir(path.dirname(DB_PATH))
  const db = new DatabaseSync(DB_PATH)
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      task_id TEXT PRIMARY KEY,
      contest_id TEXT NOT NULL,
      label TEXT NOT NULL,
      title TEXT,
      problem_status TEXT DEFAULT 'pending',   -- pending / fetched / failed
      ac_status TEXT DEFAULT 'pending',        -- pending / found / not_found / skipped
      ac_user TEXT,
      ac_sub_id TEXT,
      ac_code_len INTEGER,
      error TEXT,
      fetched_at TEXT,
      ac_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_contest ON tasks(contest_id);
  `)
  return db
}

function recordTask(db, taskId, contestId, label) {
  db.prepare(`
    INSERT OR IGNORE INTO tasks (task_id, contest_id, label)
    VALUES (?, ?, ?)
  `).run(taskId, contestId, label)
}

function markFetched(db, taskId, title) {
  db.prepare(`UPDATE tasks SET problem_status='fetched', title=?, fetched_at=? WHERE task_id=?`)
    .run(title, new Date().toISOString(), taskId)
}

function markFailed(db, taskId, err) {
  db.prepare(`UPDATE tasks SET problem_status='failed', error=? WHERE task_id=?`)
    .run(String(err).substring(0, 500), taskId)
}

function markAc(db, taskId, status, { user, subId, codeLen } = {}) {
  db.prepare(`
    UPDATE tasks SET ac_status=?, ac_user=?, ac_sub_id=?, ac_code_len=?, ac_at=?
    WHERE task_id=?
  `).run(status, user || null, subId || null, codeLen || null, new Date().toISOString(), taskId)
}

function isTaskDone(db, taskId) {
  const row = db.prepare(`SELECT problem_status, ac_status FROM tasks WHERE task_id=?`).get(taskId)
  if (!row) return false
  if (RESUME && row.problem_status === 'fetched' && (row.ac_status === 'found' || row.ac_status === 'skipped' || row.ac_status === 'not_found')) {
    return true
  }
  return false
}

// ─── 抓取：比赛列表 ─────────────────────────────────────────────────────────
async function fetchContestList(contestId) {
  const url = `https://atcoder.jp/contests/${contestId}/tasks`
  const r = await axios.get(url, HTTP_OPTS)
  const $ = cheerio.load(r.data)
  const problems = []
  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td')
    if (cells.length < 2) return
    const labelAnchor = $(cells[0]).find('a')
    const titleAnchor = $(cells[1]).find('a')
    const label = (labelAnchor.text().trim() || $(cells[0]).text().trim()).toLowerCase()
    const title = titleAnchor.text().trim()
    const href = titleAnchor.attr('href') || labelAnchor.attr('href')
    if (href && (label || title)) {
      problems.push({
        label,  // e.g. "a", "b", "c", "d", "e", "f", "g"
        title,
        taskId: href.split('/').pop(),  // e.g. "abc262_c"
        url: `https://atcoder.jp${href}`,
      })
    }
  })
  return problems
}

// ─── 抓取：题目（题干 markdown） ─────────────────────────────────────────────
async function fetchProblem(url) {
  const enUrl = url.replace(/[?#].*$/, '') + '?lang=en'
  const r = await axios.get(enUrl, HTTP_OPTS)
  const $ = cheerio.load(r.data)

  const rawTitle = $('span.h2').first().contents().filter((_, n) => n.type === 'text').text().trim()
  const pageTitle = $('title').text().trim()
  const title = rawTitle || pageTitle.split('-')[0].trim()

  // 限制
  const limitsRow = $('.col-sm-12.col-md-4').first().text().trim()

  let $stmt = $('#task-statement .lang-en')
  if ($stmt.length === 0) $stmt = $('#task-statement')

  // 解析 -> markdown
  let body = ''
  const $parts = $stmt.find('.part, > section')
  if ($parts.length) {
    $parts.each((_, part) => {
      const $part = $(part)
      const h3 = $part.find('> section > h3, > h3').first().text().trim()
      if (h3) body += `## ${h3}\n\n`
      const $inner = $part.find('> section').length ? $part.find('> section') : $part
      $inner.children().each((_, child) => {
        if (!child.tagName) return
        const tag = child.tagName.toLowerCase()
        if (tag === 'h3') return
        if (tag === 'p') {
          const t = $(child).text().trim()
          if (t) body += t + '\n\n'
        } else if (tag === 'pre') {
          body += '```\n' + $(child).text().trim() + '\n```\n\n'
        } else if (tag === 'ul') {
          $(child).children('li').each((_, li) => { body += `- ${$(li).text().trim()}\n` })
          body += '\n'
        } else if (tag === 'ol') {
          $(child).children('li').each((i, li) => { body += `${i+1}. ${$(li).text().trim()}\n` })
          body += '\n'
        } else if (tag === 'div' || tag === 'section') {
          const t = $(child).text().trim()
          if (t) body += t + '\n\n'
        }
      })
    })
  } else {
    $stmt.children().each((_, child) => {
      if (!child.tagName) return
      const tag = child.tagName.toLowerCase()
      if (tag === 'h3') body += `## ${$(child).text().trim()}\n\n`
      else if (tag === 'p') { const t = $(child).text().trim(); if (t) body += t + '\n\n' }
      else if (tag === 'pre') body += '```\n' + $(child).text().trim() + '\n```\n\n'
    })
  }

  return { title, content: body.trim(), limits: limitsRow }
}

// ─── 抓取：AC 代码（kenkoooo 多用户池） ─────────────────────────────────────
async function searchUser(user, taskId, fromSec = 0, maxPages = 10, langFilter = /[Cc]\+\+/) {
  let from = fromSec
  for (let page = 0; page < maxPages; page++) {
    const url = `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${encodeURIComponent(user)}&from_second=${from}`
    let r
    try {
      r = await axios.get(url, KENKOOOO_OPTS)
    } catch (e) {
      logToFile(`  [${user}] 异常: ${e.message}`)
      return null
    }
    if (r.status === 429) {
      logToFile(`  [${user}] 429 限流`)
      return { rateLimited: true }
    }
    if (r.status !== 200) {
      logToFile(`  [${user}] HTTP ${r.status}`)
      return null
    }
    const all = r.data || []
    let ac = all.filter(s => s.problem_id === taskId && s.result === 'AC')
    if (langFilter) {
      const filtered = ac.filter(s => s.language && langFilter.test(s.language))
      if (filtered.length) ac = filtered
    }
    if (ac.length) {
      ac.sort((a, b) => b.epoch_second - a.epoch_second)
      return { hit: ac[0] }
    }
    if (all.length < 500) return null
    from = all[all.length - 1].epoch_second + 1
    if (page < maxPages - 1) await sleep(600)
  }
  return null
}

// 全站 AC 流：找到 taskId 的任意用户的 AC 提交
// 用途：当指定用户池找不到时，按时间线查找其他用户
// 降级策略：C++ (4001/4002/4003/4004) → Python (4006/4042) → Java (4005) → 其它
const LANG_PRIORITY = [
  /^\(C\+\+.*\)$/,           // 4001-4004
  /^C\+\+ /,
  /^Python /,
  /^Java /,
  /^Rust /,
  /^Go /,
  /^C#/,
  /^Ruby /,
  /^Kotlin /,
]
function pickBestLang(acList) {
  for (const re of LANG_PRIORITY) {
    const m = acList.find(s => s.language && re.test(s.language))
    if (m) return m
  }
  return acList[0]
}
async function searchGlobal(taskId, contestEpochStart, maxPages = 5) {
  let from = contestEpochStart
  for (let page = 0; page < maxPages; page++) {
    const url = `https://kenkoooo.com/atcoder/atcoder-api/v3/from/${from}`
    let r
    try {
      r = await axios.get(url, KENKOOOO_OPTS)
    } catch (e) {
      logToFile(`  [global] 异常: ${e.message}`)
      return null
    }
    if (r.status === 429) return { rateLimited: true }
    if (r.status !== 200) return null
    const all = r.data || []
    // 找目标题目的任意 AC
    const ac = all.filter(s => s.problem_id === taskId && s.result === 'AC')
    if (ac.length) {
      ac.sort((a, b) => a.epoch_second - b.epoch_second)  // 最早 AC
      // 按语言优先级选
      const best = pickBestLang(ac)
      return { hit: best, allLanguages: [...new Set(ac.map(s => s.language).filter(Boolean))] }
    }
    if (all.length < 500) return null
    from = all[all.length - 1].epoch_second + 1
    if (page < maxPages - 1) await sleep(600)
  }
  return null
}

async function findAcSubmission(contestId, taskId) {
  // 简化降级链路：kunkka → qqqaaazzz → 全站任意 C++ AC
  // 速度优先：每步超时 30s 内必出

  // Step 1: kunkka
  logToFile(`  Step 1: kunkka`)
  const r1 = await searchUser('kunkka', taskId, 0, KENKOOOO_USER_PAGES.self)
  if (r1?.rateLimited) return { rateLimited: true }
  if (r1?.hit) return { user: 'kunkka', sub: r1.hit }
  await sleep(600)

  // Step 2: qqqaaazzz（Python 大神，命中率很高）
  logToFile(`  Step 2: qqqaaazzz`)
  const r2 = await searchUser('qqqaaazzz', taskId, 0, KENKOOOO_USER_PAGES.priority, null)
  if (r2?.rateLimited) return { rateLimited: true }
  if (r2?.hit) return { user: 'qqqaaazzz', sub: r2.hit, langAny: true }
  await sleep(600)

  // Step 3: 全站 C++ 兜底
  logToFile(`  Step 3: 全站 C++ 兜底`)
  const contestStart = estimateContestStart(contestId)
  const r3 = await searchGlobal(taskId, contestStart, KENKOOOO_USER_PAGES.global)
  if (r3?.rateLimited) return { rateLimited: true }
  if (r3?.hit) {
    return { user: r3.hit.user_id, sub: r3.hit, allLangs: r3.allLanguages, global: true }
  }

  return null
}

// 从 contestId 推算比赛开始时间（UTC 秒）
// ABC001 = 2016-12-10 21:00 UTC = 1481403600
// 每周六 21:00 UTC
// 实际更准确的是查 kenk contests.json，但脚本能离线推算就够了
const KNOWN_CONTEST_STARTS = {
  abc001: 1481403600, abc100: 1503301200, abc200: 1592504400,  // 2016-12-10 / 2017-08-20 / 2020-06-18
  abc300: 1626464400, abc400: 1660563600, abc461: 1748024400,  // 2021-07-17 / 2022-08-16 / 2025-05-24
}
function estimateContestStart(contestId) {
  const id = contestId.toLowerCase()
  if (KNOWN_CONTEST_STARTS[id]) return KNOWN_CONTEST_STARTS[id]
  // 简单线性插值：约每场 ABC 间隔 7 天
  // abc001 → abc461: 460 场 × 7 天 = 3220 天 = 277,728,000 秒
  // 用第一个 known 锚点外推
  const num = parseInt(id.replace(/\D/g, ''), 10)
  if (Number.isFinite(num)) {
    // 起点 abc001
    const start = KNOWN_CONTEST_STARTS.abc001
    const step = 7 * 24 * 3600
    return start + (num - 1) * step
  }
  return nowSec() - 30 * 24 * 3600
}

// ─── 抓取：单条 submission 源码 ─────────────────────────────────────────────
async function fetchSubmissionCode(contestId, subId) {
  const url = `https://atcoder.jp/contests/${contestId}/submissions/${subId}`
  const r = await axios.get(url, HTTP_OPTS)
  const $ = cheerio.load(r.data)
  // 调试：dump 页面里含 code 的 selector
  const cands = []
  $('#submission-code, pre.prettyprint, .source-code, pre.ace_editor, .code-frame, pre code').each((_, el) => {
    cands.push({
      tag: el.tagName,
      id: el.attribs?.id || '',
      cls: el.attribs?.class || '',
      preview: $(el).text().trim().substring(0, 80),
    })
  })
  if (cands.length === 0) {
    fs.writeFileSync(path.join(__dirname, '..', 'logs', `debug-sub-${contestId}-${subId}.html`), r.data)
  }
  const code = $('#submission-code').text().trim()
    || $('pre.prettyprint').text().trim()
    || $('.source-code').text().trim()
    || $('pre.ace_editor').text().trim()
    || $('pre code').text().trim()
  return { code, url, cands }
}

// ─── 生成 solution.md ──────────────────────────────────────────────────────
function makeMarkdown({ taskId, contestId, label, title, problemContent, limits, acMeta }) {
  const letterMap = { a: 'A', b: 'B', c: 'C', d: 'D', e: 'E', f: 'F', g: 'G' }
  const diffLetter = letterMap[label] || label.toUpperCase()
  const lines = []

  const titleShort = title.replace(/^[A-Z]\s*-\s*/i, '').trim() || taskId
  lines.push(`# ${taskId} - ${titleShort}`)
  lines.push('')
  lines.push('## 题目信息')
  lines.push('')
  lines.push(`- **难度**：🟢 ${diffLetter}`)
  lines.push(`- **来源**：AtCoder ${contestId.toUpperCase()}`)
  lines.push(`- **链接**：https://atcoder.jp/contests/${contestId}/tasks/${taskId}`)
  if (limits) lines.push(`- **限制**：${limits.replace(/\s+/g, ' ').trim()}`)
  lines.push('')
  lines.push('## 题意')
  lines.push('')
  lines.push(problemContent || '_抓取失败_')
  lines.push('')

  if (acMeta) {
    lines.push('## 参考代码')
    lines.push('')
    lines.push(`> 来源：AtCoder submission #${acMeta.subId} by **${acMeta.user}** (${acMeta.lang})`)
    lines.push('')
    const ext = acMeta.ext || 'txt'
    lines.push(`代码见同目录 \`std.${ext}\`（来源：submission #${acMeta.subId} by **${acMeta.user}**）`)
    lines.push('')
  }

  return lines.join('\n')
}

// 把语言名规范成扩展名和 slug
function langToExt(lang) {
  if (!lang) return { ext: 'txt', slug: 'unknown' }
  if (/C\+\+ \d+\(GCC\)/.test(lang)) return { ext: 'cpp', slug: 'cpp' }
  if (/C\+\+ \d+\(Clang\)/.test(lang)) return { ext: 'cpp', slug: 'cpp' }
  if (/C\+\+/.test(lang)) return { ext: 'cpp', slug: 'cpp' }
  if (/Python/.test(lang)) return { ext: 'py', slug: 'py' }
  if (/Java/.test(lang)) return { ext: 'java', slug: 'java' }
  if (/Rust/.test(lang)) return { ext: 'rs', slug: 'rs' }
  if (/Go/.test(lang)) return { ext: 'go', slug: 'go' }
  if (/C#/.test(lang)) return { ext: 'cs', slug: 'cs' }
  if (/Ruby/.test(lang)) return { ext: 'rb', slug: 'rb' }
  if (/Kotlin/.test(lang)) return { ext: 'kt', slug: 'kt' }
  if (/Swift/.test(lang)) return { ext: 'swift', slug: 'swift' }
  return { ext: 'txt', slug: 'other' }
}

// ─── 主流程 ────────────────────────────────────────────────────────────────
const TASK_TIMEOUT_MS = 15000  // 单题硬超时（提速）

async function processTask(db, task) {
  const { taskId } = task
  logToFile(`  [${taskId}] 开始`)

  if (isTaskDone(db, taskId) && !DRY_RUN) {
    logToFile(`  [${taskId}] 已完成，跳过`)
    return
  }

  // 单题超时控制（不抛错，而是尽快收工）
  return Promise.race([
    _processTaskInner(db, task),
    new Promise(resolve => setTimeout(() => {
      logToFile(`  [${taskId}] 超时 ${TASK_TIMEOUT_MS}ms，强制收工`)
      resolve()
    }, TASK_TIMEOUT_MS))
  ]).catch(e => {
    logToFile(`  [${taskId}] 异常: ${e.message}`)
  })
}

async function _processTaskInner(db, task) {
  const { taskId, contestId, label } = task

  // 1. 抓题干
  let problem
  try {
    problem = await fetchProblem(task.url)
  } catch (e) {
    logToFile(`  [${taskId}] 题干抓取失败: ${e.message}`)
    if (!DRY_RUN) markFailed(db, taskId, e.message)
    return
  }
  logToFile(`  [${taskId}] 题干: ${problem.title} (${problem.content.length} chars)`)
  if (!DRY_RUN) markFetched(db, taskId, problem.title)

  // 2. 抓 AC
  let acResult = null
  let acCode = ''
  let acMeta = null
  if (!NO_AC) {
    try {
      acResult = await findAcSubmission(contestId, taskId)
    } catch (e) {
      logToFile(`  [${taskId}] AC 搜索异常: ${e.message}`)
    }

    if (acResult?.rateLimited) {
      logToFile(`  [${taskId}] 全 kenkoooo 限流，跳过 AC`)
      if (!DRY_RUN) markAc(db, taskId, 'skipped', { user: 'rate_limited' })
    } else if (acResult?.hit === undefined && !acResult) {
      logToFile(`  [${taskId}] 未找到 AC 提交`)
      if (!DRY_RUN) markAc(db, taskId, 'not_found')
    } else if (acResult) {
      const tag = acResult.langAny ? '[langAny]' : acResult.global ? '[global]' : acResult.globalAny ? '[global*]' : ''
      logToFile(`  [${taskId}] 找到 AC ${tag}: user=${acResult.user} subId=${acResult.sub.id} lang=${acResult.sub.language}`)
      try {
        const { code, url, cands } = await fetchSubmissionCode(contestId, acResult.sub.id)
        acCode = code
        acMeta = { user: acResult.user, subId: acResult.sub.id, url, lang: acResult.sub.language || 'unknown' }
        logToFile(`  [${taskId}] 代码长度: ${code.length}, 候选数: ${cands.length}`)
        if (cands.length) {
          logToFile(`  [${taskId}] 候选: ${cands.map(c => `${c.tag}#${c.id}.${c.cls}`).join(' | ')}`)
        }
        if (!DRY_RUN) markAc(db, taskId, 'found', { user: acResult.user, subId: acResult.sub.id, codeLen: code.length })
      } catch (e) {
        logToFile(`  [${taskId}] 源码抓取失败: ${e.message}`)
        if (!DRY_RUN) markAc(db, taskId, 'skipped', { user: acResult.user })
      }
    }
    await sleep(1000)
  } else {
    if (!DRY_RUN) markAc(db, taskId, 'skipped')
  }

  // 3. 写文件（分两个文件夹）
  if (!DRY_RUN) {
    // 3b. 先确定 langSlug（如果还没设）
    if (acCode && acMeta && !acMeta.langSlug) {
      const { ext, slug } = langToExt(acMeta.lang)
      acMeta.ext = ext
      acMeta.langSlug = slug
    }

    // 题面 + AC 代码 → data/atcoder_c/ABCxxx/abcxxx_y/{solution.md, ac.cpp}
    const taskDir = path.join(OUTPUT_ROOT, contestId.toUpperCase(), taskId)
    ensureDir(taskDir)

    // 3a. solution.md
    const md = makeMarkdown({
      taskId, contestId, label,
      title: problem.title,
      problemContent: problem.content,
      limits: problem.limits,
      acMeta,  // 提示信息引用 AC 代码文件路径
    })
    fs.writeFileSync(path.join(taskDir, 'problem.md'), md, 'utf8')
    logToFile(`  [${taskId}] 已写题面: ${taskDir}\\problem.md`)

    // 3b. std.{ext}（如果有 AC 代码）
    if (acCode && acMeta) {
      const ext = acMeta.ext || 'txt'
      const acFile = path.join(taskDir, `std.${ext}`)
      // 文件头加注释说明来源
      const header = `// Source: AtCoder submission #${acMeta.subId}\n// User: ${acMeta.user}\n// Language: ${acMeta.lang}\n// URL: ${acMeta.url}\n// Problem: https://atcoder.jp/contests/${contestId}/tasks/${taskId}\n\n`
      fs.writeFileSync(acFile, header + acCode, 'utf8')
      logToFile(`  [${taskId}] 已写AC代码: ${acFile} (${acCode.length} bytes)`)
    }
  }
}

async function main() {
  ensureDir(path.dirname(LOG_PATH))
  logToFile('========================================')
  logToFile(`atcoder-batch-fetch 启动`)
  logToFile(`范围: ABC${pad3(FROM)} - ABC${pad3(TO)}${CONTEST ? ` (contest=${CONTEST})` : ''}`)
  logToFile(`AC: ${NO_AC ? '跳过' : '启用'} | DRY: ${DRY_RUN} | RESUME: ${RESUME} | LIMIT: ${LIMIT === Infinity ? '无' : LIMIT}`)

  const db = initDb()
  let totalTasks = 0
  let successTasks = 0
  let limitCounter = 0

  // 构造比赛列表：默认倒序（新比赛先抓），ASCENDING 强制正序
  const contests = CONTEST
    ? [CONTEST]
    : ASCENDING
      ? Array.from({ length: FROM - TO + 1 }, (_, i) => `abc${pad3(TO + i)}`)
      : Array.from({ length: FROM - TO + 1 }, (_, i) => `abc${pad3(FROM - i)}`)

  for (const contestId of contests) {
    if (limitCounter >= LIMIT) break
    logToFile(`\n━━━ ${contestId.toUpperCase()} ━━━`)

    let problems
    try {
      problems = await fetchContestList(contestId)
    } catch (e) {
      logToFile(`  比赛列表抓取失败: ${e.message}，跳过`)
      await sleep(2000)
      continue
    }
    logToFile(`  ${problems.length} 题`)

    if (problems.length === 0) {
      logToFile(`  比赛不存在或未发布，跳过`)
      continue
    }

    for (const p of problems) {
      if (limitCounter >= LIMIT) break
      totalTasks++
      limitCounter++
      p.contestId = contestId
      recordTask(db, p.taskId, contestId, p.label)

      try {
        await processTask(db, p)
        successTasks++
      } catch (e) {
        logToFile(`  [${p.taskId}] 未捕获异常: ${e.message}`)
      }
    }

    // 比赛间多休息
    await sleep(2000)
  }

  logToFile('\n========================================')
  logToFile(`完成！处理 ${totalTasks} 题，成功 ${successTasks}`)
  logToFile(`数据库: ${DB_PATH}`)
  logToFile(`日志: ${LOG_PATH}`)
}

main().catch(e => { logToFile(`FATAL: ${e.message}\n${e.stack}`); process.exit(1) })
