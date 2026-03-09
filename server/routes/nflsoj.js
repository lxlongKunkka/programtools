/**
 * server/routes/nflsoj.js
 * NFLSOJ (nflsoi.cc:20035，基于 SYZOJ 框架) 比赛抓取路由
 *
 * API:
 *   GET /api/nflsoj/contest?url=http://nflsoi.cc:20035/contest/2341
 *   GET /api/nflsoj/problem?url=http://nflsoi.cc:20035/contest/2341/problem/1
 */

import express from 'express'
import axios from 'axios'
import crypto from 'crypto'
import path from 'path'
import { load } from 'cheerio'
import { authenticateToken } from '../middleware/auth.js'
import { NFLSOJ_USER, NFLSOJ_PWD } from '../config.js'
import { uploadImageToCos } from '../utils/cosUploader.js'

const router = express.Router()

const NFLSOJ_BASE = 'http://nflsoi.cc:20035'
const SYZOJ_SALT = 'syzoj2_xxx'

// ─── 会话缓存（SYZOJ 使用 connect.sid + login cookie）─────────────────────────
let cachedCookies = ''
let sessionExpireAt = 0  // Unix ms

/** 登录并缓存 session cookie */
async function getNflsojSession() {
  const now = Date.now()
  if (cachedCookies && now < sessionExpireAt) return cachedCookies

  if (!NFLSOJ_USER || !NFLSOJ_PWD) {
    throw new Error('未配置 NFLSOJ_USER / NFLSOJ_PWD，请在 server/.env 中配置')
  }

  const hashedPwd = crypto.createHash('md5').update(NFLSOJ_PWD + SYZOJ_SALT).digest('hex')
  const body = new URLSearchParams({ username: NFLSOJ_USER, password: hashedPwd }).toString()

  const r = await axios.post(`${NFLSOJ_BASE}/api/login`, body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0',
      'Referer': NFLSOJ_BASE,
    },
    maxRedirects: 0,
    validateStatus: s => s < 600,
    timeout: 10000
  })

  // 解析 set-cookie
  const setCookies = r.headers['set-cookie'] || []
  if (!setCookies.length) throw new Error('NFLSOJ 登录失败：未返回 cookie')

  // 验证 error_code（1 = 成功，1001 = 用户不存在，1002 = 密码错误）
  let body2
  try { body2 = typeof r.data === 'string' ? JSON.parse(r.data) : r.data } catch { body2 = r.data }
  if (body2?.error_code && body2.error_code !== 1) {
    throw new Error(`NFLSOJ 登录失败：error_code=${body2.error_code}`)
  }

  cachedCookies = setCookies.map(c => c.split(';')[0]).join('; ')
  sessionExpireAt = now + 4 * 60 * 60 * 1000  // 缓存 4 小时
  console.log('[nflsoj] 登录成功，session 已缓存')
  return cachedCookies
}

/** 构造请求 Headers */
function nflsojHeaders(cookies) {
  return {
    Cookie: cookies,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': NFLSOJ_BASE,
    Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
  }
}

/** 通用请求（自动带 session）*/
async function nflsojGet(path) {
  const cookies = await getNflsojSession()
  const r = await axios.get(NFLSOJ_BASE + path, {
    headers: nflsojHeaders(cookies),
    responseType: 'text',
    transformResponse: [d => d],
    validateStatus: s => s < 600,
    timeout: 15000
  })
  if (r.status === 403) throw new Error('NFLSOJ 无权访问（403），请更新账号权限')
  if (r.status === 404) throw new Error(`NFLSOJ 页面不存在（404）: ${path}`)
  if (r.status >= 400) throw new Error(`NFLSOJ 请求失败，HTTP ${r.status}`)
  return r.data
}

/** 二进制下载（用于附加文件）, 返回 { buffer: Buffer, filename: string } */
async function nflsojGetBinary(path) {
  const cookies = await getNflsojSession()
  const r = await axios.get(NFLSOJ_BASE + path, {
    headers: nflsojHeaders(cookies),
    responseType: 'arraybuffer',
    validateStatus: s => s < 600,
    timeout: 30000
  })
  if (r.status === 403) throw new Error('NFLSOJ 无权下载附加文件（403）')
  if (r.status === 404) throw new Error('NFLSOJ 附加文件不存在（404）')
  if (r.status >= 400) throw new Error(`NFLSOJ 下载失败，HTTP ${r.status}`)

  // 尝试从 Content-Disposition 解析文件名
  const cd = r.headers['content-disposition'] || ''
  let filename = 'additional_file.zip'
  const fnMatch = cd.match(/filename\*?=(?:UTF-8'')?"?([^"\s;]+)"?/i)
  if (fnMatch) filename = decodeURIComponent(fnMatch[1])

  return { buffer: Buffer.from(r.data), filename }
}

