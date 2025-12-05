import express from 'express'
import cors from 'cors'
import axios from 'axios'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import nodemailer from 'nodemailer'
import cron from 'node-cron'

// 确保从 server 目录下的 .env 加载（当以项目根为 cwd 启动时）
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '.env') })

// 调试输出，确认是否读取到 API key（不打印密钥本身）
const DEBUG_LOG = (process.env.DEBUG_LOG === '1' || process.env.DEBUG === 'true')
function debugLog(...args) {
  if (DEBUG_LOG) console.log('[debug]', ...args)
}

if (process.env.YUN_API_KEY) debugLog('YUN_API_KEY loaded: [REDACTED]')
else debugLog('YUN_API_KEY not found in server/.env')

const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json({ limit: '5mb' }))

// --- Usage logging ---
const LOGS_DIR = path.join(__dirname, 'logs')
async function ensureLogsDir() {
  try { await fs.promises.mkdir(LOGS_DIR, { recursive: true }) } catch {}
}

function nowISO() { return new Date().toISOString() }

async function appendUsageLog(entry) {
  try {
    await ensureLogsDir()
    const date = new Date()
    const fname = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}.log`
    const file = path.join(LOGS_DIR, fname)
    await fs.promises.appendFile(file, JSON.stringify(entry) + '\n', 'utf8')
  } catch (e) {
    debugLog('appendUsageLog failed', e)
  }
}

// 中间件：记录所有 API 使用情况
app.use(async (req, res, next) => {
  const start = Date.now()
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
  const ua = req.headers['user-agent'] || ''
  const method = req.method
  const pathName = req.path
  // 仅记录 /api/* 路径
  const shouldLog = pathName && pathName.startsWith('/api/')
  if (!shouldLog) return next()

  const chunks = []
  const origJson = res.json.bind(res)
  res.json = (body) => {
    try { chunks.push(body) } catch {}
    return origJson(body)
  }

  res.on('finish', async () => {
    try {
      const durationMs = Date.now() - start
      let status = res.statusCode
      let model = undefined
      try {
        // 尝试从请求体提取 model 字段
        if (req.body && typeof req.body === 'object') model = req.body.model
      } catch {}
      // 序列化请求/响应内容（限制长度，避免日志过大）
      const bodyText = (() => {
        try {
          const b = req.body
          const s = typeof b === 'string' ? b : JSON.stringify(b)
          return (s || '').slice(0, 5000)
        } catch { return '' }
      })()
      const respText = (() => {
        try {
          const c = chunks.length ? chunks[chunks.length - 1] : null
          const s = typeof c === 'string' ? c : JSON.stringify(c)
          return (s || '').slice(0, 5000)
        } catch { return '' }
      })()

      const entry = {
        ts: nowISO(),
        method,
        path: pathName,
        status,
        ip,
        ua,
        duration_ms: durationMs,
        model: model || null,
        req_body: bodyText,
        res_body: respText
      }
      await appendUsageLog(entry)
    } catch (e) { debugLog('log finish failed', e) }
  })

  next()
})

// sessions storage directory
const SESSIONS_DIR = path.join(__dirname, 'sessions')
async function ensureSessionsDir() {
  try {
    await fs.promises.mkdir(SESSIONS_DIR, { recursive: true })
  } catch (e) {
    // ignore
  }
}

async function saveSession(sessionId, messages) {
  if (!sessionId) return
  try {
    await ensureSessionsDir()
    const file = path.join(SESSIONS_DIR, `${sessionId}.json`)
    await fs.promises.writeFile(file, JSON.stringify(messages || [], null, 2), 'utf8')
  } catch (e) {
    debugLog('saveSession error', e)
  }
}

async function loadSession(sessionId) {
  try {
    const file = path.join(SESSIONS_DIR, `${sessionId}.json`)
    const txt = await fs.promises.readFile(file, 'utf8')
    return JSON.parse(txt)
  } catch (e) {
    return []
  }
}

async function clearSession(sessionId) {
  try {
    const file = path.join(SESSIONS_DIR, `${sessionId}.json`)
    await fs.promises.unlink(file)
  } catch (e) {
    // ignore
  }
}

// 系统提示（从你提供的 desktop 模板转换为 web 后端使用）
const SYSTEM_PROMPT = `你是一个专业的算法题目翻译器，专门修改题目。请将题目准确地翻译成中文，并按照以下要求进行格式化和内容替换：

【语言要求：必须使用简体中文输出】
- 所有输出内容均为简体中文，不得出现日文、英文或其他语言。
- 若原题或示例代码中包含非中文文本，需将叙述性文字与注释翻译为中文；代码的标识符可保留原样，不强制改动。

1. 角色替换规则：
   - 面条老师 → 大魏
   - 青橙老师 → 潇潇
   - 姜饼老师 → 大马
   - 雪球老师 → 卡卡
   - 麋鹿老师 → 妙妙
   - Takahashi → kunkka
   - Aoki → Elsa
   - 小Z → 聪聪
   - 其他老师角色 → 根据性别和特征选择岐岐或麦麦或妙妙或璨璨

2. 内容处理：
   - 完全去掉题干中所有"核桃"相关的内容和描述
   - 将题目中的 atcoder 修改为 acjudge
   - 保持原题目的数学逻辑和算法要求不变
   - 保持题目的难度和复杂度不变
   - 保持题干内容不变, 不要增加过多的解释
   - 无需给出复杂度等信息
   - 无需给出解决此题的提示
   - **不要添加原题链接、题目来源、题目编号等额外信息**

3. 公式格式：
   - 所有数学公式必须使用LaTeX格式
   - 行内公式使用单个 $ 包裹, 尽量使用 ($...$) 包裹, 只有长公式的时候才使用 ($$...$$)包裹
   - 将原有的 \\( \\) \\[ \\] 等格式统一转换为 $ 格式, 

  - **严格要求**：模型在输出中必须使用美元符号来包裹公式（行内使用 $...$，块级使用 $$...$$）。如果输出中没有使用美元符号，请仍然以美元符号形式返回公式；不要删除或转义美元符号。

4. 输出格式如下:

    # 题目标题

    [提取或总结一个简洁、准确、有吸引力的中文题目标题，8-15字以内，要能体现题目的核心内容]

    ### 算法标签

    [根据题目的核心算法和解题思路，从下面的标签列表中选择1-3个最匹配的标签。必须从列表中选择，不要自己创造标签。]

    可选标签（按难度分级）：

    **Level1**: 顺序结构, 条件结构, 循环结构, 暴力枚举1, 数学1

    **Level2**: 数组, 函数, 字符串, 结构体, 排序, 模拟2, 暴力枚举2, 数学2, 二维数组

    **Level3**: STL, 暴力枚举3, 模拟3, 数学3, 贪心3, 思维3

    **Level4**: 递推, 递归, 前缀和, 差分, 二分, 三分, BFS, DFS, 双指针, 栈, 链表, 离散化, ST表, 贪心4, 数学4, 思维4, 优先队列

    **Level5**: DP, DP变形, 线性DP, 背包DP, 区间DP, BFS进阶, DFS进阶, 树形结构, 倍增, 反悔贪心, 哈希, KMP, 字典树, 并查集, 数学5, 思维5, 环, 搜索进阶, 树的直径

    **Level6**: 树状数组, 线段树, 概率DP, 期望DP, 单调队列优化DP, 数位DP, 状压DP, 树上DP, 换根DP, 单源最短路径, floyd, 差分约束, 最小生成树, AC自动机, 平衡树, 二分图, 博弈论, 分块, 莫队, 矩阵, 数学6, 思维6

    ## 题目背景

    [根据题目描述给出一个有趣的题目背景，去掉核桃相关内容]

    ## 题目描述

    [题目描述的翻译，替换角色并去掉核桃相关内容]
    题目中的公式块要用 \\$ 表达（行内用单个 \\$，块级用两个 \\$）

    ## 输入格式

    [输入格式]

    ## 输出格式

    [输出格式]

    ## 样例

    \`\`\`input1
    [样例输入]
    \`\`\`

    \`\`\`output1
    [样例输出]
    \`\`\`

    \`\`\`input2
    [样例输入]
    \`\`\`

    \`\`\`output2
    [样例输出]
    \`\`\`

    ### 样例解释

    [样例解释]

    ## 数据范围
    [数据范围的翻译]


**重要提醒**：
- 输出内容到"数据范围"部分后就结束，不要添加任何额外内容
- 不要添加原题链接、题目来源、题目编号、参考链接等信息
- 不要添加类似 [题目名称](链接) 的 Markdown 链接格式

输出格式请遵循 README 中的翻译模板（包含题目背景、题目描述、输入格式、输出格式、样例、样例解释、数据范围等）。保留算法复杂度表达如 $O(n)$ 等。
`

// 后端对模型返回的文本做保守的 LaTeX 包裹修正：
function wrapLatexIfNeeded(text) {
  if (!text || typeof text !== 'string') return text

  // 暂时抽离三重反引号 code block，避免误包裹
  const codeBlocks = []
  const placeholder = '___CODEBLOCK_'
  text = text.replace(/```[\s\S]*?```/g, (m) => {
    codeBlocks.push(m)
    return placeholder + (codeBlocks.length - 1) + '___'
  })

  // 如果文本中根本没有美元符号，且包含常见 LaTeX 控制序列，则将整体包为块级公式
  if (!text.includes('$')) {
    const latexPattern = /\\(?:frac|int|sum|sqrt|left|right|begin|end|pi|alpha|beta|gamma)\b|\^\{|\\\(|\\\)/
    if (latexPattern.test(text)) {
      text = `$$\n${text}\n$$`
    }
  }

  // 恢复 code blocks
  text = text.replace(new RegExp(placeholder + '(\\d+)___', 'g'), (_, idx) => codeBlocks[Number(idx)] || '')
  return text
}

app.post('/api/translate', async (req, res) => {
  try {
    const { text, model } = req.body
    if (!text) return res.status(400).json({ error: '缺少 text 字段' })

    const apiUrl = process.env.YUN_API_URL || 'https://yunwu.ai/v1/chat/completions'
    const apiKey = process.env.YUN_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'Server: missing YUN_API_KEY in environment' })

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: text }
    ]

    const payload = {
      model: model || 'o4-mini',
      messages,
      temperature: 0.1,
      max_tokens: 32767
    }

    const resp = await axios.post(apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 600000
    })

    // 兼容 yunwu.ai / chat completions 返回结构
    const data = resp.data
    let content = ''
    try {
      if (data.choices && data.choices[0] && data.choices[0].message) {
        content = data.choices[0].message.content
      } else if (data.choices && data.choices[0] && data.choices[0].text) {
        content = data.choices[0].text
      } else if (data.data && data.data[0] && data.data[0].text) {
        content = data.data[0].text
      } else {
        content = JSON.stringify(data)
      }
    } catch (e) {
      content = JSON.stringify(data)
    }

    // 做一些简单清理（保留服务端原始返回）
    try {
      const fixed = wrapLatexIfNeeded(content)
      return res.json({ result: fixed })
    } catch (e) {
      return res.json({ result: content })
    }
  } catch (err) {
    console.error('Translate error:', err?.response?.data || err.message || err)
    const message = err?.response?.data || err.message || 'unknown error'
    return res.status(500).json({ error: 'Translation failed', detail: message })
  }
})

