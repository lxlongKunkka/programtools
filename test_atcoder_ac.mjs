/**
 * test_atcoder_ac.mjs
 * 直接测试抓取 AtCoder 题目 + AC C++ 代码的能力
 *
 * 用法: cd d:\webapp\programtools && node test_atcoder_ac.mjs abc262_c
 */
import axios from 'axios'
import * as cheerio from 'cheerio'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,ja;q=0.8'
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

const taskId = process.argv[2] || 'abc262_c'
const contestId = taskId.replace(/_[a-z]\d*$/i, '')

async function fetchProblem(url) {
  const enUrl = url.replace(/[?#].*$/, '') + '?lang=en'
  const resp = await axios.get(enUrl, { headers: HEADERS, timeout: 20000 })
  const $ = cheerio.load(resp.data)
  const rawTitle = $('span.h2').first().contents().filter((_, n) => n.type === 'text').text().trim()
  const title = rawTitle || $('title').text().split('-')[0].trim()
  let body = ''
  let $stmt = $('#task-statement .lang-en')
  if ($stmt.length === 0) $stmt = $('#task-statement')
  $stmt.find('.part, > section').each((_, part) => {
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
        body += $(child).text().trim() + '\n\n'
      }
    })
  })
  return { title, content: `# ${title}\n\n${body}`.trim() }
}

async function searchUser(user, taskId, fromSecond = 0, maxPages = 10) {
  let from = fromSecond
  for (let page = 0; page < maxPages; page++) {
    const url = `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${encodeURIComponent(user)}&from_second=${from}`
    console.log(`  [${user}] page=${page} from=${from}`)
    if (page > 0) await sleep(800)
    try {
      const r = await axios.get(url, { headers: HEADERS, timeout: 20000, validateStatus: s => s < 500 })
      if (r.status === 429) { console.log(`  [${user}] 429`); return null }
      if (r.status !== 200) { console.log(`  [${user}] HTTP ${r.status}`); return null }
      const all = r.data || []
      let ac = all.filter(s => s.problem_id === taskId && s.result === 'AC')
      const cpp = ac.filter(s => s.language && /[Cc]\+\+/.test(s.language))
      if (cpp.length) ac = cpp
      if (ac.length) {
        ac.sort((a, b) => b.epoch_second - a.epoch_second)
        return ac[0]
      }
      if (all.length < 500) return null
      from = all[all.length - 1].epoch_second + 1
    } catch (e) {
      console.log(`  [${user}] 失败: ${e.message}`)
      return null
    }
  }
  return null
}

async function fetchSubmissionCode(contestId, subId) {
  const url = `https://atcoder.jp/contests/${contestId}/submissions/${subId}`
  const r = await axios.get(url, { headers: HEADERS, timeout: 20000 })
  const $ = cheerio.load(r.data)
  const code = $('#submission-code').text().trim()
    || $('pre.prettyprint').text().trim()
    || $('.source-code').text().trim()
  return { code, url }
}

async function main() {
  console.log(`\n=== 测试 AtCoder 抓取流程: ${contestId} / ${taskId} ===\n`)

  console.log('1) 抓取题目...')
  const problemUrl = `https://atcoder.jp/contests/${contestId}/tasks/${taskId}`
  const { title, content } = await fetchProblem(problemUrl)
  console.log(`   标题: ${title}`)
  console.log(`   正文长度: ${content.length}`)
  console.log(`   前 300 字符:\n${content.substring(0, 300)}\n`)

  console.log('2) 查找 AC C++ 提交（多用户多页）...')
  const USERS = ['kmjp', 'qqqaaazzz', 'potato167', 'kotatsugame']
  let foundSub = null
  for (const u of USERS) {
    const sub = await searchUser(u, taskId, 0, 5)
    if (sub) { foundSub = { user: u, ...sub }; break }
  }
  if (!foundSub) {
    console.log('   未找到任何 AC 提交')
    return
  }
  console.log(`   找到: user=${foundSub.user} id=${foundSub.id} lang=${foundSub.language}`)

  console.log('3) 抓取 AC 源码...')
  const { code, url } = await fetchSubmissionCode(contestId, foundSub.id)
  console.log(`   代码长度: ${code.length}`)
  console.log(`   链接: ${url}`)
  console.log(`\n--- AC 代码 ---\n${code}\n--- 结束 ---`)
}

main().catch(e => { console.error('失败:', e.message); process.exit(1) })