// ─── URL 解析 ─────────────────────────────────────────────────────────────────

/**
 * 从比赛 URL 中提取 contestId
 * 支持:
 *   http://nflsoi.cc:20035/contest/2341
 *   http://nflsoi.cc:20035/contest/2341/problems
 */
function parseNflsojContestId(url) {
  const m = url.match(/\/contest\/(\d+)/)
  return m ? m[1] : null
}

/**
 * 从题目 URL 中提取 contestId + problemNumber
 * 支持:
 *   http://nflsoi.cc:20035/contest/2341/problem/1
 */
function parseNflsojProblemIds(url) {
  const m = url.match(/\/contest\/(\d+)\/problem\/(\d+)/)
  return m ? { contestId: m[1], problemNumber: m[2] } : null
}

// ─── 代码提取（从提交详情页的 HTML 中）────────────────────────────────────────

/**
 * 从 SYZOJ 提交页面 HTML 提取源代码
 * SYZOJ 将 source-highlight 渲染后的代码嵌入 JS 变量：
 *   let unformattedCode = "...html...";
 * 去掉 HTML tags 后即为纯代码文本。
 */
function extractCodeFromSubmissionHtml(html) {
  const m = html.match(/(?:let|const|var)\s+unformattedCode\s*=\s*"((?:[^"\\]|\\.)*)"\s*;/)
  if (!m) return null
  try {
    const rawHtml = JSON.parse('"' + m[1] + '"')
    let code = rawHtml
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')

    // 去掉文件重定向（NFLSOJ 题目通常要求 freopen，但教学时不需要）
    code = code.replace(/^[ \t]*freopen\b[^\n]*;[ \t]*\r?\n?/gm, '')

    return code
  } catch {
    return null
  }
}

// ─── 题目内容解析（cheerio）───────────────────────────────────────────────────

/**
 * 从 MathJax 3 的 <mjx-container> 或 <svg> 元素中提取原始 LaTeX 字符串
 * 尝试顺序：aria-label → data-tex → svg>title → null
 */
function extractLatexFromMjx($el) {
  const label = $el.attr('aria-label')
  if (label && label.trim()) return label.trim()
  const dataTex = $el.attr('data-tex') || $el.attr('data-original-expression')
  if (dataTex && dataTex.trim()) return dataTex.trim()
  const svgTitle = $el.find('svg > title').first().text().trim()
  if (svgTitle) return svgTitle
  const script = $el.next('script[type*="math/tex"]').text().trim()
  if (script) return script
  return null
}