// Solution 题解整理接口
app.post('/api/solution', async (req, res) => {
  try {
    const { text, model } = req.body
    if (!text) return res.status(400).json({ error: '缺少 text 字段' })

    const SOLUTION_PROMPT = `你是一个专业的题目解析翻译器，请根据题意和AC代码, 给出解题思路，并按照以下Markdown格式输出, 要注意的是markdown代码标记块 '\`\`\`' 后要换行再继续输出

  【语言要求：必须使用简体中文输出】
  - 全部内容（题意、思路、说明、注释等）均使用简体中文。
  - 若源代码中存在非中文的注释或输出文本，请翻译注释与说明为中文；保留代码的标识符与语法不变。

## 题意

[题意]

### 算法标签

[算法标签]

## 思路

[解题思路]

## 示例代码

\`\`\`cpp
[示例代码]
\`\`\`

请确保：

1. **所有数学公式、数字、符号必须使用美元符号包裹**：
   - 行内公式使用单个美元符号 ($...$)，例如 $O(n)$、$n^2$、$10^9$
   - 数组下标、变量、数学符号都要用美元符号，例如 $a[i]$、$n$、$k$、$\leq$、$\geq$
   - 数字范围、不等式等也要包裹，例如 $1 \leq n \leq 10^5$
   - 块级公式使用双美元符号 ($$...$$)
2. 保持题解原意
3. 专业术语翻译准确
4. 中文表达流畅自然
5. 代码块必须正确使用三个反引号包裹，且反引号后要换行
6. **严格要求**：模型在输出中必须使用美元符号来包裹所有公式、数字、变量和符号。如果输出中没有使用美元符号，请仍然以美元符号形式返回；不要删除或转义美元符号。`

    const apiUrl = process.env.YUN_API_URL || 'https://yunwu.ai/v1/chat/completions'
    const apiKey = process.env.YUN_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'Server: missing YUN_API_KEY in environment' })

    const messages = [
      { role: 'system', content: SOLUTION_PROMPT },
      { role: 'user', content: text }
    ]

    const payload = {
      model: model || 'o4-mini',
      messages,
      temperature: 0.5,
      max_tokens: 32767
    }

    const resp = await axios.post(apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 600000
    })

    const data = resp.data
    let content = ''
    try {
      if (data.choices && data.choices[0] && data.choices[0].message) {
        content = data.choices[0].message.content
      } else if (data.choices && data.choices[0] && data.choices[0].text) {
        content = data.choices[0].text
      } else if (data.data && data.data[0] && data.data[0].text) {
        content = data.data[0].text
      } else {
        content = JSON.stringify(data)
      }
    } catch (e) {
      content = JSON.stringify(data)
    }

    // 优化 Markdown 格式
    try {
      let fixed = content
      // 修正标题格式
      fixed = fixed.replace(/^#\s/gm, '## ')
      // 删除多余空行
      fixed = fixed.replace(/\n{3,}/g, '\n\n')
      // 确保代码块格式正确
      fixed = fixed.replace(/```\s*(\w+)/g, '```$1')
      
      return res.json({ result: fixed })
    } catch (e) {
      return res.json({ result: content })
    }
  } catch (err) {
    console.error('Solution error:', err?.response?.data || err.message || err)
    const message = err?.response?.data || err.message || 'unknown error'
    return res.status(500).json({ error: 'Solution generation failed', detail: message })
  }
})

