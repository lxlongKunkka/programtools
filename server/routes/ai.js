import express from 'express'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { YUN_API_KEY, YUN_API_URL, DIRS } from '../config.js'
import { checkModelPermission, authenticateToken, requirePremium } from '../middleware/auth.js'
import { debugLog } from '../utils/logger.js'
import { 
  TRANSLATE_PROMPT, 
  SOLUTION_PROMPT, 
  CHECKER_PROMPT, 
  getSolvePrompt, 
  getDataGenPrompt 
} from '../prompts.js'

const router = express.Router()

function wrapLatexIfNeeded(text) {
  if (!text || typeof text !== 'string') return text

  const codeBlocks = []
  const placeholder = '___CODEBLOCK_'
  text = text.replace(/```[\s\S]*?```/g, (m) => {
    codeBlocks.push(m)
    return placeholder + (codeBlocks.length - 1) + '___'
  })

  if (!text.includes('$')) {
    const latexPattern = /\\(?:frac|int|sum|sqrt|left|right|begin|end|pi|alpha|beta|gamma)\b|\^\{|\\\(|\\\)/
    if (latexPattern.test(text)) {
      text = `$$\n${text}\n$$`
    }
  }

  try {
    const trim = (s) => s.replace(/^\s+|\s+$/g, '')
    const t0 = trim(text)
    if (t0.startsWith('$$') && t0.endsWith('$$')) {
      let inner = t0.slice(2, -2)
      inner = inner.replace(/^\s+|\s+$/g, '')
      if (inner.startsWith('$$') && inner.endsWith('$$')) {
        text = inner
      } else {
        text = t0
      }
    }
  } catch (e) {
  }

  text = text.replace(new RegExp(placeholder + '(\\d+)___', 'g'), (_, idx) => codeBlocks[Number(idx)] || '')
  return text
}

router.post('/translate', checkModelPermission, async (req, res) => {
  try {
    const { text, model } = req.body
    if (!text) return res.status(400).json({ error: '缺少 text 字段' })

    const codeBlocks = []
    const CODE_PLACE = '___CODEBLOCK_PLACEHOLDER_'
    const originalText = String(text)
    const textForModel = originalText.replace(/```[\s\S]*?```/g, (m) => {
      const idx = codeBlocks.length
      codeBlocks.push(m)
      return CODE_PLACE + idx + '___'
    })

    const apiUrl = YUN_API_URL
    const apiKey = YUN_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'Server: missing YUN_API_KEY in environment' })

    const messages = [
      { role: 'system', content: TRANSLATE_PROMPT },
      { role: 'user', content: textForModel }
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

    try {
      let fixed = wrapLatexIfNeeded(content)
      if (codeBlocks.length) {
        fixed = fixed.replace(new RegExp(CODE_PLACE + "(\\d+)___", 'g'), (_, idx) => {
          try { return codeBlocks[Number(idx)] || '' } catch (e) { return '' }
        })
      }
      fixed = fixed.replace(/(```input\d+)([\s\S]*?)(```)(?=```input\d+)/g, (m, start, body) => {
        return ''
      })
      fixed = fixed.replace(/(```output\d+)([\s\S]*?)(```)(?=```output\d+)/g, (m, start, body) => {
        return ''
      })
      fixed = fixed.replace(/(```input1[\s\S]*?```)/g, (m) => {
        const all = [...fixed.matchAll(/```input1[\s\S]*?```/g)].map(x => x[0])
        if (all.length > 1) {
          const merged = all.map(x => x.replace(/```input1|```/g, '').trim()).join('\n')
          fixed = fixed.replace(/```input1[\s\S]*?```/g, '')
          return '```input1\n' + merged + '\n```'
        }
        return m
      })
      fixed = fixed.replace(/(```output1[\s\S]*?```)/g, (m) => {
        const all = [...fixed.matchAll(/```output1[\s\S]*?```/g)].map(x => x[0])
        if (all.length > 1) {
          const merged = all.map(x => x.replace(/```output1|```/g, '').trim()).join('\n')
          fixed = fixed.replace(/```output1[\s\S]*?```/g, '')
          return '```output1\n' + merged + '\n```'
        }
        return m
      })
      return res.json({ result: fixed })
    } catch (e) {
      try {
        let fallback = content
        if (codeBlocks.length) {
          fallback = fallback.replace(new RegExp(CODE_PLACE + "(\\d+)___", 'g'), (_, idx) => {
            try { return codeBlocks[Number(idx)] || '' } catch (e) { return '' }
          })
        }
        return res.json({ result: fallback })
      } catch (e2) {
        return res.json({ result: content })
      }
    }
  } catch (err) {
    console.error('Translate error:', err?.response?.data || err.message || err)
    const message = err?.response?.data || err.message || 'unknown error'
    return res.status(500).json({ error: 'Translation failed', detail: message })
  }
})