// Unicode code point → LaTeX 符号映射表
const MML_CHAR_MAP = {
  0x2026: '\\ldots', 0x22EF: '\\cdots', 0x22EE: '\\vdots', 0x22F1: '\\ddots',
  0x00D7: '\\times', 0x00F7: '\\div', 0x00B1: '\\pm', 0x2213: '\\mp',
  0x2264: '\\le', 0x2265: '\\ge', 0x2260: '\\ne', 0x226A: '\\ll', 0x226B: '\\gg',
  0x221E: '\\infty', 0x2205: '\\emptyset', 0x2202: '\\partial', 0x2207: '\\nabla',
  0x2211: '\\sum', 0x220F: '\\prod', 0x222B: '\\int', 0x222C: '\\iint', 0x222D: '\\iiint',
  0x221A: '\\sqrt', 0x2308: '\\lceil', 0x2309: '\\rceil', 0x230A: '\\lfloor', 0x230B: '\\rfloor',
  0x2208: '\\in', 0x2209: '\\notin', 0x2282: '\\subset', 0x2283: '\\supset',
  0x2286: '\\subseteq', 0x2287: '\\supseteq', 0x222A: '\\cup', 0x2229: '\\cap',
  0x2200: '\\forall', 0x2203: '\\exists', 0x00B7: '\\cdot', 0x2218: '\\circ',
  0x2192: '\\to', 0x21D2: '\\Rightarrow', 0x21D4: '\\Leftrightarrow',
  0x2190: '\\leftarrow', 0x21D0: '\\Leftarrow', 0x2194: '\\leftrightarrow',
  0x2234: '\\therefore', 0x2235: '\\because',
  0x2016: '\\|', 0x2223: '\\mid', 0x2225: '\\parallel', 0x22A5: '\\perp',
  0x22C5: '\\cdot', 0x22C6: '\\star', 0x22C0: '\\bigwedge', 0x22C1: '\\bigvee',
  0x2227: '\\land', 0x2228: '\\lor', 0x00AC: '\\lnot',
  0x03B1: '\\alpha', 0x03B2: '\\beta', 0x03B3: '\\gamma', 0x03B4: '\\delta',
  0x03B5: '\\epsilon', 0x03B6: '\\zeta', 0x03B7: '\\eta', 0x03B8: '\\theta',
  0x03B9: '\\iota', 0x03BA: '\\kappa', 0x03BB: '\\lambda', 0x03BC: '\\mu',
  0x03BD: '\\nu', 0x03BE: '\\xi', 0x03C0: '\\pi', 0x03C1: '\\rho',
  0x03C3: '\\sigma', 0x03C4: '\\tau', 0x03C5: '\\upsilon', 0x03C6: '\\varphi',
  0x03C7: '\\chi', 0x03C8: '\\psi', 0x03C9: '\\omega',
  0x0393: '\\Gamma', 0x0394: '\\Delta', 0x0398: '\\Theta', 0x039B: '\\Lambda',
  0x039E: '\\Xi', 0x03A0: '\\Pi', 0x03A3: '\\Sigma', 0x03A5: '\\Upsilon',
  0x03A6: '\\Phi', 0x03A8: '\\Psi', 0x03A9: '\\Omega',
  0x2113: '\\ell', 0x210F: '\\hbar', 0x2118: '\\wp', 0x211C: '\\Re', 0x2111: '\\Im',
  0x2135: '\\aleph', 0x2252: '\\fallingdotseq',
}

/**
 * 将单个 data-c 十六进制码点解码为 LaTeX 字符串
 */
function decodeDataC(hex) {
  if (!hex) return ''
  const cp = parseInt(hex, 16)
  if (isNaN(cp)) return ''

  // 优先查符号表
  if (MML_CHAR_MAP[cp]) return MML_CHAR_MAP[cp]

  // 数学斜体小写 a-z: U+1D44E–U+1D467
  if (cp >= 0x1D44E && cp <= 0x1D467) return String.fromCharCode(cp - 0x1D44E + 97)
  // 数学斜体大写 A-Z: U+1D434–U+1D44D
  if (cp >= 0x1D434 && cp <= 0x1D44D) return String.fromCharCode(cp - 0x1D434 + 65)
  // 数学粗体斜体小写: U+1D482–U+1D49B
  if (cp >= 0x1D482 && cp <= 0x1D49B) return String.fromCharCode(cp - 0x1D482 + 97)
  // 数学粗体斜体大写: U+1D468–U+1D481
  if (cp >= 0x1D468 && cp <= 0x1D481) return String.fromCharCode(cp - 0x1D468 + 65)
  // 数学无衬线: U+1D5BA–U+1D5D3 小写
  if (cp >= 0x1D5BA && cp <= 0x1D5D3) return String.fromCharCode(cp - 0x1D5BA + 97)
  // 数学无衬线: U+1D5A0–U+1D5B9 大写
  if (cp >= 0x1D5A0 && cp <= 0x1D5B9) return String.fromCharCode(cp - 0x1D5A0 + 65)
  // 数学花体大写: U+1D49C–U+1D4B5
  if (cp >= 0x1D49C && cp <= 0x1D4B5) return String.fromCharCode(cp - 0x1D49C + 65)
  // 数学双线体大写: U+1D538–U+1D551
  if (cp >= 0x1D538 && cp <= 0x1D551) return String.fromCharCode(cp - 0x1D538 + 65)

  // 普通 ASCII 可显示字符
  if (cp >= 0x20 && cp <= 0x7E) return String.fromCharCode(cp)

  // 其余直接转 Unicode 字符
  return String.fromCharCode(cp)
}