// Checker 代码错误检查接口
app.post('/api/checker', async (req, res) => {
  try {
    const { text, model } = req.body
    if (!text) return res.status(400).json({ error: '缺少 text 字段' })

    const CHECKER_PROMPT = `你是一个专业的算法竞赛代码调试助手，帮助选手定位代码错误并给出修改建议，但不直接提供完整的正确代码。请根据题目和选手的代码生成报告，且**报告必须首先包含对题目的分析与选手提交代码的原文预览**，随后再进行学员代码的分析与问题定位。请严格按照以下 Markdown 结构输出：

## 题目与代码预览

**题目概述**：
[用 3-5 句总结题目核心要求与输入输出，必要的约束用 $...$ 包裹]

**选手代码（节选/关键片段）**：
\`\`\`cpp
[贴出关键片段或完整代码，确保反引号后换行]
\`\`\`

## 代码分析

[分析选手代码的整体逻辑和思路，指出与题意的匹配度]

## 发现的问题

### 问题 1: [问题标题]

**位置**: [指出具体在哪个函数/哪几行（或关键逻辑位置）]

**问题描述**: [详细说明这里有什么问题]

**为什么错误**: [解释为什么这样写会导致错误]

**修改建议**: [给出修改方向和提示，但不要直接写出完整代码]

### 问题 2: [如有其他问题]

...

## 测试样例

请提供 2-3 个简单的测试样例，帮助选手调试和验证修改：

### 样例 1

**输入**:
\`\`\`
[输入数据]
\`\`\`

**预期输出**:
\`\`\`
[正确的输出]
\`\`\`

**说明**: [这个样例可以暴露什么问题]

### 样例 2

...

## 调试思路

[给出调试的方向和步骤建议]

请确保：

1. **不要直接给出完整的正确代码**，只给出修改建议和提示
2. **必须提供 2-3 个能暴露代码问题的简单测试样例**，帮助选手验证和调试
3. **所有数学公式、数字、变量、符号必须使用美元符号包裹**：
   - 行内使用 ($...$)，例如 $O(n)$、$i$、$n$、$a[i]$
   - 数学符号用 $\leq$、$\geq$ 等
   - 范围用 $1 \leq n \leq 10^5$ 等格式
4. 指出错误位置要具体（哪个函数、哪几行、哪个逻辑）
5. 解释为什么会错，帮助选手理解问题本质
6. 给出修改方向和思路，让选手自己动手改
7. 如果有多个问题，按重要程度排序
8. **【重要】代码块格式严格要求**：
   - 三个反引号后**必须立即换行**，不能在反引号后直接跟内容
   - 正确格式示例：
     \`\`\`
     10
     \`\`\`
   - 错误格式（禁止）：\`\`\`10
   - 这条规则适用于所有代码块，包括输入、输出、代码片段
9. **严格要求**：必须使用美元符号包裹所有数学内容，不要删除或转义美元符号
10. **输出顺序要求**：先展示“题目与代码预览”板块，再进行“代码分析”“发现的问题”“测试样例”“调试思路”`

    const apiUrl = process.env.YUN_API_URL || 'https://yunwu.ai/v1/chat/completions'
    const apiKey = process.env.YUN_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'Server: missing YUN_API_KEY in environment' })

    const messages = [
      { role: 'system', content: CHECKER_PROMPT },
      { role: 'user', content: text }
    ]

    const payload = {
      model: model || 'o4-mini',
      messages,
      temperature: 0.3,
      max_tokens: 32767
    }

    const resp = await axios.post(apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 600000
    })

    const data = resp.data
    let content = ''
    try {
      if (data.choices && data.choices[0] && data.choices[0].message) {
        content = data.choices[0].message.content
      } else if (data.choices && data.choices[0] && data.choices[0].text) {
        content = data.choices[0].text
      } else if (data.data && data.data[0] && data.data[0].text) {
        content = data.data[0].text
      } else {
        content = JSON.stringify(data)
      }
    } catch (e) {
      content = JSON.stringify(data)
    }

    // 优化 Markdown 格式
    try {
      let fixed = content
      // 修正标题格式
      fixed = fixed.replace(/^#\s/gm, '## ')
      // 删除多余空行
      fixed = fixed.replace(/\n{3,}/g, '\n\n')
      // **修正代码块格式：确保 ``` 后换行**
      // 匹配 ```后直接跟非换行字符的情况，在中间插入换行
      fixed = fixed.replace(/```(\w*?)([^\n])/g, '```$1\n$2')
      
      return res.json({ result: fixed })
    } catch (e) {
      return res.json({ result: content })
    }
  } catch (err) {
    console.error('Checker error:', err?.response?.data || err.message || err)
    const message = err?.response?.data || err.message || 'unknown error'
    return res.status(500).json({ error: 'Code checking failed', detail: message })
  }
})

