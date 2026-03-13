// debug_tags.mjs - 直接测试 cheerio 解析标签
import { load } from 'cheerio'
import axios from 'axios'
import http from 'http'
import https from 'https'

const BASE = 'http://nflsoi.cc:10611'
const CONTEST_ID = '69ad79c783d6583e0f6d26cd'

async function login() {
  const r = await axios.post(`${BASE}/login`,
    new URLSearchParams({ uname: 'wfbczx', password: '123456' }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      maxRedirects: 0, validateStatus: s => s < 600 })
  const cookies = (r.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ')
  console.log('cookies:', cookies ? '✅ got' : '❌ empty')
  return cookies
}

async function test(cookies) {
  const r = await axios.get(`${BASE}/contest/${CONTEST_ID}/problems`, {
    headers: { Cookie: cookies, 'User-Agent': 'Mozilla/5.0' },
    responseType: 'text', transformResponse: [d => d]
  })
  const $ = load(r.data)

  const problems = []
  const seen = new Set()

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    const m = href.match(/^\/p\/([a-zA-Z0-9_]+)\?tid=([a-zA-Z0-9]+)$/)
    if (!m) return
    const pid = m[1]
    if (seen.has(pid)) return
    seen.add(pid)
    const $a = $(el)
    const $td = $a.closest('td')
    const tags = []
    $td.find('a.problem__tag-link').each((_, tagEl) => {
      tags.push($(tagEl).text().trim())
    })
    // Also try $a.next with ul
    const tagsFromSibling = []
    $a.nextAll('ul.problem__tags').find('a.problem__tag-link').each((_, t) => {
      tagsFromSibling.push($(t).text().trim())
    })
    // Also via parent's find
    const tagsFromParent = []
    $a.parent().find('a.problem__tag-link').each((_, t) => {
      tagsFromParent.push($(t).text().trim())
    })
    console.log(`pid=${pid} $td.find=${JSON.stringify(tags)} sibling=${JSON.stringify(tagsFromSibling)} parent=${JSON.stringify(tagsFromParent)}`)
    console.log(`  $td exists: ${$td.length > 0}, $td tag: ${$td.prop('tagName')}`)
  })
}

const cookies = await login()
await test(cookies)