/**
 * 递归解码 SVG 中的 MathJax MML 节点树，输出 LaTeX 字符串（尽力还原）
 * @param {CheerioElement} el  - 当前 g 元素
 * @param {CheerioAPI} $
 * @returns {string}
 */
function decodeMmlNode(el, $) {
  const $el = $(el)
  const node = $el.attr('data-mml-node')

  // 直接渲染叶子：mi / mn / mo / mtext — 读所有 use[data-c]
  if (!node || node === 'mi' || node === 'mn' || node === 'mo' || node === 'mtext') {
    const chars = []
    $el.children('use[data-c]').each((_, u) => chars.push(decodeDataC($(u).attr('data-c'))))
    // 如果自身无 use，可能是纯容器，递归子 g
    if (chars.length > 0) return chars.join('')
    return decodeMmlChildren(el, $)
  }

  if (node === 'math' || node === 'mrow' || node === 'mstyle' || node === 'mpadded' || node === 'mphantom') {
    return decodeMmlChildren(el, $)
  }

  if (node === 'msub') {
    const ch = getMmlChildrenArr(el, $)
    if (ch.length < 2) return decodeMmlChildren(el, $)
    return ch[0] + '_{' + ch[1] + '}'
  }
  if (node === 'msup') {
    const ch = getMmlChildrenArr(el, $)
    if (ch.length < 2) return decodeMmlChildren(el, $)
    return ch[0] + '^{' + ch[1] + '}'
  }
  if (node === 'msubsup') {
    const ch = getMmlChildrenArr(el, $)
    if (ch.length < 3) return decodeMmlChildren(el, $)
    return ch[0] + '_{' + ch[1] + '}^{' + ch[2] + '}'
  }
  if (node === 'mfrac') {
    const ch = getMmlChildrenArr(el, $)
    if (ch.length < 2) return decodeMmlChildren(el, $)
    return '\\frac{' + ch[0] + '}{' + ch[1] + '}'
  }
  if (node === 'msqrt') {
    return '\\sqrt{' + decodeMmlChildren(el, $) + '}'
  }
  if (node === 'mroot') {
    const ch = getMmlChildrenArr(el, $)
    if (ch.length < 2) return decodeMmlChildren(el, $)
    return '\\sqrt[' + ch[1] + ']{' + ch[0] + '}'
  }
  if (node === 'mover') {
    const ch = getMmlChildrenArr(el, $)
    if (ch.length < 2) return decodeMmlChildren(el, $)
    // 常见 accent 映射
    const ACC = { '\\cdot': '\\dot', '−': '\\bar', '∼': '\\tilde', '∧': '\\hat', '⃗': '\\vec' }
    const acc = ACC[ch[1]] || '\\overset{' + ch[1] + '}'
    if (ACC[ch[1]]) return acc + '{' + ch[0] + '}'
    return '\\overset{' + ch[1] + '}{' + ch[0] + '}'
  }
  if (node === 'munder') {
    const ch = getMmlChildrenArr(el, $)
    if (ch.length < 2) return decodeMmlChildren(el, $)
    return '\\underset{' + ch[1] + '}{' + ch[0] + '}'
  }
  if (node === 'munderover') {
    const ch = getMmlChildrenArr(el, $)
    if (ch.length < 3) return decodeMmlChildren(el, $)
    return ch[0] + '_{' + ch[1] + '}^{' + ch[2] + '}'
  }
  if (node === 'mfenced' || node === 'mo') {
    return decodeMmlChildren(el, $)
  }
  if (node === 'mtable') {
    const rows = []
    $el.children('g[data-mml-node="mtr"]').each((_, tr) => {
      const cols = []
      $(tr).children('g[data-mml-node="mtd"]').each((_, td) => cols.push(decodeMmlChildren(td, $)))
      rows.push(cols.join(' & '))
    })
    return '\\begin{matrix}' + rows.join(' \\\\ ') + '\\end{matrix}'
  }

  // 其余节点：直接递归子节点
  return decodeMmlChildren(el, $)
}

/** 获取 MML 直接子节点（data-mml-node 的 g 子元素）的解码结果数组 */
function getMmlChildrenArr(el, $) {
  const results = []
  $(el).children('g[data-mml-node]').each((_, child) => results.push(decodeMmlNode(child, $)))
  return results
}