// Solve 生成AC代码接口
app.post('/api/solve', async (req, res) => {
  try {
    const { text, model, language } = req.body
    if (!text) return res.status(400).json({ error: '缺少 text 字段' })

    const lang = language || 'C++'
    const SOLVE_PROMPT = `你是一个专业的算法竞赛选手，请根据题目描述生成一个正确的 AC 代码。

请按照以下格式输出：

## 题意描述

[简易描述下题目和数据范围]

## 算法思路

[简要说明解题思路和算法]

## 时间复杂度

[时间复杂度分析，使用 LaTeX 格式如 $O(n)$]

## 代码实现

\`\`\`${lang.toLowerCase()}
[完整的可运行代码]
\`\`\`

请确保：

1. 代码必须是完整的，可以直接编译运行
2. 代码要包含必要的头文件/库导入
3. 代码要处理好输入输出
4. 代码要考虑边界情况
5. 代码风格要清晰规范，包含必要的注释
6. **所有数学公式必须用美元符号包裹**，例如 $O(n)$、$n^2$、$1 \leq n \leq 10^5$
7. 代码块必须在 \`\`\` 后换行
8. **严格要求**：必须使用美元符号包裹所有数学内容`

    const apiUrl = process.env.YUN_API_URL || 'https://yunwu.ai/v1/chat/completions'
    const apiKey = process.env.YUN_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'Server: missing YUN_API_KEY in environment' })

    const messages = [
      { role: 'system', content: SOLVE_PROMPT },
      { role: 'user', content: text }
    ]

    const payload = {
      model: model || 'o4-mini',
      messages,
      temperature: 0.2,
      max_tokens: 32767
    }

    const resp = await axios.post(apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 600000
    })

    const data = resp.data
    let content = ''
    try {
      if (data.choices && data.choices[0] && data.choices[0].message) {
        content = data.choices[0].message.content
      } else if (data.choices && data.choices[0] && data.choices[0].text) {
        content = data.choices[0].text
      } else if (data.data && data.data[0] && data.data[0].text) {
        content = data.data[0].text
      } else {
        content = JSON.stringify(data)
      }
    } catch (e) {
      content = JSON.stringify(data)
    }

    // 优化格式
    try {
      let fixed = content
      fixed = fixed.replace(/^#\s/gm, '## ')
      fixed = fixed.replace(/\n{3,}/g, '\n\n')
      fixed = fixed.replace(/```(\w*?)([^\n])/g, '```$1\n$2')

      // 规范化 output_gen / io.output_gen 的调用，确保使用 'std.exe'（避免 './std.exe' 等变体）
      try {
        fixed = fixed.replace(/io\.output_gen\s*\(\s*['"][^'"]*['"]\s*\)/g, "io.output_gen('std.exe')")
        fixed = fixed.replace(/output_gen\s*\(\s*['"][^'"]*['"]\s*\)/g, "output_gen('std.exe')")
      } catch (e) {}

      return res.json({ result: fixed })
    } catch (e) {
      return res.json({ result: content })
    }
  } catch (err) {
    console.error('Solve error:', err?.response?.data || err.message || err)
    const message = err?.response?.data || err.message || 'unknown error'
    return res.status(500).json({ error: 'Code generation failed', detail: message })
  }
})

// Generate Data 生成测试数据脚本接口