router.post('/solution', authenticateToken, checkModelPermission, async (req, res) => {
  try {
    const { text, model } = req.body
    if (!text) return res.status(400).json({ error: '缺少 text 字段' })

    const apiUrl = YUN_API_URL
    const apiKey = YUN_API_KEY
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

    try {
      let fixed = content
      fixed = fixed.replace(/^#\s/gm, '## ')
      fixed = fixed.replace(/\n{3,}/g, '\n\n')
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

router.post('/checker', authenticateToken, checkModelPermission, async (req, res) => {
  try {
    const { text, model } = req.body
    if (!text) return res.status(400).json({ error: '缺少 text 字段' })

    const apiUrl = YUN_API_URL
    const apiKey = YUN_API_KEY
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
    console.error('Checker error:', err?.response?.data || err.message || err)
    const message = err?.response?.data || err.message || 'unknown error'
    return res.status(500).json({ error: 'Code checking failed', detail: message })
  }
})

router.post('/solve', authenticateToken, requirePremium, checkModelPermission, async (req, res) => {
  try {
    const { text, model, language } = req.body
    if (!text) return res.status(400).json({ error: '缺少 text 字段' })

    const lang = language || 'C++'
    const prompt = getSolvePrompt(lang)

    const apiUrl = YUN_API_URL
    const apiKey = YUN_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'Server: missing YUN_API_KEY in environment' })

    const messages = [
      { role: 'system', content: prompt },
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

    try {
      let fixed = content
      fixed = fixed.replace(/^#\s/gm, '## ')
      fixed = fixed.replace(/\n{3,}/g, '\n\n')
      fixed = fixed.replace(/```(\w*?)([^\n])/g, '```$1\n$2')

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

router.post('/generate-data', authenticateToken, requirePremium, checkModelPermission, async (req, res) => {
  try {
    const { text, model } = req.body
    if (!text) return res.status(400).json({ error: '缺少 text 字段' })

    let cyaronDocs = ''
    const docsDir = DIRS.cyaronDocs
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

    let testpointTable = ''
    let tableMatch = String(text).match(/\|\s*测试点\s*\|[\s\S]{0,2000}?\|\s*约束条件\s*\|[\s\S]{0,2000}?\|/)
    if (!tableMatch) {
      tableMatch = String(text).match(/\|\s*(Testcase|Test Point|测试点)[^|]*\|[\s\S]{0,2000}?\|\s*(Constraint|约束)[^|]*\|[\s\S]{0,2000}?\|/i)
    }
    if (tableMatch) {
      testpointTable = tableMatch[0]
    }

    let extraConstraintPrompt = ''
    if (testpointTable) {
      const groupCountMatch = testpointTable.match(/\|\s*([0-9]+)\s*\\sim\\s*([0-9]+)\s*\|/g)
      let groupCount = 0
      if (groupCountMatch) {
        for (const m of groupCountMatch) {
          const nums = m.match(/([0-9]+)\s*\\sim\\s*([0-9]+)/)
          if (nums) {
            groupCount += Number(nums[2]) - Number(nums[1]) + 1
          }
        }
      }
      extraConstraintPrompt = `\n\n【测试点分组与约束】\n请严格按照下表的分组和约束条件生成数据脚本：\n- 必须严格生成 ${groupCount || 20} 组测试点，编号与分组需与表格一致，不可多也不可少。\n- 每组数据需满足对应约束条件。\n- 每组脚本需用注释标明分组编号和约束。\n${testpointTable}\n`
    } else {
      extraConstraintPrompt = '\n\n【没有分组表格时】请仔细阅读题目描述中的数据范围和约束条件，自动合理分组测试点（如小数据、大数据、边界、特殊情况等），必须严格生成20组测试点，每组数据需覆盖不同范围和典型情况，脚本需包含分组编号和分组注释。'
    }

    const prompt = getDataGenPrompt(extraConstraintPrompt, cyaronDocs)

    const apiUrl = YUN_API_URL
    const apiKey = YUN_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'Server: missing YUN_API_KEY in environment' })

    const messages = [
      { role: 'system', content: prompt },
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

router.post('/generate-problem-meta', async (req, res) => {
  try {
    const { text } = req.body
    if (!text) return res.status(400).json({ error: '缺少 text 字段' })

    const raw = String(text || '').trim()

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

      const jsonBlock = textNormalized.match(/```json\s*([\s\S]{0,10000}?)\s*```/i)
      if (jsonBlock) {
        try {
          const parsed = JSON.parse(jsonBlock[1])
          if (parsed && parsed.title) title = String(parsed.title).trim()
          if (parsed && Array.isArray(parsed.tags)) tags = parsed.tags.map(t => String(t).trim()).filter(Boolean)
        } catch (e) {
        }
      }

      if (!title) {
        const mdTitleMatch = textNormalized.match(/#{1,3}\s*(?:题目标题|题目|Title|Problem)[\s:：-]*\n?([^\n]{1,200})/i)
        if (mdTitleMatch) title = mdTitleMatch[1].trim()
      }

      if (!title) {
        const inline = textNormalized.match(/(?:题目标题|题目|Title|Problem)[\s:：-]+([^\n]{1,200})/i)
        if (inline) title = inline[1].trim()
      }

      if (!title) {
        const lines = textNormalized.split('\n').map(l => l.trim()).filter(Boolean)
        for (const ln of lines) {
          if (/^(?:题目背景|题目描述|输入格式|输出格式|样例|样例解释|数据范围)/i.test(ln)) continue
          if (/^#{1,6}\s*/.test(ln)) continue
          if (ln.length > 3 && ln.length <= 200) { title = ln; break }
        }
      }

      const tagsSection = textNormalized.match(/(?:知识点标签|知识点|算法标签|算法标签列表)[\s:\：-]*\n?([\s\S]{0,400}?)(?:\n#{1,6}|\n\n|$)/i)
      if (tagsSection) {
        const rawTags = (tagsSection[1] || '').split(/[,，、\n;；]+/)
        tags = rawTags.map(t => t.trim()).map(t => t.replace(/^[-\s*]+/, '')).map(t => t.replace(/[。.,，、;；]+$/, '')).filter(Boolean)
      }

      if (!tags || tags.length === 0) {
        const found = new Set()
        const lower = textNormalized
        for (const t of ALLOWED_TAGS) {
          try {
            const re = new RegExp('\\b' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i')
            if (re.test(lower)) found.add(t)
          } catch (e) { }
          if (found.size >= 3) break
        }
        if (found.size) tags = Array.from(found).slice(0, 3)
      }

      if (!title) {
        const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
        const skipPattern = /^(?:背景|题目背景|题目描述|描述|输入格式|输出格式|样例|样例解释|数据范围|注释)$/i
        let firstLine = ''
        for (const ln of lines) {
          if (skipPattern.test(ln)) continue
          const withoutHashes = ln.replace(/^#+\s*/, '')
          if (skipPattern.test(withoutHashes)) continue
          firstLine = ln
          break
        }
        if (!firstLine) firstLine = lines.find(Boolean) || ''
        title = firstLine.replace(/^#+\s*/, '') || '题目'
      }

      const skipTitlePattern = /^(?:背景|题目背景|题目描述|描述|说明|介绍|样例|样例解释)$/i
      if (title && skipTitlePattern.test(String(title).replace(/^#+\s*/, '').trim())) {
        title = ''
      }

      if (title.length > 120) title = title.slice(0, 120)

      const finalTags = []
      for (const t of tags) {
        const clean = String(t || '').trim()
        if (!clean) continue
        if (ALLOWED_TAGS.includes(clean)) {
          if (!finalTags.includes(clean)) finalTags.push(clean)
        } else {
          const found = ALLOWED_TAGS.find(a => a.toLowerCase().includes(clean.toLowerCase()))
          if (found && !finalTags.includes(found)) finalTags.push(found)
        }
        if (finalTags.length >= 3) break
      }

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

export default router