/** 将所有 MML 子节点拼接为字符串 */
function decodeMmlChildren(el, $) {
  return getMmlChildrenArr(el, $).join('')
}

/**
 * 从 MathJax 3 SVG 中解码公式文本
 * 找到 g[data-mml-node="math"] 根节点，递归解码
 */
function decodeSvgFormula($svg, $) {
  const $math = $svg.find('g[data-mml-node="math"]').first()
  if (!$math.length) return null
  const result = decodeMmlNode($math[0], $)
  return result && result.trim() ? result.trim() : null
}

/**
 * 将 SYZOJ 题目页面的 HTML 转换为 Markdown
 * 主要内容在 class 包含 "font-content" 的 div 中
 */
function parseProblemContent($) {
  // 主内容容器：SYZOJ 渲染的题目 HTML 在 .font-content 里
  let $content = $('.font-content').first()
  if (!$content.length) $content = $('[class*="content"]').first()

  if (!$content.length) return ''

  let md = ''

  // 遍历子节点
  function processNode(el) {
    const tag = el.tagName?.toLowerCase()
    const $el = $(el)

    if (el.type === 'text') {
      return el.data || ''
    }

    // MathJax 3 容器 <mjx-container>：内含 SVG，原始 LaTeX 一般在 aria-label
    if (tag === 'mjx-container') {
      const isDisplay = $el.attr('display') === 'true' || $el.hasClass('MJX-TEX-DISPLAY')
      const latex = extractLatexFromMjx($el)
      if (latex) return isDisplay ? `\n$$${latex}$$\n` : `$${latex}$`
      // 回退：从内部 SVG 的 data-c 属性解码公式字符
      const $svg = $el.find('svg[role="img"]').first()
      const decoded = $svg.length ? decodeSvgFormula($svg, $) : null
      if (decoded) return isDisplay ? `\n$$${decoded}$$\n` : `$${decoded}$`
      return isDisplay ? '\n$$[公式]$$\n' : '$[公式]$'
    }

    // SVG 数学公式（直接出现，不在 mjx-container 里的情况）
    if (tag === 'svg' && $el.attr('role') === 'img') {
      // 方式1：SVG 内的 <title>（部分 MathJax 版本会加）
      const svgTitle = $el.children('title').first().text().trim()
      if (svgTitle) return `$${svgTitle}$`
      // 方式2：父元素的 aria-label
      const parentLabel = $el.parent().attr('aria-label')
      if (parentLabel) return `$${parentLabel}$`
      // 方式3：从 data-c 属性解码 MML 节点树
      const decoded = decodeSvgFormula($el, $)
      if (decoded) return `$${decoded}$`
      return '$[公式]$'
    }

    // 段落
    if (tag === 'p') {
      const text = processChildren(el)
      return text.trim() ? text.trim() + '\n\n' : ''
    }

    // 标题
    if (tag === 'h1') return `# ${processChildren(el).trim()}\n\n`
    if (tag === 'h2') return `## ${processChildren(el).trim()}\n\n`
    if (tag === 'h3') return `### ${processChildren(el).trim()}\n\n`
    if (tag === 'h4') return `#### ${processChildren(el).trim()}\n\n`

    // 代码块（样例输入/输出）
    if (tag === 'pre') {
      const codeText = $el.text()
      return '```\n' + codeText + '\n```\n\n'
    }

    // 行内代码
    if (tag === 'code') return '`' + $el.text() + '`'

    // 强调
    if (tag === 'strong' || tag === 'b') return '**' + processChildren(el) + '**'
    if (tag === 'em' || tag === 'i') return '*' + processChildren(el) + '*'

    // 列表
    if (tag === 'ul') {
      let s = ''
      $el.children('li').each((_, li) => { s += `- ${processChildren(li).trim()}\n` })
      return s + '\n'
    }
    if (tag === 'ol') {
      let s = ''
      $el.children('li').each((i, li) => { s += `${i + 1}. ${processChildren(li).trim()}\n` })
      return s + '\n'
    }

    // 表格
    if (tag === 'table') {
      let s = ''
      $el.find('tr').each((i, tr) => {
        const cells = []
        $(tr).find('td, th').each((_, td) => cells.push(processChildren(td).trim().replace(/\n/g, ' ')))
        s += '| ' + cells.join(' | ') + ' |\n'
        if (i === 0) s += '| ' + cells.map(() => '---').join(' | ') + ' |\n'
      })
      return s + '\n'
    }

    // 线
    if (tag === 'hr') return '---\n\n'

    // 换行
    if (tag === 'br') return '\n'

    // img
    if (tag === 'img') {
      const src = $el.attr('src') || ''
      const alt = $el.attr('alt') || ''
      if (!src) return ''
      const fullSrc = src.startsWith('//') ? 'http:' + src : src.startsWith('/') ? NFLSOJ_BASE + src : src
      return `\n![${alt}](${fullSrc})\n`
    }

    // div/span/section 等容器：递归处理子节点
    return processChildren(el)
  }

  function processChildren(el) {
    let s = ''
    $(el).contents().each((_, child) => { s += processNode(child) })
    return s
  }

  md = processChildren($content[0])

  // 清理多余空行
  return md.replace(/\n{3,}/g, '\n\n').trim()
}