// Generate Data 生成测试数据脚本接口
app.post('/api/generate-data', async (req, res) => {
  try {
    const { text, model } = req.body
    if (!text) return res.status(400).json({ error: '缺少 text 字段' })

    // 读取 Cyaron 文档
    let cyaronDocs = ''
    const docsDir = path.join(__dirname, '../cyaron-docs')
    try {
      const files = await fs.promises.readdir(docsDir)
      for (const file of files) {
        if (file.endsWith('.md')) {
          const content = await fs.promises.readFile(path.join(docsDir, file), 'utf8')
          cyaronDocs += `# ${file}\n${content}\n\n`
        }
      }
    } catch (e) {
      debugLog('Failed to read cyaron docs', e)
    }

     const DATA_GEN_PROMPT = `你是一个专业的算法竞赛测试数据生成专家。请输出使用 CYaRon 的高效 Python 数据生成脚本，并附简要思路说明。

【目标】
- 生成速度极快，支持 n=1e5~2e5；避免任何低效写, 根据题意生成多组测试数据的数据生成脚本。如果题目要求的数据范围太大, 适当的缩小数据范围

以下是 CYaRon 库的文档：

${cyaronDocs}

请按照以下格式输出：

## Cyaron 脚本
\`\`\`python
[完整 Python 脚本]
\`\`\`

1. **导入库的正确方式（重要！）**：
   - 先导入 \`from cyaron import *\`
   - 再导入 \`import random as py_random\` （使用别名避免与 CYaRon 的 random 冲突）
   - 如需要数学函数，导入 \`import math\`
   - CYaRon 的随机数函数（如 \`randint()\`、\`String.random()\`）直接使用，不需要前缀
2. **推荐做法**：
   - 优先使用 CYaRon 提供的随机数生成函数
   - 只在 CYaRon 未提供的功能（如 shuffle、choice、seed）时使用 \`py_random\`
3. 数据文件前缀设置为 \`file_prefix='./testdata/data'\`
4. 脚本中需要调用 \`io.output_gen('std.exe')\` 来生成输出（假设用户提供了标准程序）
5. 根据题目数据范围，合理划分测试点（小数据、中等数据、大数据、边界数据）
6. 生成 10-20 组数据（可根据题目复杂度调整）
7. 考虑特殊情况：边界值、极端情况、随机数据
8. 代码要包含注释，说明每组数据的特点
9. **所有数学表达式用美元符号包裹**，例如 $n$、$10^5$
10. 代码块必须在 \`\`\` 后换行
11. **严格要求**：必须使用美元符号包裹所有数学内容`

    const apiUrl = process.env.YUN_API_URL || 'https://yunwu.ai/v1/chat/completions'
    const apiKey = process.env.YUN_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'Server: missing YUN_API_KEY in environment' })

    const messages = [
      { role: 'system', content: DATA_GEN_PROMPT },
      { role: 'user', content: text }
    ]

    const payload = {
      model: model || 'gemini-2.0-flash',
      messages,
      temperature: 0.5,
      max_tokens: 32767
    }

    const resp = await axios.post(apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 600000
    })

    const data = resp.data
    let content = ''
    try {
      if (data.choices && data.choices[0] && data.choices[0].message) {
        content = data.choices[0].message.content
      } else if (data.choices && data.choices[0] && data.choices[0].text) {
        content = data.choices[0].text
      } else if (data.data && data.data[0] && data.data[0].text) {
        content = data.data[0].text
      } else {
        content = JSON.stringify(data)
      }
    } catch (e) {
      content = JSON.stringify(data)
    }

    // 优化格式
    try {
      let fixed = content
      fixed = fixed.replace(/^#\s/gm, '## ')
      fixed = fixed.replace(/\n{3,}/g, '\n\n')
      fixed = fixed.replace(/```(\w*?)([^\n])/g, '```$1\n$2')
      
      return res.json({ result: fixed })
    } catch (e) {
      return res.json({ result: content })
    }
  } catch (err) {
    console.error('Data generation error:', err?.response?.data || err.message || err)
    const message = err?.response?.data || err.message || 'unknown error'
    return res.status(500).json({ error: 'Data script generation failed', detail: message })
  }
})

// 运行数据生成脚本并返回测试数据
app.post('/api/generate-problem-meta', async (req, res) => {
  try {
    // 该接口改为：不再调用外部模型，而是**从传入的（已翻译）文本中解析标题和标签**。
    // 前端应将 translate 接口得到的翻译结果（Markdown 格式）传入到这里的 text 字段。
    const { text } = req.body
    if (!text) return res.status(400).json({ error: '缺少 text 字段' })

    const raw = String(text || '').trim()

    // 可选标签列表（与前端/提示中一致）
    const ALLOWED_TAGS = [
      '顺序结构','条件结构','循环结构','暴力枚举1','数学1',
      '数组','函数','字符串','结构体','排序','模拟2','暴力枚举2','数学2','二维数组',
      'STL','暴力枚举3','模拟3','数学3','贪心3','思维3',
      '递推','递归','前缀和','差分','二分','三分','BFS','DFS','双指针','栈','链表','离散化','ST表','贪心4','数学4','思维4','优先队列',
      'DP','DP变形','线性DP','背包DP','区间DP','BFS进阶','DFS进阶','树形结构','倍增','反悔贪心','哈希','KMP','字典树','并查集','数学5','思维5','环','搜索进阶','树的直径',
      '树状数组','线段树','概率DP','期望DP','单调队列优化DP','数位DP','状压DP','树上DP','换根DP','单源最短路径','floyd','差分约束','最小生成树','AC自动机','平衡树','二分图','博弈论','分块','莫队','矩阵','数学6','思维6'
    ]

    let title = ''
    let tags = []

    try {
      const textNormalized = raw.replace(/\r\n/g, '\n')

      // 1) 尝试查找 JSON 块（例如前端或模型可能包含的 JSON）
      const jsonBlock = textNormalized.match(/```json\s*([\s\S]{0,10000}?)\s*```/i)
      if (jsonBlock) {
        try {
          const parsed = JSON.parse(jsonBlock[1])
          if (parsed && parsed.title) title = String(parsed.title).trim()
          if (parsed && Array.isArray(parsed.tags)) tags = parsed.tags.map(t => String(t).trim()).filter(Boolean)
        } catch (e) {
          // ignore parse error
        }
      }

      // 2) 如果没有 title，再尝试从常见 Markdown 标题中提取
      if (!title) {
        // 支持 # 题目标题、## 题目标题、## 题目 等形式
        const mdTitleMatch = textNormalized.match(/#{1,3}\s*(?:题目标题|题目|Title|Problem)[\s:：-]*\n?([^\n]{1,200})/i)
        if (mdTitleMatch) title = mdTitleMatch[1].trim()
      }

      // 3) 尝试行内形式：例如 "题目：xxx" 或 "Title: xxx"
      if (!title) {
        const inline = textNormalized.match(/(?:题目标题|题目|Title|Problem)[\s:：-]+([^\n]{1,200})/i)
        if (inline) title = inline[1].trim()
      }

      // 4) 兜底：取第一条合理的非小节说明行
      if (!title) {
        const lines = textNormalized.split('\n').map(l => l.trim()).filter(Boolean)
        for (const ln of lines) {
          if (/^(?:题目背景|题目描述|输入格式|输出格式|样例|样例解释|数据范围)/i.test(ln)) continue
          if (/^#{1,6}\s*/.test(ln)) continue
          // 如果该行不太长，就当标题
          if (ln.length > 3 && ln.length <= 200) { title = ln; break }
        }
      }

      // 5) 提取标签：优先寻找知识点/算法标签小节
      const tagsSection = textNormalized.match(/(?:知识点标签|知识点|算法标签|算法标签列表)[\s:\：-]*\n?([\s\S]{0,400}?)(?:\n#{1,6}|\n\n|$)/i)
      if (tagsSection) {
        const rawTags = (tagsSection[1] || '').split(/[,，、\n;；]+/)
        tags = rawTags.map(t => t.trim()).map(t => t.replace(/^[-\s*]+/, '')).map(t => t.replace(/[。.,，、;；]+$/, '')).filter(Boolean)
      }

      // 6) 如果还没有 tags，从全文中尝试匹配允许标签名称（关键词匹配）
      if (!tags || tags.length === 0) {
        const found = new Set()
        const lower = textNormalized
        for (const t of ALLOWED_TAGS) {
          try {
            const re = new RegExp('\\b' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i')
            if (re.test(lower)) found.add(t)
          } catch (e) { /* ignore invalid tag regex */ }
          if (found.size >= 3) break
        }
        if (found.size) tags = Array.from(found).slice(0, 3)
      }

      // 最终清理：优先使用翻译文本的第一非空行作为 title（去掉开头的 '#'）
      if (!title) {
        const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
        // 跳过常见的小节标题（例如：背景、题目背景、题目描述、输入格式 等）
        const skipPattern = /^(?:背景|题目背景|题目描述|描述|输入格式|输出格式|样例|样例解释|数据范围|注释)$/i
        let firstLine = ''
        for (const ln of lines) {
          if (skipPattern.test(ln)) continue
          // also skip lines that are only markdown headers like '#' or '## 背景'
          const withoutHashes = ln.replace(/^#+\s*/, '')
          if (skipPattern.test(withoutHashes)) continue
          firstLine = ln
          break
        }
        if (!firstLine) firstLine = lines.find(Boolean) || ''
        title = firstLine.replace(/^#+\s*/, '') || '题目'
      }

      // 如果解析出的 title 只是短小的章节标题（例如：背景/题目背景/说明），则视为无效并清空以便走兜底逻辑
      const skipTitlePattern = /^(?:背景|题目背景|题目描述|描述|说明|介绍|样例|样例解释)$/i
      if (title && skipTitlePattern.test(String(title).replace(/^#+\s*/, '').trim())) {
        title = ''
      }

      // 限制 title 长度
      if (title.length > 120) title = title.slice(0, 120)

      // 只保留在 ALLOWED_TAGS 中的标签（按出现顺序保留最多 3 个）
      const finalTags = []
      for (const t of tags) {
        const clean = String(t || '').trim()
        if (!clean) continue
        // 如果标签完全匹配 ALLOWED_TAGS，则保留；否则尝试按关键字匹配
        if (ALLOWED_TAGS.includes(clean)) {
          if (!finalTags.includes(clean)) finalTags.push(clean)
        } else {
          // 尝试在 ALLOWED_TAGS 中找到包含该关键词的项
          const found = ALLOWED_TAGS.find(a => a.toLowerCase().includes(clean.toLowerCase()))
          if (found && !finalTags.includes(found)) finalTags.push(found)
        }
        if (finalTags.length >= 3) break
      }

      // 如果完全没有匹配到合法标签，返回空数组而不是随机/默认标签
      return res.json({ title: title.trim(), tags: finalTags, rawContent: raw })
    } catch (e) {
      debugLog('generate-problem-meta local parse failed:', e)
      const fallbackTitle = raw.split('\n').map(l => l.trim()).find(Boolean) || '题目'
      return res.json({ title: fallbackTitle, tags: [], rawContent: raw })
    }
  } catch (err) {
    console.error('Generate problem meta (local) error:', err)
    return res.status(500).json({ error: 'Problem meta parsing failed', detail: err?.message || String(err) })
  }
})

// 简单的上下文聊天接口：接收 messages 数组并转发到 Yun API
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model, sessionId } = req.body
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: '缺少 messages 数组' })
    }

    // Debug: log basic info about incoming chat requests (do not log secrets)
    try {
      debugLog('[/api/chat] received messages count:', messages.length, 'model:', model)
      // log roles summary for quick inspection
      const roles = messages.map(m => m.role).slice(0, 20)
      debugLog('[/api/chat] roles:', roles)
    } catch (e) {
      // ignore logging errors
    }

    const apiUrl = process.env.YUN_API_URL || 'https://yunwu.ai/v1/chat/completions'
    const apiKey = process.env.YUN_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'Server: missing YUN_API_KEY in environment' })

    const payload = {
      model: model || 'o4-mini',
      messages,
      temperature: 0.2,
      max_tokens: 2048
    }

    const resp = await axios.post(apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 600000
    })

    const data = resp.data
    let content = ''
    try {
      if (data.choices && data.choices[0] && data.choices[0].message) {
        content = data.choices[0].message.content
      } else if (data.choices && data.choices[0] && data.choices[0].text) {
        content = data.choices[0].text
      } else if (data.data && data.data[0] && data.data[0].text) {
        content = data.data[0].text
      } else {
        content = JSON.stringify(data)
      }
    } catch (e) {
      content = JSON.stringify(data)
    }

    // Debug: log a short preview of the assistant content returned
    try {
      const preview = (typeof content === 'string' ? content : JSON.stringify(content)).slice(0, 400)
      debugLog('[/api/chat] assistant content preview:', preview.replace(/\n/g, ' '))
    } catch (e) {
      // ignore
    }

    try {
      const fixed = wrapLatexIfNeeded(content)
      // persist session if provided - include assistant reply
      if (sessionId) {
        try {
          // 过滤掉 system prompt，只保留 user 和 assistant 消息
          const userMessages = messages.filter(m => m.role !== 'system')
          // 添加 assistant 回复
          userMessages.push({ role: 'assistant', content: fixed })
          await saveSession(sessionId, userMessages)
        } catch (e) { debugLog('save session failed', e) }
      }
      return res.json({ result: fixed })
    } catch (e) {
      return res.json({ result: content })
    }
  } catch (err) {
    console.error('Chat error:', err?.response?.data || err.message || err)
    const message = err?.response?.data || err.message || 'unknown error'
    return res.status(500).json({ error: 'Chat failed', detail: message })
  }
})