// ─── 图片代理：下载 NFLSOJ 图片（需要 session）并上传 COS ────────────────────────

/**
 * 将 markdown 中所有 NFLSOJ 域名的图片下载（带 session cookie）并上传 COS，替换为 COS URL
 * 失败时保留原链接
 */
async function replaceNflsojImages(markdown) {
  // 匹配 ![alt](http://nflsoi.cc:20035/...)
  const imgRe = /!\[([^\]]*)\]\((https?:\/\/nflsoi\.cc:[\d]+\/[^)]+)\)/g
  const matches = []
  let m
  while ((m = imgRe.exec(markdown)) !== null) {
    matches.push({ full: m[0], alt: m[1], src: m[2] })
  }
  if (!matches.length) return markdown

  let result = markdown
  for (const { full, alt, src } of matches) {
    try {
      // 从 URL 中提取路径部分（去掉 base）
      const urlPath = src.replace(/^https?:\/\/nflsoi\.cc:\d+/, '')
      const { buffer } = await nflsojGetBinary(urlPath)
      const ext = path.extname(urlPath.split('?')[0]) || '.png'
      const fileName = `nflsoj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`
      const cosUrl = await uploadImageToCos(buffer, fileName)
      if (cosUrl) {
        result = result.replace(full, `![${alt}](${cosUrl})`)
        console.log(`[nflsoj] 图片已上传 COS: ${src} → ${cosUrl}`)
      }
    } catch (e) {
      console.warn(`[nflsoj] 图片上传跳过: ${src}`, e.message)
    }
  }
  return result
}

// ─── 核心抓取函数 ─────────────────────────────────────────────────────────────

/**
 * 抓取 NFLSOJ 比赛信息和题目列表
 */
export async function fetchNflsojContest(url) {
  const contestId = parseNflsojContestId(url)
  if (!contestId) throw new Error('无法从 URL 中解析 NFLSOJ 比赛 ID')

  const html = await nflsojGet(`/contest/${contestId}`)

  // 提取比赛标题："S+图论综合 - 比赛 - NFLSOJ" → "S+图论综合"
  const titleMatch = html.match(/<title>([^<]+)<\/title>/)
  const rawTitle = titleMatch?.[1]?.trim() || ''
  const contestTitle = rawTitle.split(' - ')[0]?.trim() || `NFLSOJ-${contestId}`

  // 提取题目链接和名称
  const problemMap = new Map()
  const linkRe = /href="(\/contest\/\d+\/problem\/(\d+))"[^>]*>([^<]+)<\/a>/g
  let m
  while ((m = linkRe.exec(html)) !== null) {
    const problemNumber = m[2]
    const label = m[3].trim()
    if (!problemMap.has(problemNumber)) {
      problemMap.set(problemNumber, {
        label,
        title: label,
        url: `${NFLSOJ_BASE}/contest/${contestId}/problem/${problemNumber}`,
        problemNumber,
      })
    }
  }

  const problems = [...problemMap.values()].sort((a, b) => Number(a.problemNumber) - Number(b.problemNumber))

  if (problems.length === 0) throw new Error('未找到题目列表，比赛可能不存在或无权访问')

  return {
    contestId,
    contestTitle,
    problems,
    url: `${NFLSOJ_BASE}/contest/${contestId}`,
  }
}