app.listen(port, () => {
  console.log(`Translation server listening at http://localhost:${port}`)
})

// --- Daily email report ---
// 配置环境变量：
// MAIL_HOST, MAIL_PORT, MAIL_SECURE(可选: 'true'|'false'), MAIL_USER, MAIL_PASS, MAIL_FROM, MAIL_TO
// 邮件每日发送时间（CRON表达式，默认 55 23 每天）：MAIL_CRON (如 "55 23 * * *")
async function sendDailyReport(dateStr) {
  await ensureLogsDir()
  // dateStr 形如 YYYY-MM-DD；若未提供，则取昨天
  let d
  if (dateStr) {
    const [y,m,dd] = dateStr.split('-').map(x=>parseInt(x,10))
    d = new Date(y, (m||1)-1, dd||1)
  } else {
    const now = new Date()
    d = new Date(now.getFullYear(), now.getMonth(), now.getDate()-1)
  }
  const fname = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}.log`
  const file = path.join(LOGS_DIR, fname)
  let raw = ''
  try { raw = await fs.promises.readFile(file, 'utf8') } catch {}

  // 统计汇总
  const lines = raw ? raw.trim().split(/\n+/) : []
  const total = lines.length
  let byPath = {}
  let byModel = {}
  let byStatus = {}
  let ipCount = {}
  let avgMs = 0
  let sumMs = 0
  for (const ln of lines) {
    try {
      const obj = JSON.parse(ln)
      sumMs += Number(obj.duration_ms)||0
      const p = obj.path || 'unknown'
      byPath[p] = (byPath[p]||0)+1
      const m = obj.model || 'unknown'
      byModel[m] = (byModel[m]||0)+1
      const s = Number(obj.status)||0
      byStatus[s] = (byStatus[s]||0)+1
      const ip = (obj.ip||'unknown')
      ipCount[ip] = (ipCount[ip]||0)+1
    } catch {}
  }
  avgMs = total ? Math.round(sumMs/total) : 0

  const topIPs = Object.entries(ipCount)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,10)

  const reportText = [
    `日期: ${fname.replace('.log','')}`,
    `总请求数: ${total}`,
    `平均耗时(ms): ${avgMs}`,
    `失败请求数(状态>=400): ${Object.entries(byStatus).filter(([k])=>Number(k)>=400).reduce((acc, [,v])=>acc+v,0)}`,
    '',
    '按路径统计:',
    ...Object.entries(byPath).map(([k,v])=>`- ${k}: ${v}`),
    '',
    '按模型统计:',
    ...Object.entries(byModel).map(([k,v])=>`- ${k}: ${v}`),
    '',
    '按状态统计:',
    ...Object.entries(byStatus).map(([k,v])=>`- ${k}: ${v}`),
    '',
    'Top IP (前10):',
    ...topIPs.map(([k,v])=>`- ${k}: ${v}`)
  ].join('\n')

  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT||465),
    secure: String(process.env.MAIL_SECURE||'true')==='true',
    auth: process.env.MAIL_USER ? {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    } : undefined
  })

  const from = process.env.MAIL_FROM || process.env.MAIL_USER || 'noreply@example.com'
  const to = process.env.MAIL_TO || ''
  if (!to) { debugLog('MAIL_TO missing; skip sending') ; return }

  const attachments = raw ? [{ filename: fname, content: raw }] : []
  // 生成 CSV（每行：ts,method,path,status,duration_ms,model,req_body,res_body）
  let csv = 'ts,method,path,status,duration_ms,model,req_body,res_body\n'
  try {
    for (const ln of lines) {
      try {
        const o = JSON.parse(ln)
        const esc = (v) => {
          const s = (v === undefined || v === null) ? '' : String(v)
          const needsQuote = /[",\r\n]/.test(s)
          const q = s.replace(/"/g, '""')
          return needsQuote ? `"${q}"` : q
        }
        csv += [
          esc(o.ts), esc(o.method), esc(o.path), esc(o.status), esc(o.duration_ms), esc(o.model), esc(o.req_body), esc(o.res_body)
        ].join(',') + '\n'
      } catch {}
    }
  } catch {}

  if (lines.length) {
    const csvWithBOM = "\uFEFF" + csv
    attachments.push({ filename: fname.replace('.log', '.csv'), content: csvWithBOM })
  }
  const info = await transporter.sendMail({
    from,
    to,
    subject: `程序工具 - 使用日志日报 (${fname.replace('.log','')})`,
    text: reportText,
    attachments
  })
  debugLog('Daily report sent:', info.messageId)
}

// 手动触发日报发送（可用于测试）
app.post('/api/admin/send-daily-report', async (req, res) => {
  try {
    const { date } = req.body || {}
    await sendDailyReport(date)
    return res.json({ ok: true })
  } catch (e) {
    console.error('send-daily-report error:', e)
    return res.status(500).json({ ok: false, error: e.message })
  }
})

// 定时任务：每天 23:55 发送昨天的日志汇总
try {
  const cronExp = process.env.MAIL_CRON || '55 23 * * *'
  cron.schedule(cronExp, async () => {
    try { await sendDailyReport() } catch (e) { console.error('cron sendDailyReport failed:', e) }
  })
  debugLog('Cron scheduled:', cronExp)
} catch (e) {
  debugLog('cron init failed', e)
}

// models endpoint: serve models JSON from frontend config
app.get('/api/models', async (req, res) => {
  try {
    const file = path.join(__dirname, 'models.json')
    const txt = await fs.promises.readFile(file, 'utf8')
    const data = JSON.parse(txt)
    return res.json(data)
  } catch (e) {
    debugLog('failed to read server/models.json', e)
    return res.status(500).json([])
  }
})

// session management endpoints
app.get('/api/sessions/:id', async (req, res) => {
  try {
    const id = req.params.id
    const data = await loadSession(id)
    return res.json(data)
  } catch (e) {
    return res.status(500).json([])
  }
})

app.post('/api/sessions/:id', async (req, res) => {
  try {
    const id = req.params.id
    const messages = req.body || []
    await saveSession(id, messages)
    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ ok: false })
  }
})

app.post('/api/sessions/:id/clear', async (req, res) => {
  try {
    const id = req.params.id
    await clearSession(id)
    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ ok: false })
  }
})

// 发送测试邮件（快速验证 SMTP 配置）
app.post('/api/admin/send-test-email', async (req, res) => {
  try {
    const to = (req.body && req.body.to) || process.env.MAIL_TO || ''
    if (!to) return res.status(400).json({ ok: false, error: '缺少收件人：请在 body.to 或 MAIL_TO 配置' })

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT||465),
      secure: String(process.env.MAIL_SECURE||'true')==='true',
      auth: process.env.MAIL_USER ? {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      } : undefined
    })

    const from = process.env.MAIL_FROM || process.env.MAIL_USER || 'noreply@example.com'
    const info = await transporter.sendMail({
      from,
      to,
      subject: '程序工具 - 测试邮件',
      text: `这是一封测试邮件。时间：${new Date().toISOString()}`
    })
    return res.json({ ok: true, messageId: info.messageId })
  } catch (e) {
    console.error('send-test-email error:', e)
    return res.status(500).json({ ok: false, error: e.message })
  }
})

// 发送项目包附件邮件（用于 SolveData 的“下载完整项目包”行为后同时发送邮件给管理员）
// 请求体：{ filename: string, contentBase64: string, to?: string, subject?: string, text?: string }
app.post('/api/admin/send-package', async (req, res) => {
  try {
    const { filename, contentBase64, to, subject, text } = req.body || {}
    const target = to || process.env.MAIL_TO || ''
    if (!target) return res.status(400).json({ ok: false, error: '缺少收件人：请在 body.to 或 MAIL_TO 配置' })
    if (!filename || !contentBase64) return res.status(400).json({ ok: false, error: '缺少附件：需要 filename 与 contentBase64' })

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT||465),
      secure: String(process.env.MAIL_SECURE||'true')==='true',
      auth: process.env.MAIL_USER ? {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      } : undefined
    })

    const from = process.env.MAIL_FROM || process.env.MAIL_USER || 'noreply@example.com'
    const info = await transporter.sendMail({
      from,
      to: target,
      subject: subject || `程序工具 - 完整项目包 (${filename})`,
      text: text || `自动发送：完整项目包已生成，见附件 ${filename}`,
      attachments: [
        { filename, content: Buffer.from(contentBase64, 'base64') }
      ]
    })
    return res.json({ ok: true, messageId: info.messageId })
  } catch (e) {
    console.error('send-package error:', e)
    return res.status(500).json({ ok: false, error: e.message })
  }
})

// 全局错误处理中间件 - 确保所有错误都返回JSON
app.use((err, req, res, next) => {
  console.error('Global error handler:', err)
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message || 'Unknown error',
    detail: DEBUG_LOG ? err.stack : undefined
  })
})

// 404处理 - 返回JSON而不是HTML
app.use((req, res) => {
  res.status(404).json({ error: 'API endpoint not found', path: req.path })
})