/**
 * 抓取 NFLSOJ 题目完整内容（含标题、题面文字、样例）
 */
export async function fetchNflsojProblem(url) {
  const ids = parseNflsojProblemIds(url)
  if (!ids) throw new Error('无法从 URL 中解析 NFLSOJ 题目地址，格式应为 /contest/:id/problem/:n')
  const { contestId, problemNumber } = ids

  const html = await nflsojGet(`/contest/${contestId}/problem/${problemNumber}`)
  const $ = load(html)

  // 提取题目标题：优先从页面 DOM 中取题目名，回退到 <title> 第一段
  const domTitle =
    $('h1.problem-title, .problem-title, h2.problem-title').first().text().trim() ||
    $('h2').not('.font-content h2').first().text().trim()
  const pageTitle = $('title').text().trim()
  const title = domTitle || pageTitle.split(' - ')[0].trim() || `题目 ${problemNumber}`

  // 提取正文内容
  let content = parseProblemContent($)

  // 获取 AC 代码（失败不影响题目返回）
  // 替换题面中 NFLSOJ 域名图片为 COS 链接（避免浏览器因 session 限制无法加载）
  try {
    content = await replaceNflsojImages(content)
  } catch (e) {
    console.warn('[nflsoj] 图片替换失败，跳过:', e.message)
  }

  let acCode = ''
  try {
    acCode = await fetchNflsojAcCode(contestId, problemNumber) || ''
  } catch (e) {
    console.warn(`[nflsoj] AC code skipped for ${contestId}/${problemNumber}:`, e.message)
  }

  // 检测并下载附加文件（如 testdata zip）
  let additionalFile = null
  try {
    // SYZOJ 附加文件链接格式: href="/problem/:id/download/additional_file"
    const addLink = $('a[href*="/download/additional_file"]').first().attr('href')
    if (addLink) {
      const { buffer, filename } = await nflsojGetBinary(addLink)
      additionalFile = {
        filename,
        base64: buffer.toString('base64'),
        size: buffer.length
      }
      console.log(`[nflsoj] 附加文件下载成功: ${filename} (${buffer.length} bytes)`)
    }
  } catch (e) {
    console.warn(`[nflsoj] 附加文件下载跳过 for ${contestId}/${problemNumber}:`, e.message)
  }

  return {
    title,
    content,
    url: `${NFLSOJ_BASE}/contest/${contestId}/problem/${problemNumber}`,
    contestId,
    problemNumber,
    acCode,
    additionalFile,
  }
}

/**
 * 从排行榜页面提取 AC 代码（首选方式）
 * SYZOJ 排行榜嵌入 const ranklist = [...]; 每条含每题最佳提交 ID
 */
async function fetchNflsojAcCodeFromRanklist(contestId, problemNumber) {
  const html = await nflsojGet(`/contest/${contestId}/ranklist`)

  // 尝试多种 SYZOJ 版本的嵌入格式
  const rankMatch = html.match(/const\s+ranklist\s*=\s*(\[[\s\S]*?\])\s*;/)
  if (!rankMatch) return null

  let ranklist
  try { ranklist = JSON.parse(rankMatch[1]) } catch { return null }
  if (!Array.isArray(ranklist) || !ranklist.length) return null

  const probKey = String(problemNumber)

  // 收集所有满分（100分）提交 ID，优先 C++
  const candidates = []
  for (const entry of ranklist) {
    // SYZOJ 不同版本的字段名略有差异，兼容处理
    const details = (
      entry.score?.details ||
      entry.problemStatus ||
      entry.problems ||
      (entry.detail && entry.detail[probKey] !== undefined ? entry.detail : null) ||
      {}
    )
    const prob = details[probKey]
    if (!prob) continue
    const score = prob.score ?? prob.totalScore ?? prob.result
    const subId = prob.submissionId || prob.submission_id || prob.id
    if (score === 100 && subId) {
      candidates.push({ subId, language: prob.language || '' })
    }
  }

  if (!candidates.length) return null

  // 优先 C++
  candidates.sort((a, b) => {
    const aC = /[Cc]\+\+|cpp/i.test(a.language) ? -1 : 1
    const bC = /[Cc]\+\+|cpp/i.test(b.language) ? -1 : 1
    return aC - bC
  })

  for (const { subId } of candidates.slice(0, 3)) {
    try {
      const subHtml = await nflsojGet(`/submission/${subId}`)
      const code = extractCodeFromSubmissionHtml(subHtml)
      if (code) return code
    } catch { /* 单条失败继续下一条 */ }
  }
  return null
}

/**
 * 抓取 NFLSOJ 某道题目的一道 AC 代码（优先 C++）
 * 先尝试排行榜，再尝试提交列表页
 * @param {string} contestId
 * @param {string} problemNumber  题目在比赛中的序号（1-indexed）
 * @returns {string|null} 源代码字符串，或 null
 */
export async function fetchNflsojAcCode(contestId, problemNumber) {
  // ── 方式一：从排行榜提取（无需查看他人提交权限）
  try {
    const code = await fetchNflsojAcCodeFromRanklist(contestId, problemNumber)
    if (code) return code
  } catch (e) {
    console.warn('[nflsoj] ranklist AC code failed, falling back to submissions:', e.message)
  }

  // ── 方式二：从提交列表页提取（需有查看权限）
  const listHtml = await nflsojGet(`/contest/${contestId}/submissions?problem_id=${problemNumber}&status=Accepted`)
  const itemMatch = listHtml.match(/const itemList = (\[[\s\S]*?\]);/)
  if (!itemMatch) throw new Error('NFLSOJ：无法解析提交列表（itemList）')

  let items
  try { items = JSON.parse(itemMatch[1]) } catch { throw new Error('NFLSOJ：提交列表 JSON 解析失败') }

  if (!items.length) return null

  // 优先选 C++ 提交
  const sorted = [...items].sort((a, b) => {
    const aIsCpp = /[Cc]\+\+|cpp/i.test(a.info.language || '')
    const bIsCpp = /[Cc]\+\+|cpp/i.test(b.info.language || '')
    if (aIsCpp && !bIsCpp) return -1
    if (!aIsCpp && bIsCpp) return 1
    return 0
  })

  const subId = sorted[0].info.submissionId
  const subHtml = await nflsojGet(`/submission/${subId}`)
  const code = extractCodeFromSubmissionHtml(subHtml)
  if (!code) throw new Error(`NFLSOJ：无法从提交 #${subId} 页面提取代码`)
  return code
}

// ─── 路由 ─────────────────────────────────────────────────────────────────────

/** GET /api/nflsoj/contest?url=... */
router.get('/contest', authenticateToken, async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: '缺少 url 参数' })
  if (!/nflsoi\.cc/i.test(url)) return res.status(400).json({ error: '仅支持 nflsoi.cc 链接' })

  try {
    return res.json(await fetchNflsojContest(url))
  } catch (err) {
    console.error('[nflsoj] contest fetch error:', err.message)
    res.status(500).json({ error: `抓取失败: ${err.message}` })
  }
})

/** GET /api/nflsoj/problem?url=... */
router.get('/problem', authenticateToken, async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: '缺少 url 参数' })
  if (!/nflsoi\.cc/i.test(url)) return res.status(400).json({ error: '仅支持 nflsoi.cc 链接' })

  try {
    return res.json(await fetchNflsojProblem(url))
  } catch (err) {
    console.error('[nflsoj] problem fetch error:', err.message)
    res.status(500).json({ error: `抓取题目失败: ${err.message}` })
  }
})

/** GET /api/nflsoj/ac-code?contestId=2341&problemNumber=1 */
router.get('/ac-code', authenticateToken, async (req, res) => {
  const { contestId, problemNumber } = req.query
  if (!contestId || !problemNumber) return res.status(400).json({ error: '缺少 contestId 或 problemNumber 参数' })

  try {
    const code = await fetchNflsojAcCode(contestId, problemNumber)
    if (!code) return res.status(404).json({ error: '未找到 AC 提交' })
    return res.json({ code })
  } catch (err) {
    console.error('[nflsoj] ac-code fetch error:', err.message)
    res.status(500).json({ error: `抓取代码失败: ${err.message}` })
  }
})

/** GET /api/nflsoj/status — 检查 session 是否有效 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const cookies = await getNflsojSession()
    res.json({ ok: true, user: NFLSOJ_USER, expiresAt: new Date(sessionExpireAt).toISOString() })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

export default router
