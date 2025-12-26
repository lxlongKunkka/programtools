import express from 'express'
import axios from 'axios'
import FormData from 'form-data'
import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'
import nodemailer from 'nodemailer'
import JSZip from 'jszip'
import COS from 'cos-nodejs-sdk-v5'
import User from '../models/User.js'
import Document from '../models/Document.js'
import CourseLevel from '../models/CourseLevel.js'
import { YUN_API_KEY, YUN_API_URL, DIRS, MAIL_CONFIG, COS_CONFIG, HYDRO_CONFIG } from '../config.js'
import { checkModelPermission, authenticateToken, requirePremium, requireRole } from '../middleware/auth.js'
import { debugLog } from '../utils/logger.js'
import { getIO } from '../socket/index.js'
import { 
  TRANSLATE_PROMPT, 
  SOLUTION_PROMPT, 
  getSolutionPrompt,
  CHECKER_PROMPT, 
  getSolvePrompt, 
  getDataGenPrompt,
  SOLUTION_REPORT_PROMPT,
  META_PROMPT,
  LESSON_PLAN_PROMPT,
  PPT_PROMPT,
  TOPIC_PLAN_PROMPT,
  TOPIC_DESC_PROMPT
} from '../prompts.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// Initialize COS
let cos = null
if (COS_CONFIG.SecretId && COS_CONFIG.SecretKey && COS_CONFIG.Bucket && COS_CONFIG.Region) {
    cos = new COS({
        SecretId: COS_CONFIG.SecretId,
        SecretKey: COS_CONFIG.SecretKey
    })
}

async function uploadToCos(key, content) {
    if (!cos) {
        throw new Error('COS not configured')
    }
    return new Promise((resolve, reject) => {
        cos.putObject({
            Bucket: COS_CONFIG.Bucket,
            Region: COS_CONFIG.Region,
            Key: key,
            Body: content,
            ContentType: 'text/html; charset=utf-8'
        }, function(err, data) {
            if (err) return reject(err)
            
            // Construct URL
            let url = `https://${COS_CONFIG.Bucket}.cos.${COS_CONFIG.Region}.myqcloud.com/${key}`
            if (COS_CONFIG.Domain) {
                url = `${COS_CONFIG.Domain}/${key}`
            }
            resolve(url)
        })
    })
}

let currentHydroCookie = HYDRO_CONFIG.COOKIE

async function loginToHydro() {
    if (!HYDRO_CONFIG.USERNAME || !HYDRO_CONFIG.PASSWORD) {
        return null
    }
    
    try {
        console.log('[Hydro Login] Attempting to login...')
        const loginUrl = `${HYDRO_CONFIG.API_URL.replace(/\/$/, '')}/login`
        const response = await axios.post(loginUrl, {
            uname: HYDRO_CONFIG.USERNAME,
            password: HYDRO_CONFIG.PASSWORD
        }, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json'
            }
        })

        const setCookie = response.headers['set-cookie']
        if (setCookie) {
            currentHydroCookie = setCookie.map(c => c.split(';')[0]).join('; ')
            console.log('[Hydro Login] Login successful')
            return currentHydroCookie
        }
    } catch (e) {
        console.error('[Hydro Login] Error:', e.message)
    }
    return null
}

async function uploadToHydro(problemId, domainId, files) {
    if (!HYDRO_CONFIG.API_URL) {
        console.warn('Hydro API URL not configured. Skipping upload.')
        return { skipped: true }
    }

    if (!Array.isArray(files)) {
        throw new Error('uploadToHydro expects an array of files')
    }
    
    const baseUrl = HYDRO_CONFIG.API_URL.replace(/\/$/, '')
    let uploadUrl
    let refererUrl

    if (domainId) {
        uploadUrl = `${baseUrl}/d/${domainId}/p/${problemId}/files?type=additional_file`
        refererUrl = `${baseUrl}/d/${domainId}/p/${problemId}/files`
    } else {
        uploadUrl = `${baseUrl}/p/${problemId}/files?type=additional_file`
        refererUrl = `${baseUrl}/p/${problemId}/files`
    }

    // Ensure we have a cookie if not using token
    if (!HYDRO_CONFIG.API_TOKEN && !currentHydroCookie) {
        await loginToHydro()
    }

    const getHeaders = () => {
        const h = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json',
            'Origin': HYDRO_CONFIG.API_URL,
            'Referer': refererUrl
        }
        if (HYDRO_CONFIG.API_TOKEN) {
            h['Authorization'] = `Bearer ${HYDRO_CONFIG.API_TOKEN}`
        } else if (currentHydroCookie) {
            h['Cookie'] = currentHydroCookie
        }
        return h
    }

    // Sequential upload with delay to mimic manual upload and avoid race conditions
    const results = []
    for (const file of files) {
        const form = new FormData()
        // Add operation field which is often required by Hydro/SYZOJ
        form.append('operation', 'upload_file') 
        form.append('type', 'additional_file') // Explicitly specify type
        form.append('file', file.content, {
            filename: file.name,
            contentType: 'application/octet-stream' // Explicitly set content type
        })
        
        const headers = {
            ...getHeaders(),
            ...form.getHeaders()
        }

        try {
            console.log(`[Upload] Uploading ${file.name} to ${uploadUrl}...`)
            // Disable redirects to catch 3xx responses
            const response = await axios.post(uploadUrl, form, { 
                headers,
                maxRedirects: 0,
                validateStatus: status => status >= 200 && status < 400 
            })
            
            // Strict check: Inspect response body for application-level errors
            if (response.data && typeof response.data === 'object') {
                if (response.data.error) {
                    throw new Error(`Hydro API Error: ${response.data.error}`)
                }
                if (response.data.success === false) {
                    throw new Error(`Hydro API returned success: false. Msg: ${response.data.message || 'Unknown'}`)
                }
            }

            console.log(`[Upload] Success: ${file.name} (Status: ${response.status})`)
            results.push({ name: file.name, status: 'success' })
        } catch (e) {
            // Handle 401/403 by re-logging in once
            if (e.response && (e.response.status === 401 || e.response.status === 403) && !HYDRO_CONFIG.API_TOKEN) {
                console.log('[Upload] Auth failed, retrying login...')
                await loginToHydro()
                // Retry upload
                const newHeaders = {
                    ...getHeaders(),
                    ...form.getHeaders()
                }
                try {
                    await axios.post(uploadUrl, form, { 
                        headers: newHeaders,
                        maxRedirects: 0,
                        validateStatus: status => status >= 200 && status < 400 
                    })
                    console.log(`[Upload] Success (Retry): ${file.name}`)
                    results.push({ name: file.name, status: 'success' })
                    continue // Next file
                } catch (retryErr) {
                    console.error(`[Upload] Retry failed for ${file.name}:`, retryErr.message)
                    throw retryErr
                }
            }

            // Check for redirect (302) which often indicates success in Hydro
            if (e.response && e.response.status === 302) {
                 console.log(`[Upload] Success (Redirect): ${file.name}`)
                 results.push({ name: file.name, status: 'success' })
            } else {
                 console.error(`[Upload] Failed ${file.name}:`, e.message)
                 throw e
            }
        }
        
        // Add delay between uploads
        await new Promise(resolve => setTimeout(resolve, 1500))
    }
    
    return results
}

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

    const textForModel = String(text)

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

    let resultText = ''
    let meta = { title: '', tags: [] }
    let isJson = false

    // 尝试解析 JSON
    try {
        let jsonStr = content.trim()
        
        // 1. 尝试提取 Markdown 代码块中的 JSON
        const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/i)
        if (jsonBlockMatch) {
            jsonStr = jsonBlockMatch[1].trim()
        } else {
            // 2. 如果没有代码块，尝试寻找最外层的 {}
            const firstBrace = content.indexOf('{')
            const lastBrace = content.lastIndexOf('}')
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                jsonStr = content.substring(firstBrace, lastBrace + 1)
            }
        }

        // 尝试解析
        const jsonObj = JSON.parse(jsonStr)
        
        if (jsonObj.translation) {
            resultText = jsonObj.translation
            if (jsonObj.title) meta.title = jsonObj.title
            if (jsonObj.tags && Array.isArray(jsonObj.tags)) meta.tags = jsonObj.tags
            isJson = true
        } else {
            resultText = content
        }
    } catch (e) {
        // JSON 解析失败，尝试正则提取作为兜底
        let recovered = false
        try {
            const translationMatch = content.match(/"translation"\s*:\s*"([\s\S]*?)"(?:\s*,|\s*})/)
            if (translationMatch) {
                try {
                    resultText = JSON.parse(`"${translationMatch[1]}"`)
                } catch (e2) {
                    // 手动解码
                    resultText = translationMatch[1]
                        .replace(/\\n/g, '\n')
                        .replace(/\\"/g, '"')
                        .replace(/\\\\/g, '\\')
                        .replace(/\\t/g, '\t')
                }
                isJson = true
                recovered = true

                // 尝试提取 meta
                const titleMatch = content.match(/"title"\s*:\s*"([^"]*?)"/)
                if (titleMatch) meta.title = titleMatch[1]

                const tagsMatch = content.match(/"tags"\s*:\s*\[([\s\S]*?)\]/)
                if (tagsMatch) {
                    try {
                        meta.tags = JSON.parse(`[${tagsMatch[1]}]`)
                    } catch (e3) {
                        meta.tags = tagsMatch[1].split(',').map(t => t.trim().replace(/^"|"$/g, ''))
                    }
                }
                console.log('Recovered from JSON error using regex extraction')
            }
        } catch (regexErr) {
            console.warn('Regex recovery failed:', regexErr)
        }

        if (!recovered) {
            // 彻底失败，回退到纯文本处理
            console.warn('JSON parse failed in translate:', e.message)
            // 如果包含 json 代码块标记但解析失败，去除标记直接显示内容，方便用户查看
            resultText = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '')
        }
    }

    try {
      // 如果是 JSON 模式且成功提取了 translation，我们信任 AI 的 Markdown 格式，
      // 不再进行 wrapLatexIfNeeded 等可能破坏格式的处理，
      // 仅做必要的清理（如 input/output 块的合并）
      let fixed = resultText

      if (!isJson) {
          fixed = wrapLatexIfNeeded(fixed)
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

      fixed = fixed.replace(/(```)\s*(#+\s+)/g, '$1\n\n$2')
      fixed = fixed.replace(/([^\n])\s*(##+\s+)/g, '$1\n\n$2')

      // 如果没有从 JSON 中提取到元数据，尝试从文本中提取
      if (!isJson || (!meta.title && meta.tags.length === 0)) {
        try {
            // Extract title: First line starting with #
            const titleMatch = fixed.match(/^#\s+(.+)$/m)
            if (titleMatch) {
            let extractedTitle = titleMatch[1].trim()
            
            // Fix: If title is literally "题目标题", look for the next non-empty line
            if (extractedTitle === '题目标题' || extractedTitle === 'Title') {
                const matchIndex = titleMatch.index + titleMatch[0].length
                const remainingText = fixed.substring(matchIndex)
                // Find first non-empty line that doesn't start with #
                const nextLineMatch = remainingText.match(/^\s*([^#\s].*)$/m)
                if (nextLineMatch) {
                    extractedTitle = nextLineMatch[1].trim()
                } else {
                    // If still not found, clear it to avoid showing "题目标题"
                    extractedTitle = ''
                }
            }
            
            // Fix: If title is like "题目标题：Real Title"
            if (/^题目标题[:：]/.test(extractedTitle)) {
                extractedTitle = extractedTitle.replace(/^题目标题[:：]\s*/, '')
            }
            
            if (extractedTitle === '题目标题') extractedTitle = ''
            
            meta.title = extractedTitle
            }

            // Extract tags: Content after ### 算法标签
            // 兼容多种格式：
            // 1. ### 算法标签 \n Level1 数学1
            // 2. **算法标签** \n Level1 数学1
            // 3. 算法标签 \n Level1 数学1
            const tagsMatch = fixed.match(/(?:###|\*\*|)\s*算法标签(?:\*\*|)\s*\n+([\s\S]*?)(?:\n#|\n\n|$)/)
            if (tagsMatch) {
            const tagsText = tagsMatch[1].trim()
            // Split by common separators (space, comma, newline) and clean up
            meta.tags = tagsText.split(/[\s,，、]+/)
                .map(t => t.trim())
                .filter(t => t && !t.startsWith('**') && t !== '无') 
            }
        } catch (e) {
            console.warn('Failed to extract meta from translation:', e)
        }
      }

      return res.json({ result: fixed, meta })
    } catch (e) {
      try {
        let fallback = content
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
    const { text, model, language, requireAC } = req.body
    if (!text) return res.status(400).json({ error: '缺少 text 字段' })

    const apiUrl = YUN_API_URL
    const apiKey = YUN_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'Server: missing YUN_API_KEY in environment' })

    // 优先使用动态 Prompt，如果未导入则回退到静态 Prompt
    const prompt = (typeof getSolutionPrompt === 'function') 
      ? getSolutionPrompt(language || 'C++', requireAC) 
      : SOLUTION_PROMPT

    const messages = [
      { role: 'system', content: prompt },
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
    const { text, model, code } = req.body
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

    const prompt = getDataGenPrompt(extraConstraintPrompt, cyaronDocs, code)

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
    console.error('Data generation error:', err?.response?.data || err.message || err)
    const message = err?.response?.data || err.message || 'unknown error'
    return res.status(500).json({ error: 'Data script generation failed', detail: message })
  }
})

router.post('/generate-tags', authenticateToken, checkModelPermission, async (req, res) => {
  try {
    const { text, model } = req.body
    if (!text) return res.status(400).json({ error: '缺少 text 字段' })

    const ALLOWED_TAGS = [
      '顺序结构','条件结构','循环结构','暴力枚举1','数学1',
      '数组','函数','字符串','结构体','排序','模拟2','暴力枚举2','数学2','二维数组',
      'STL','暴力枚举3','模拟3','数学3','贪心3','思维3',
      '递推','递归','前缀和','差分','二分','三分','BFS','DFS','双指针','栈','链表','离散化','ST表','贪心4','数学4','思维4','优先队列',
      'DP','DP变形','线性DP','背包DP','区间DP','BFS进阶','DFS进阶','树形结构','倍增','反悔贪心','哈希','KMP','字典树','并查集','数学5','思维5','环','搜索进阶','树的直径',
      '树状数组','线段树','概率DP','期望DP','单调队列优化DP','数位DP','状压DP','树上DP','换根DP','单源最短路径','floyd','差分约束','最小生成树','AC自动机','平衡树','二分图','博弈论','分块','莫队','矩阵','数学6','思维6'
    ]

    const prompt = `请阅读以下算法题目内容，完成两个任务：
    1. 从给定的标签列表中选出最合适的 1 到 3 个标签。
    2. 根据题目内容生成一个简洁的中文标题（不超过20字）。
    
    可选标签列表：
    ${JSON.stringify(ALLOWED_TAGS)}
    
    要求：
    只返回 JSON 对象格式，例如：
    {
      "tags": ["数组", "模拟2"],
      "title": "数组求和问题"
    }
    不要包含任何其他文字或 Markdown 格式。
    
    题目内容：
    ${text.slice(0, 2000)}
    `

    const apiUrl = YUN_API_URL
    const apiKey = YUN_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'Server: missing YUN_API_KEY' })

    const messages = [
      { role: 'user', content: prompt }
    ]

    const payload = {
      model: model || 'gemini-2.0-flash',
      messages,
      temperature: 0.1,
      max_tokens: 1000
    }

    const resp = await axios.post(apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 60000
    })

    const data = resp.data
    let content = ''
    if (data.choices && data.choices[0]?.message?.content) {
      content = data.choices[0].message.content
    } else if (data.data && data.data[0]?.text) {
      content = data.data[0].text
    } else {
      content = '{}'
    }

    // Parse JSON
    let result = {}
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0])
      } else {
        result = JSON.parse(content)
      }
    } catch (e) {
      // Fallback
      result = { tags: [], title: '' }
    }

    // Filter valid tags
    let tags = result.tags
    if (Array.isArray(tags)) {
      tags = tags.filter(t => ALLOWED_TAGS.includes(t)).slice(0, 3)
    } else {
      tags = []
    }

    return res.json({ tags, title: result.title || '' })

  } catch (err) {
    console.error('Generate tags error:', err)
    return res.status(500).json({ error: 'Tag generation failed' })
  }
})

router.post('/generate-problem-meta', checkModelPermission, async (req, res) => {
  try {
    const { text, model, solution } = req.body
    if (!text) return res.status(400).json({ error: '缺少 text 字段' })

    const apiUrl = YUN_API_URL
    const apiKey = YUN_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'Server: missing YUN_API_KEY in environment' })

    let contentInput = text
    if (solution) {
      contentInput += `\n\n【参考题解/分析】\n${solution}\n\n请结合题目描述和参考题解，更准确地总结题目名称和算法标签。`
    }

    const messages = [
      { role: 'system', content: META_PROMPT },
      { role: 'user', content: contentInput }
    ]

    const payload = {
      model: model || 'gemini-2.0-flash',
      messages,
      temperature: 0.3,
      max_tokens: 1000
    }

    const resp = await axios.post(apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 30000
    })

    const data = resp.data
    let content = ''
    if (data.choices && data.choices[0] && data.choices[0].message) {
      content = data.choices[0].message.content
    } else if (data.data && data.data[0] && data.data[0].text) {
      content = data.data[0].text
    } else {
      content = '{}'
    }

    let result = { title: '', tags: [] }
    try {
      // 尝试提取 JSON 块
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[1] || jsonMatch[0])
      } else {
        result = JSON.parse(content)
      }
    } catch (e) {
      console.warn('Meta JSON parse failed, raw content:', content)
      // 简单的正则兜底
      const titleMatch = content.match(/"title"\s*:\s*"([^"]+)"/)
      if (titleMatch) result.title = titleMatch[1]
    }

    return res.json({ 
      title: result.title || '未命名题目', 
      tags: Array.isArray(result.tags) ? result.tags : [], 
      rawContent: content 
    })

  } catch (err) {
    console.error('Generate problem meta error:', err)
    return res.status(500).json({ error: 'Problem meta generation failed', detail: err?.message || String(err) })
  }
})

router.post('/solution-report', authenticateToken, requirePremium, checkModelPermission, async (req, res) => {
  console.log('[SolutionReport] Route hit!')
  try {
    console.log('[SolutionReport] Request received')
    if (!SOLUTION_REPORT_PROMPT) {
      console.error('[SolutionReport] SOLUTION_REPORT_PROMPT is undefined')
      return res.status(500).json({ error: 'Server configuration error: Prompt missing' })
    }

    const { problem, code, reference, solutionPlan, model, level, language } = req.body
    if ((!problem && !solutionPlan)) return res.status(400).json({ error: '缺少 problem 或 solutionPlan 字段' })

    let userContent = '';
    if (solutionPlan) {
        userContent = `解题教案：\n${solutionPlan}`;
    } else {
        const codeContent = code || '（用户未提供代码，请自行分析题目并生成代码）';
        userContent = `题目描述：\n${problem}\n\n代码：\n${codeContent}`;
        if (reference && reference.trim()) {
            userContent += `\n\n参考思路/提示：\n${reference.trim()}`;
        }
    }

    const targetLang = language || 'C++'
    let prompt = SOLUTION_REPORT_PROMPT.replace(/{{language}}/g, targetLang)

    // Replace code example based on language
    let codeExample = ''
    if (targetLang === 'Python') {
        codeExample = '<span class="keyword">def</span> <span class="function">solve</span>():\n    <span class="comment"># ...</span>\n\n<span class="keyword">if</span> __name__ == <span class="string">"__main__"</span>:\n    solve()'
    } else {
        codeExample = '<span class="keyword">int</span> <span class="function">main</span>() {\n    <span class="comment">// ...</span>\n}'
    }
    prompt = prompt.replace('{{code_example}}', codeExample)

    if (targetLang === 'C++' && level && parseInt(level) <= 2) {
      userContent += `\n\n【特别要求】\n当前题目属于 Level ${level}（入门阶段）。学生尚未学习 STL 容器（如 vector）。请在生成 C++ 代码时，**务必使用静态数组**（如 int a[1005]），**严禁使用 std::vector**。`;
    }

    const apiUrl = YUN_API_URL
    const apiKey = YUN_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'Server: missing YUN_API_KEY in environment' })

    const messages = [
      { role: 'system', content: prompt },
      { role: 'user', content: userContent }
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
    if (data.choices && data.choices[0] && data.choices[0].message) {
      content = data.choices[0].message.content
    } else {
      content = JSON.stringify(data)
    }

    // Clean up markdown code blocks if present
    content = content.replace(/^```html\s*/i, '').replace(/\s*```$/i, '')

    // Ensure content is not empty
    if (!content || !content.trim()) {
       return res.status(500).json({ error: 'AI returned empty response' })
    }

    return res.json({ html: content })

  } catch (err) {
    console.error('Solution report error:', err)
    const message = err?.response?.data ? JSON.stringify(err.response.data) : (err.message || 'unknown error')
    return res.status(500).json({ error: 'Generation failed', detail: message })
  }
})

// Generate Solution Plan (Direct)
router.post('/solution-plan', authenticateToken, requirePremium, checkModelPermission, async (req, res) => {
  try {
    const { problem, code, model } = req.body;
    if (!problem) return res.status(400).json({ error: 'Missing problem field' });

    const userContent = `题目描述：\n${problem}\n\n代码：\n${code || '未提供'}`;

    const messages = [
        { role: 'system', content: SOLUTION_PROMPT },
        { role: 'user', content: userContent }
    ];

    const payload = {
        model: model || 'o4-mini',
        messages,
        temperature: 0.5,
        max_tokens: 16000
    };

    const resp = await axios.post(YUN_API_URL, payload, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${YUN_API_KEY}`
        },
        timeout: 300000
    });

    const content = resp.data.choices?.[0]?.message?.content || '';
    res.json({ content });

  } catch (err) {
    console.error('Solution plan error:', err);
    const message = err?.response?.data ? JSON.stringify(err.response.data) : (err.message || 'unknown error');
    res.status(500).json({ error: 'Generation failed', detail: message });
  }
});

// Generate Solution Plan Background
router.post('/solution-plan/background', authenticateToken, requirePremium, checkModelPermission, async (req, res) => {
  const { problem, code, chapterId, topicId, clientKey, model } = req.body;

  if (!problem || !chapterId) return res.status(400).json({ error: 'Missing required fields' });

  res.json({ status: 'processing', message: 'Solution plan generation started in background' });

  (async () => {
      try {
          const logMsg = `[Background] Starting Solution Plan for chapter ${chapterId}`;
          console.log(logMsg);
          try { getIO().emit('ai_task_log', { message: logMsg, clientKey }); } catch (e) {}

          const userContent = `题目描述：\n${problem}\n\n代码：\n${code || '未提供'}`;

          const messages = [
              { role: 'system', content: SOLUTION_PROMPT },
              { role: 'user', content: userContent }
          ];

          const payload = {
              model: model || 'o4-mini',
              messages,
              temperature: 0.5,
              max_tokens: 16000
          };

          const resp = await axios.post(YUN_API_URL, payload, {
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${YUN_API_KEY}`
              },
              timeout: 300000
          });

          const content = resp.data.choices?.[0]?.message?.content || '';

          // Update Database
          let query = {};
          if (topicId) {
              query = { 'topics._id': topicId };
          } else {
              query = {
                  $or: [
                      { 'topics.chapters.id': chapterId },
                      { 'topics.chapters._id': chapterId }
                  ]
              };
          }

          let courseLevel = await CourseLevel.findOne(query);

          if (courseLevel) {
              let chapterFound = false;
              for (const topic of courseLevel.topics) {
                  if (topicId && topic._id && topic._id.toString() !== topicId) continue;

                  let chapter;
                  if (mongoose.Types.ObjectId.isValid(chapterId)) {
                      chapter = topic.chapters.find(c => c._id && c._id.toString() === chapterId);
                  }
                  if (!chapter) {
                      chapter = topic.chapters.find(c => c.id === chapterId);
                  }

                  if (chapter) {
                      chapter.content = content;
                      chapter.contentType = 'markdown';
                      chapterFound = true;
                      break;
                  }
              }

              if (chapterFound) {
                  await courseLevel.save();
                  console.log(`[Background] Solution Plan saved for chapter ${chapterId}`);
                  try { getIO().emit('ai_task_complete', { clientKey, result: 'success' }); } catch (e) {}
              } else {
                  console.error(`[Background] Chapter ${chapterId} not found for saving solution plan`);
              }
          } else {
              console.error(`[Background] CourseLevel not found for chapter ${chapterId}`);
          }

      } catch (err) {
          console.error('Solution plan generation error:', err);
          try { getIO().emit('ai_task_error', { clientKey, message: err.message }); } catch (e) {}
      }
  })();
});

router.post('/solution-report/background', authenticateToken, requirePremium, checkModelPermission, async (req, res) => {
  let { problem, code, reference, solutionPlan, model, level, topicTitle, chapterTitle, problemTitle, chapterId, topicId, clientKey, language, group, levelTitle } = req.body;
  
  console.log(`[Solution Report Background] Request received. ChapterId: ${chapterId}, TopicId: ${topicId}, Group (from body): '${group}'`);

  if ((!problem && !solutionPlan) || !chapterId) return res.status(400).json({ error: 'Missing required fields' });

  // Respond immediately
  res.json({ status: 'processing', message: 'Task started in background' });

  // Start background process
  (async () => {
      try {
          // If group or levelTitle is missing, try to fetch from DB
          if (!group || !levelTitle) {
              try {
                  // Try by ID first
                  let levelDoc = await CourseLevel.findOne({
                      $or: [
                          { 'topics.chapters.id': chapterId },
                          { 'topics.chapters._id': chapterId }
                      ]
                  });

                  // If not found, try by Level and Topic (Robust fallback for new chapters)
                  if (!levelDoc && level && topicTitle) {
                       console.log(`[Background] Chapter ID lookup failed, trying by Level ${level} and Topic ${topicTitle}`);
                       levelDoc = await CourseLevel.findOne({
                           level: Number(level),
                           'topics.title': topicTitle
                       });
                  }

                  if (levelDoc) {
                      if (!group && levelDoc.group) {
                          group = levelDoc.group;
                          console.log(`[Background] Fetched group from DB: ${group}`);
                      }
                      if (!levelTitle && levelDoc.title) {
                          levelTitle = levelDoc.title;
                          console.log(`[Background] Fetched levelTitle from DB: ${levelTitle}`);
                      }
                  }
              } catch (e) {
                  console.warn('[Background] Failed to fetch info from DB', e);
              }
          }

          const logMsg = `[Background] Starting solution report for chapter ${chapterId} (${chapterTitle})`;
          console.log(logMsg);
          try { getIO().emit('ai_task_log', { message: logMsg, clientKey }); } catch (e) {}
          
          // 1. Generate HTML
          let userContent = '';
          if (solutionPlan) {
              userContent = `解题教案：\n${solutionPlan}`;
          } else {
              const codeContent = code || '（用户未提供代码，请自行分析题目并生成代码）';
              userContent = `题目描述：\n${problem}\n\n代码：\n${codeContent}`;
              if (reference && reference.trim()) {
                  userContent += `\n\n参考思路/提示：\n${reference.trim()}`;
              }
          }

          const targetLang = language || 'C++'
          let prompt = SOLUTION_REPORT_PROMPT.replace(/{{language}}/g, targetLang)

          // Replace code example based on language
          let codeExample = ''
          if (targetLang === 'Python') {
              codeExample = '<span class="keyword">def</span> <span class="function">solve</span>():\n    <span class="comment"># ...</span>\n\n<span class="keyword">if</span> __name__ == <span class="string">"__main__"</span>:\n    solve()'
          } else {
              codeExample = '<span class="keyword">int</span> <span class="function">main</span>() {\n    <span class="comment">// ...</span>\n}'
          }
          prompt = prompt.replace('{{code_example}}', codeExample)

          // Add constraint for Level 2 and below (Only for C++)
          if (targetLang === 'C++' && level && parseInt(level) <= 2) {
             userContent += `\n\n【特别要求】\n当前题目属于 Level ${level}（入门阶段）。学生尚未学习 STL 容器（如 vector）。请在生成 C++ 代码时，**务必使用静态数组**（如 int a[1005]），**严禁使用 std::vector**。`;
          }

          const messages = [
              { role: 'system', content: prompt },
              { role: 'user', content: userContent }
          ];

          const payload = {
              model: model || 'o4-mini',
              messages,
              temperature: 0.3,
              max_tokens: 32767
          };

          const resp = await axios.post(YUN_API_URL, payload, {
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${YUN_API_KEY}`
              },
              timeout: 600000 // 10 minutes
          });

          let htmlContent = resp.data.choices?.[0]?.message?.content || '';
          htmlContent = htmlContent.replace(/```html\s*/g, '').replace(/```/g, '').trim();

          // 2. Save File
          const sanitize = (str) => str.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, '');
          const safeLevel = levelTitle ? sanitize(levelTitle) : ('level' + sanitize(String(level)));
          const safeTopic = sanitize(topicTitle);
          const safeGroup = group ? sanitize(group) : '';
          // Use problemTitle if available, otherwise fallback to chapterTitle
          const filenameBase = problemTitle ? sanitize(problemTitle) : sanitize(chapterTitle);
          const safeChapter = filenameBase + '.html';
          
          let relativePath;

          // Try COS Upload first
          if (cos) {
              let cosKey = `courseware/${safeLevel}/${safeTopic}/${safeChapter}`;
              if (safeGroup) {
                  cosKey = `courseware/${safeGroup}/${safeLevel}/${safeTopic}/${safeChapter}`;
              }
              try {
                  const cosUrl = await uploadToCos(cosKey, htmlContent);
                  console.log(`[Background] Solution Report uploaded to COS: ${cosUrl}`);
                  relativePath = cosUrl;
              } catch (cosErr) {
                  console.error('[Background] COS Upload failed, falling back to local storage:', cosErr);
              }
          }

          // Local Storage Fallback
          if (!relativePath) {
              const baseDir = path.join(__dirname, '../public/courseware');
              let targetDir = path.join(baseDir, safeLevel, safeTopic);
              if (safeGroup) {
                  targetDir = path.join(baseDir, safeGroup, safeLevel, safeTopic);
              }
              
              if (!fs.existsSync(targetDir)) {
                  fs.mkdirSync(targetDir, { recursive: true });
              }
              
              const fullPath = path.join(targetDir, safeChapter);
              if (safeGroup) {
                  relativePath = `/public/courseware/${safeGroup}/${safeLevel}/${safeTopic}/${safeChapter}`;
              } else {
                  relativePath = `/public/courseware/${safeLevel}/${safeTopic}/${safeChapter}`;
              }
              
              fs.writeFileSync(fullPath, htmlContent, 'utf8');
              console.log(`[Background] File saved to ${fullPath}`);
          }

          // 3. Update Database
          let query = {};
          if (topicId) {
              query = { 'topics._id': topicId };
          } else {
              query = {
                $or: [
                    { 'topics.chapters.id': chapterId },
                    { 'topics.chapters._id': chapterId }
                ]
              };
          }

          let courseLevel = await CourseLevel.findOne(query);

          if (courseLevel) {
              let chapterFound = false;
              let foundChapterTitle = '';
              for (const topic of courseLevel.topics) {
                  // If topicId is provided, ensure we are looking at the correct topic
                  if (topicId && topic._id && topic._id.toString() !== topicId) continue;

                  let chapter;
                  if (mongoose.Types.ObjectId.isValid(chapterId)) {
                      chapter = topic.chapters.find(c => c._id && c._id.toString() === chapterId);
                  }
                  if (!chapter) {
                      chapter = topic.chapters.find(c => c.id === chapterId);
                  }

                  if (chapter) {
                      chapter.resourceUrl = relativePath;
                      chapter.contentType = 'html';
                      chapterFound = true;
                      foundChapterTitle = chapter.title;
                      break;
                  }
              }
              if (chapterFound) {
                  await courseLevel.save();
                  console.log(`[Background] Database updated for chapter ${chapterId}`);
                  try {
                      getIO().emit('ai_task_complete', { chapterId, chapterTitle: foundChapterTitle, clientKey, status: 'success', type: 'solution-report' });
                  } catch (e) { console.error('Socket emit failed', e); }
              }
          } else {
               // Try legacy 'chapters'
               const legacyLevel = await CourseLevel.findOne({ 'chapters.id': chapterId });
               if (legacyLevel) {
                   const chapter = legacyLevel.chapters.find(c => c.id === chapterId);
                   if (chapter) {
                       chapter.resourceUrl = relativePath;
                       chapter.contentType = 'html';
                       await legacyLevel.save();
                       console.log(`[Background] Database updated for legacy chapter ${chapterId}`);
                       try {
                           getIO().emit('ai_task_complete', { chapterId, chapterTitle: chapter.title, clientKey, status: 'success', type: 'solution-report' });
                       } catch (e) { console.error('Socket emit failed', e); }
                   }
               } else {
                   console.error(`[Background] CourseLevel not found for chapter ${chapterId} (Solution Report)`);
                   try {
                       getIO().emit('ai_task_complete', { chapterId, clientKey, status: 'error', message: '数据库记录未找到', type: 'solution-report' });
                   } catch (e) { console.error('Socket emit failed', e); }
               }
          }

      } catch (err) {
          console.error('[Background] Error generating solution report:', err);
          try {
              getIO().emit('ai_task_complete', { chapterId, chapterTitle: chapterTitle, clientKey, status: 'error', message: err.message, type: 'solution-report' });
          } catch (e) { console.error('Socket emit failed', e); }
      }
  })();
});

// Send package email route (moved from admin to allow user access)
router.post('/send-package', authenticateToken, async (req, res) => {
  try {
    const { filename, contentBase64, subject } = req.body;
    
    // Get user info (for identification in email)
    const user = await User.findById(req.user.id);
    const username = user ? user.uname : 'Unknown User';
    
    // Send to configured admin email only
    const targetEmail = MAIL_CONFIG.to;

    if (!targetEmail) {
      console.warn('MAIL_TO not configured, skipping email backup');
      return res.json({ success: false, message: 'Email backup skipped (not configured)' });
    }

    const transporter = nodemailer.createTransport({
      host: MAIL_CONFIG.host,
      port: MAIL_CONFIG.port,
      secure: MAIL_CONFIG.secure,
      auth: MAIL_CONFIG.user ? {
        user: MAIL_CONFIG.user,
        pass: MAIL_CONFIG.pass
      } : undefined
    });

    const mailOptions = {
      from: MAIL_CONFIG.from,
      to: targetEmail,
      subject: `[${username}] ${subject || `Project Download: ${filename}`}`,
      html: `
        <h2>Project Download Notification</h2>
        <p>User <strong>${username}</strong> has downloaded a project package.</p>
        <p>The project <strong>${filename}</strong> is attached to this email.</p>
      `,
      attachments: [
        {
          filename: filename,
          content: contentBase64,
          encoding: 'base64'
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Email sent successfully' });

  } catch (error) {
    console.error('Send package email error:', error);
    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
});

// Generate Lesson Plan
router.post('/lesson-plan', authenticateToken, async (req, res) => {
  try {
    const { topic, context, level, requirements, model, language } = req.body
    if (!topic) return res.status(400).json({ error: 'Missing topic' })

    let userPrompt = `主题：${topic}\n难度：${level || 'Level 1'}\n额外要求：${requirements || '无'}`
    if (context) {
        userPrompt = `所属知识点：${context}\n` + userPrompt
    }
    
    const apiUrl = YUN_API_URL
    const apiKey = YUN_API_KEY
    
    const targetLang = language || 'C++';
    let codeLang = 'cpp';
    if (/python/i.test(targetLang) || (context && /python/i.test(context))) {
        codeLang = 'python';
    }

    const systemPrompt = LESSON_PLAN_PROMPT
        .replace('{{language}}', targetLang)
        .replace('{{code_lang}}', codeLang);

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]

    const payload = {
      model: model || 'o4-mini',
      messages,
      temperature: 0.7,
      max_tokens: 16000
    }

    const resp = await axios.post(apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 120000
    })

    const content = resp.data.choices?.[0]?.message?.content || ''
    res.json({ content })

  } catch (e) {
    console.error('Lesson Plan Error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// Generate PPT
router.post('/generate-ppt', authenticateToken, async (req, res) => {
  try {
    const { topic, context, level, model, chapterList, currentChapterIndex, chapterContent, requirements, language } = req.body
    if (!topic) return res.status(400).json({ error: 'Missing topic' })

    let fullTopic = topic
    if (context) {
        fullTopic = `${context} - ${topic}`
    }

    const targetLang = language || 'C++'
    let systemPrompt = PPT_PROMPT.replace('{{topic}}', fullTopic).replace('{{level}}', level || 'Level 1').replace('{{language}}', targetLang)
    
    // Inject User Requirements
    if (requirements && requirements.trim()) {
        systemPrompt += `\n\n【用户额外要求】\n${requirements}\n`
    }

    // Inject Chapter Content (Lesson Plan)
    if (chapterContent && typeof chapterContent === 'string' && chapterContent.trim().length > 20) {
        systemPrompt += `\n\n【参考素材：本节课详细教案/内容】\n请优先基于以下内容提取知识点、案例和例题来生成 PPT，确保 PPT 内容与教案一致：\n${chapterContent.slice(0, 8000)}\n`
    }

    // Inject Chapter Context
    if (chapterList && Array.isArray(chapterList) && chapterList.length > 0) {
        const current = (currentChapterIndex !== undefined && currentChapterIndex >= 0) ? currentChapterIndex + 1 : '?'
        
        let contextInfo = `\n\n【重要：课程上下文信息】\n`
        contextInfo += `本节课是系列课程 "${context}" 中的第 ${current} 个主题（仅供参考难度定位，**请勿在PPT中显示“第${current}节”或总章节数**）。\n`
        contextInfo += `完整的章节列表如下：\n${chapterList.map((t, i) => `${i+1}. ${t}`).join('\n')}\n`
        contextInfo += `\n请根据此上下文规划内容：\n`
        contextInfo += `1. **避免重复**：如果前面的章节已经讲过基础概念（如定义、语法），本节课应快速回顾或直接进入进阶内容。\n`
        contextInfo += `2. **循序渐进**：确保难度与当前章节的位置相匹配。\n`
        contextInfo += `3. **聚焦主题**：本节课的核心主题是 "${topic}"，请紧扣此主题展开，不要跑题到其他章节的内容。\n`
        
        systemPrompt += contextInfo
    }

    const apiUrl = YUN_API_URL
    const apiKey = YUN_API_KEY
    
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请为主题 "${fullTopic}" 生成 HTML 课件。请务必使用 ${targetLang} 语言进行讲解和代码演示。` }
    ]

    const payload = {
      model: model || 'o4-mini',
      messages,
      temperature: 0.7,
      max_tokens: 16000
    }

    const resp = await axios.post(apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 120000
    })

    let content = resp.data.choices?.[0]?.message?.content || ''
    // Clean up markdown code blocks if present
    content = content.replace(/^```html\s*/, '').replace(/```$/, '')
    
    res.json({ content })

  } catch (e) {
    console.error('PPT Gen Error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// Generate Topic Plan (Chapters list) or Description
router.post('/topic-plan', authenticateToken, async (req, res) => {
  try {
    const { topic, level, model, mode, existingChapters, language } = req.body
    if (!topic) return res.status(400).json({ error: 'Missing topic' })

    let userPrompt = `主题：${topic}\n难度：${level || 'Level 1'}`

    // Add existing chapters context if available
    if (existingChapters && Array.isArray(existingChapters) && existingChapters.length > 0) {
        userPrompt += `\n\n当前已存在的章节信息如下（请参考这些内容生成更精确的描述，避免重复或矛盾）：\n`
        existingChapters.forEach((ch, idx) => {
            userPrompt += `${idx + 1}. ${ch.title}\n`
            if (ch.contentPreview) {
                userPrompt += `   摘要: ${ch.contentPreview}\n`
            }
        })
    }
    
    const apiUrl = YUN_API_URL
    const apiKey = YUN_API_KEY
    
    let systemPrompt = TOPIC_PLAN_PROMPT
    if (mode === 'description') {
        systemPrompt = TOPIC_DESC_PROMPT
    }
    
    if (!systemPrompt) {
        console.error('System prompt is missing for mode:', mode)
        return res.status(500).json({ error: 'Server configuration error: Prompt missing' })
    }

    // Replace language placeholder
    systemPrompt = systemPrompt.replace('{{language}}', language || 'C++')

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]

    console.log(`[TopicPlan] Generating with mode=${mode}, topic=${topic}`)

    const payload = {
      model: model || 'gemini-2.5-flash', // Switch default to gemini-2.5-flash
      messages,
      temperature: 0.7,
      max_tokens: 4000
    }

    const resp = await axios.post(apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 60000
    })

    let content = resp.data.choices?.[0]?.message?.content || ''
    console.log(`[TopicPlan] Received content length: ${content.length}`)

    if (!content) {
        console.warn('[TopicPlan] Empty content received. Full response:', JSON.stringify(resp.data))
    }
    
    if (mode === 'description') {
        // Just return the text content
        return res.json({ description: content, chapters: [] })
    }

    // Default mode: chapters (and maybe description)
    content = content.replace(/```json\s*/g, '').replace(/```/g, '').trim()
    
    let result = {}
    try {
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed)) {
          // Legacy format: just an array of strings
          result = { chapters: parsed, description: '' }
      } else {
          // New format: object with description and chapters
          result = parsed
      }
    } catch (e) {
      // Fallback if not valid JSON, try to split by newlines
      const list = content.split('\n').filter(line => line.trim().length > 0).map(l => l.replace(/^\d+\.\s*/, ''))
      result = { chapters: list, description: '' }
    }

    res.json(result)

  } catch (e) {
    console.error('Topic Plan Error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// Generate PPT Background
router.post('/generate-ppt/background', authenticateToken, async (req, res) => {
  let { topic, context, level, model, chapterList, currentChapterIndex, chapterContent, requirements, chapterId, topicId, topicTitle, chapterTitle, levelNum, levelTitle, clientKey, language, group } = req.body;
  
  console.log(`[PPT Background] Request received. ChapterId: ${chapterId}, TopicId: ${topicId}, Group (from body): '${group}'`);

  if (!topic || !chapterId) return res.status(400).json({ error: 'Missing required fields' });

  res.json({ status: 'processing', message: 'PPT generation started in background' });

  (async () => {
      try {
          // If group or levelTitle is missing, try to fetch from DB
          if (!group || !levelTitle) {
              try {
                  let levelDoc;
                  // Try by Topic ID first if available
                  if (topicId) {
                      levelDoc = await CourseLevel.findOne({ 'topics._id': topicId });
                  }
                  
                  // If not found or no topicId, try by Chapter ID
                  if (!levelDoc) {
                      levelDoc = await CourseLevel.findOne({
                          $or: [
                              { 'topics.chapters.id': chapterId },
                              { 'topics.chapters._id': chapterId }
                          ]
                      });
                  }

                  // If not found, try by Level and Topic (Robust fallback for new chapters)
                  if (!levelDoc && levelNum && topicTitle) {
                       console.log(`[Background] Chapter ID lookup failed, trying by Level ${levelNum} and Topic ${topicTitle}`);
                       levelDoc = await CourseLevel.findOne({
                           level: Number(levelNum),
                           'topics.title': topicTitle
                       });
                  }

                  if (levelDoc) {
                      if (!group && levelDoc.group) {
                          group = levelDoc.group;
                          console.log(`[Background] Fetched group from DB: ${group}`);
                      }
                      if (!levelTitle && levelDoc.title) {
                          levelTitle = levelDoc.title;
                          console.log(`[Background] Fetched levelTitle from DB: ${levelTitle}`);
                      }
                  }
              } catch (e) {
                  console.warn('[Background] Failed to fetch info from DB', e);
              }
          }

          // Pre-calculate and log the expected path
          const sanitizeForLog = (str) => str.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, '');
          const safeLevelForLog = levelTitle ? sanitizeForLog(levelTitle) : ('level' + sanitizeForLog(String(levelNum)));
          const safeTopicForLog = sanitizeForLog(topicTitle);
          const safeChapterForLog = sanitizeForLog(chapterTitle) + '.html';
          const safeGroupForLog = group ? sanitizeForLog(group) : '';
          
          let expectedPath = '';
          if (safeGroupForLog) {
              expectedPath = `courseware/${safeGroupForLog}/${safeLevelForLog}/${safeTopicForLog}/${safeChapterForLog}`;
          } else {
              // Fallback logic (similar to saving logic)
              let subjectFolder = '';
              if (context && /python/i.test(context)) subjectFolder = 'Python';
              else if (context && /web/i.test(context)) subjectFolder = 'Web';
              
              if (subjectFolder) {
                  expectedPath = `courseware/${subjectFolder}/${safeLevelForLog}/${safeTopicForLog}/${safeChapterForLog}`;
              } else {
                  expectedPath = `courseware/${safeLevelForLog}/${safeTopicForLog}/${safeChapterForLog}`;
              }
          }
          
          const pathLogMsg = `[Background] Expected Save Path: ${expectedPath}`;
          console.log(pathLogMsg);
          try { getIO().emit('ai_task_log', { message: pathLogMsg, clientKey }); } catch (e) {}

          const logMsg = `[Background] Starting PPT generation for chapter ${chapterId} (${topic})`;
          console.log(logMsg);
          try { getIO().emit('ai_task_log', { message: logMsg, clientKey }); } catch (e) {}
          
          let fullTopic = topic
          if (context) {
              fullTopic = `${context} - ${topic}`
          }

          const targetLang = language || 'C++'
          let systemPrompt = PPT_PROMPT.replace('{{topic}}', fullTopic).replace('{{level}}', level || 'Level 1').replace('{{language}}', targetLang)
          
          if (requirements && requirements.trim()) {
              systemPrompt += `\n\n【用户额外要求】\n${requirements}\n`
          }

          if (chapterContent && typeof chapterContent === 'string' && chapterContent.trim().length > 20) {
              systemPrompt += `\n\n【参考素材：本节课详细教案/内容】\n请优先基于以下内容提取知识点、案例和例题来生成 PPT，确保 PPT 内容与教案一致：\n${chapterContent.slice(0, 5000)}\n`
          }

          if (chapterList && Array.isArray(chapterList) && chapterList.length > 0) {
              const current = (currentChapterIndex !== undefined && currentChapterIndex >= 0) ? currentChapterIndex + 1 : '?'
              let contextInfo = `\n\n【重要：课程上下文信息】\n`
              contextInfo += `本节课是系列课程 "${context}" 中的第 ${current} 个主题（仅供参考难度定位，**请勿在PPT中显示“第${current}节”或总章节数**）。\n`
              contextInfo += `完整的章节列表如下：\n${chapterList.map((t, i) => `${i+1}. ${t}`).join('\n')}\n`
              contextInfo += `\n请根据此上下文规划内容：\n`
              contextInfo += `1. **避免重复**：如果前面的章节已经讲过基础概念（如定义、语法），本节课应快速回顾或直接进入进阶内容。\n`
              contextInfo += `2. **循序渐进**：确保难度与当前章节的位置相匹配。\n`
              contextInfo += `3. **聚焦主题**：本节课的核心主题是 "${topic}"，请紧扣此主题展开，不要跑题到其他章节的内容。\n`
              systemPrompt += contextInfo
          }

          const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `请为主题 "${fullTopic}" 生成 HTML 课件。请务必使用 ${targetLang} 语言进行讲解和代码演示。` }
          ]

          const payload = {
            model: model || 'o4-mini',
            messages,
            temperature: 0.3,
            max_tokens: 16000
          }

          const resp = await axios.post(YUN_API_URL, payload, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${YUN_API_KEY}`
            },
            timeout: 300000 // 5 minutes
          })

          let currentChunk = resp.data.choices?.[0]?.message?.content || ''
          let content = currentChunk
          let finishReason = resp.data.choices?.[0]?.finish_reason
          
          let loopCount = 0
          const MAX_LOOPS = 3
          
          while (finishReason === 'length' && loopCount < MAX_LOOPS) {
              console.log(`[Background] PPT truncated (length), attempting to continue... Loop: ${loopCount + 1}`)
              loopCount++
              
              messages.push({ role: 'assistant', content: currentChunk })
              messages.push({ role: 'user', content: 'Continue generating the rest. Do not repeat content.' })
              
              try {
                  const continueResp = await axios.post(YUN_API_URL, {
                      model: model || 'o4-mini',
                      messages,
                      temperature: 0.7,
                      max_tokens: 16000
                  }, {
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${YUN_API_KEY}`
                    },
                    timeout: 300000
                  })
                  
                  currentChunk = continueResp.data.choices?.[0]?.message?.content || ''
                  if (!currentChunk) break
                  
                  finishReason = continueResp.data.choices?.[0]?.finish_reason
                  content += currentChunk
              } catch (err) {
                  console.error('[Background] Error continuing generation:', err.message)
                  break
              }
          }

          if (finishReason === 'length') {
              console.warn(`[Background] PPT generation still truncated after ${loopCount} loops. Chapter: ${chapterId}`)
          }
          
          content = content.replace(/^```html\s*/, '').replace(/```$/, '')

          // Save File
          const sanitize = (str) => str.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, '');
          
          // Determine subject folder
          let subjectFolder = '';
          if (context && /python/i.test(context)) subjectFolder = 'Python';
          else if (context && /web/i.test(context)) subjectFolder = 'Web';

          const safeLevel = levelTitle ? sanitize(levelTitle) : ('level' + sanitize(String(levelNum)));
          const safeTopic = sanitize(topicTitle);
          const safeChapter = sanitize(chapterTitle) + '.html';
          const safeGroup = group ? sanitize(group) : '';
          
          let relativePath;
          
          // Try COS Upload first
          if (cos) {
              let cosKey = '';
              if (safeGroup) {
                  cosKey = `courseware/${safeGroup}/${safeLevel}/${safeTopic}/${safeChapter}`;
              } else if (subjectFolder) {
                  cosKey = `courseware/${subjectFolder}/${safeLevel}/${safeTopic}/${safeChapter}`;
              } else {
                  cosKey = `courseware/${safeLevel}/${safeTopic}/${safeChapter}`;
              }
              
              try {
                  const cosUrl = await uploadToCos(cosKey, content);
                  console.log(`[Background] PPT uploaded to COS: ${cosUrl}`);
                  relativePath = cosUrl;
              } catch (cosErr) {
                  console.error('[Background] COS Upload failed, falling back to local storage:', cosErr);
                  // Fallback logic below...
              }
          }

          // Local Storage Fallback (if COS not configured or failed)
          if (!relativePath) {
              const baseDir = path.join(__dirname, '../public/courseware');
              let targetDir;
              
              if (safeGroup) {
                  targetDir = path.join(baseDir, safeGroup, safeLevel, safeTopic);
                  relativePath = `/public/courseware/${safeGroup}/${safeLevel}/${safeTopic}/${safeChapter}`;
              } else if (subjectFolder) {
                  targetDir = path.join(baseDir, subjectFolder, safeLevel, safeTopic);
                  relativePath = `/public/courseware/${subjectFolder}/${safeLevel}/${safeTopic}/${safeChapter}`;
              } else {
                  targetDir = path.join(baseDir, safeLevel, safeTopic);
                  relativePath = `/public/courseware/${safeLevel}/${safeTopic}/${safeChapter}`;
              }
              
              if (!fs.existsSync(targetDir)) {
                  fs.mkdirSync(targetDir, { recursive: true });
              }
              
              const fullPath = path.join(targetDir, safeChapter);
              fs.writeFileSync(fullPath, content, 'utf8');
              console.log(`[Background] PPT saved to ${fullPath}`);
          }

          // Update Database
          let query = {};
          if (topicId) {
              query = { 'topics._id': topicId };
          } else {
              query = {
                $or: [
                    { 'topics.chapters.id': chapterId },
                    { 'topics.chapters._id': chapterId }
                ]
              };
          }

          let courseLevel = await CourseLevel.findOne(query);

          if (courseLevel) {
              let chapterFound = false;
              let foundChapterTitle = '';
              for (const topic of courseLevel.topics) {
                  // If topicId is provided, ensure we are looking at the correct topic
                  if (topicId && topic._id && topic._id.toString() !== topicId) continue;

                  let chapter;
                  if (mongoose.Types.ObjectId.isValid(chapterId)) {
                      chapter = topic.chapters.find(c => c._id && c._id.toString() === chapterId);
                  }
                  if (!chapter) {
                      chapter = topic.chapters.find(c => c.id === chapterId);
                  }

                  if (chapter) {
                      chapter.resourceUrl = relativePath;
                      chapter.contentType = 'html';
                      chapterFound = true;
                      foundChapterTitle = chapter.title;
                      break;
                  }
              }
              if (chapterFound) {
                  await courseLevel.save();
                  console.log(`[Background] Database updated for chapter ${chapterId}`);
                  
                  // Notify client
                  getIO().emit('ai_task_complete', {
                      chapterId,
                      chapterTitle: foundChapterTitle,
                      clientKey,
                      type: 'ppt',
                      status: 'success',
                      message: 'PPT 生成完成'
                  });
              }
          } else {
              console.error(`[Background] CourseLevel not found for chapter ${chapterId} (PPT)`);
              // Notify client of error
              getIO().emit('ai_task_complete', {
                  chapterId,
                  clientKey,
                  type: 'ppt',
                  status: 'error',
                  message: 'PPT 生成失败: 数据库记录未找到'
              });
          }

      } catch (err) {
          console.error('[Background] Error generating PPT:', err);
          // Notify client of error
          getIO().emit('ai_task_complete', {
              chapterId,
              chapterTitle: chapterTitle, // Use the title from request body
              clientKey,
              type: 'ppt',
              status: 'error',
              message: 'PPT 生成失败: ' + err.message
          });
      }
  })();
});

// Generate Lesson Plan Background
router.post('/lesson-plan/background', authenticateToken, async (req, res) => {
  const { topic, context, level, requirements, model, chapterId, topicId, clientKey, language } = req.body;
  
  if (!topic || !chapterId) return res.status(400).json({ error: 'Missing required fields' });

  res.json({ status: 'processing', message: 'Lesson plan generation started in background' });

  (async () => {
      try {
          const logMsg = `[Background] Starting Lesson Plan for chapter ${chapterId} (${topic})`;
          console.log(logMsg);
          try { getIO().emit('ai_task_log', { message: logMsg, clientKey }); } catch (e) {}
          
          let targetLang = language || 'C++';
          let codeLang = 'cpp';
          
          // Auto-detect if not provided
          if (!language && context && /python/i.test(context)) {
            targetLang = 'Python';
          }
          
          if (/python/i.test(targetLang)) {
              codeLang = 'python';
          }

          let systemPrompt = LESSON_PLAN_PROMPT
            .replace('{{language}}', targetLang)
            .replace('{{code_lang}}', codeLang);
          
          let userPrompt = `请为 "${context}" 课程中的 "${topic}" 章节编写一份详细的教案。`
          userPrompt += `\n难度等级：${level}`
          if (requirements) {
              userPrompt += `\n额外要求：${requirements}`
          }

          const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]

          const payload = {
            model: model || 'o4-mini',
            messages,
            temperature: 0.7,
            max_tokens: 16000
          }

          const resp = await axios.post(YUN_API_URL, payload, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${YUN_API_KEY}`
            },
            timeout: 120000
          })

          const content = resp.data.choices?.[0]?.message?.content || ''

          // Update Database
          let query = {};
          if (topicId) {
              query = { 'topics._id': topicId };
          } else {
              query = {
                $or: [
                    { 'topics.chapters.id': chapterId },
                    { 'topics.chapters._id': chapterId }
                ]
              };
          }

          let courseLevel = await CourseLevel.findOne(query);

          if (courseLevel) {
              let chapterFound = false;
              let foundChapterTitle = '';
              for (const topic of courseLevel.topics) {
                  // If topicId is provided, ensure we are looking at the correct topic
                  if (topicId && topic._id && topic._id.toString() !== topicId) continue;

                  let chapter;
                  if (mongoose.Types.ObjectId.isValid(chapterId)) {
                      chapter = topic.chapters.find(c => c._id && c._id.toString() === chapterId);
                  }
                  if (!chapter) {
                      chapter = topic.chapters.find(c => c.id === chapterId);
                  }

                  if (chapter) {
                      chapter.content = content;
                      chapter.contentType = 'markdown';
                      chapterFound = true;
                      foundChapterTitle = chapter.title;
                      break;
                  }
              }
              if (chapterFound) {
                  await courseLevel.save();
                  console.log(`[Background] Database updated for chapter ${chapterId} (Lesson Plan)`);
                  
                  // Notify client
                  getIO().emit('ai_task_complete', {
                      chapterId,
                      chapterTitle: foundChapterTitle,
                      clientKey,
                      type: 'lesson-plan',
                      status: 'success',
                      message: '教案生成完成'
                  });
              } else {
                  console.warn(`[Background] Chapter ${chapterId} found in DB query but not in iteration (Lesson Plan)`);
              }
          } else {
              console.error(`[Background] CourseLevel not found for chapter ${chapterId} (Lesson Plan)`);
              throw new Error('Database record not found for this chapter');
          }

      } catch (err) {
          console.error('[Background] Error generating Lesson Plan:', err);
          // Notify client of error
          getIO().emit('ai_task_complete', {
              chapterId,
              chapterTitle: topic, // In lesson plan route, 'topic' is the chapter title
              clientKey,
              type: 'lesson-plan',
              status: 'error',
              message: '教案生成失败: ' + err.message
          });
      }
  })();
});

// Generate Topic Plan Background
router.post('/topic-plan/background', authenticateToken, async (req, res) => {
  const { topic, level, model, mode, existingChapters, topicId, levelId, clientKey } = req.body;
  
  if (!topic || !topicId) return res.status(400).json({ error: 'Missing required fields' });

  res.json({ status: 'processing', message: 'Topic plan generation started in background' });

  (async () => {
      try {
          const logMsg = `[Background] Starting Topic Plan (${mode}) for topic ${topicId} (${topic})`;
          console.log(logMsg);
          try { getIO().emit('ai_task_log', { message: logMsg, clientKey }); } catch (e) {}
          
          let userPrompt = `主题：${topic}\n难度：${level || 'Level 1'}`

          if (existingChapters && Array.isArray(existingChapters) && existingChapters.length > 0) {
              userPrompt += `\n\n当前已存在的章节信息如下（请参考这些内容生成更精确的描述，避免重复或矛盾）：\n`
              existingChapters.forEach((ch, idx) => {
                  userPrompt += `${idx + 1}. ${ch.title}\n`
                  if (ch.contentPreview) {
                      userPrompt += `   摘要: ${ch.contentPreview}\n`
                  }
              })
          }
          
          let systemPrompt = TOPIC_PLAN_PROMPT
          if (mode === 'description') {
              systemPrompt = TOPIC_DESC_PROMPT
          }

          const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]

          const payload = {
            model: model || 'gemini-2.5-flash',
            messages,
            temperature: 0.7,
            max_tokens: 4000
          }

          const resp = await axios.post(YUN_API_URL, payload, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${YUN_API_KEY}`
            },
            timeout: 60000
          })

          let content = resp.data.choices?.[0]?.message?.content || ''
          
          // Update Database
          const courseLevel = await CourseLevel.findById(levelId);
          if (courseLevel) {
              const topicObj = courseLevel.topics.id(topicId);
              if (topicObj) {
                  if (mode === 'description') {
                      topicObj.description = content;
                  } else {
                      // Chapters mode
                      content = content.replace(/```json\s*/g, '').replace(/```/g, '').trim()
                      let result = {}
                      try {
                        const parsed = JSON.parse(content)
                        if (Array.isArray(parsed)) {
                            result = { chapters: parsed }
                        } else {
                            result = parsed
                        }
                      } catch (e) {
                        const list = content.split('\n').filter(line => line.trim().length > 0).map(l => l.replace(/^\d+\.\s*/, ''))
                        result = { chapters: list }
                      }

                      if (result.chapters && Array.isArray(result.chapters)) {
                          // Append new chapters
                          const startIdx = topicObj.chapters.length + 1;
                          const prefix = `${courseLevel.level}-${courseLevel.topics.indexOf(topicObj) + 1}`;
                          
                          result.chapters.forEach((item, idx) => {
                              // Handle both string (title only) and object (title + content) formats
                              let title = '';
                              let content = '';
                              
                              if (typeof item === 'string') {
                                  title = item;
                              } else if (typeof item === 'object' && item !== null) {
                                  title = item.title || '未命名章节';
                                  content = item.content || '';
                              }

                              topicObj.chapters.push({
                                  id: `${prefix}-${startIdx + idx}`,
                                  title: title,
                                  content: content,
                                  contentType: 'markdown',
                                  problemIds: []
                              });
                          });
                      }
                  }
                  await courseLevel.save();
                  console.log(`[Background] Database updated for topic ${topicId}`);
                  
                  // Notify client
                  getIO().emit('ai_task_complete', {
                      chapterId: topicId, // Using topicId as chapterId for consistency in frontend map
                      chapterTitle: topicObj.title,
                      clientKey,
                      type: mode === 'description' ? 'topic-desc' : 'topic-chapters',
                      status: 'success',
                      message: mode === 'description' ? '知识点描述生成完成' : '章节列表生成完成'
                  });
              }
          }

      } catch (err) {
          console.error('[Background] Error generating Topic Plan:', err);
          // Notify client of error
          getIO().emit('ai_task_complete', {
              chapterId: topicId,
              chapterTitle: topic, // Use the topic name from request
              clientKey,
              type: mode === 'description' ? 'topic-desc' : 'topic-chapters',
              status: 'error',
              message: '生成失败: ' + err.message
          });
      }
  })();
});

// Generate Solution Report and Upload to Hydro
router.post('/generate-solution-report', authenticateToken, async (req, res) => {
  try {
    const { docId, problemId, content, domainId, force } = req.body
    
    if (!docId || !content) {
      return res.status(400).json({ error: 'Missing docId or content' })
    }

    // Check if already generated
    // Must include domainId in query to find the specific document version (referencing problem vs original)
    const query = { docId: docId }
    if (domainId) {
        query.domainId = domainId
    }
    
    const doc = await Document.findOne(query)
    if (!doc) {
         console.error(`[Generate Report] Document not found for docId: ${docId}, domainId: ${domainId}`)
         return res.status(404).json({ error: 'Document not found' })
    }

    console.log(`[Generate Report] Processing doc: ${doc.docId}, Domain: ${doc.domainId}, HasRef: ${!!doc.reference}`)

    if (doc.solutionGenerated && !force) {
        return res.json({ 
            success: true, 
            skipped: true, 
            results: [],
            message: 'Solution already generated (skipped)' 
        })
    }

    // 1. Generate Solution (Markdown + Code)
    // Fix: Pass 'C++' as language, and append content separately
    const solutionPrompt = getSolutionPrompt('C++') + `\n\n题目内容：\n${content}`
    const solutionRes = await axios.post(YUN_API_URL, {
      model: 'gemini-2.5-flash', // Use a fast model
      messages: [{ role: 'user', content: solutionPrompt }],
      temperature: 0.7
    }, {
      headers: { 'Authorization': `Bearer ${YUN_API_KEY}` }
    })
    
    const solutionText = solutionRes.data.choices[0].message.content
    
    // Extract Code
    let stdCode = '// No code generated'
    
    console.log('[Generate Report] Solution Text Preview:', solutionText.substring(0, 500).replace(/\n/g, '\\n'))

    // Strategy 1: Look for explicit AC_CODE marker (OUTSIDE block)
    let codeMatch = solutionText.match(/<!--\s*AC_CODE\s*-->\s*```(?:\w+)?\s*([\s\S]*?)```/)
    
    // Strategy 1b: Look for explicit AC_CODE marker (INSIDE block)
    if (!codeMatch) {
        codeMatch = solutionText.match(/```(?:\w+)?\s*<!--\s*AC_CODE\s*-->\s*([\s\S]*?)```/)
    }

    // Strategy 2: Look for C++/CPP code blocks
    if (!codeMatch) {
        // Find all cpp blocks
        const cppMatches = [...solutionText.matchAll(/```(?:cpp|c\+\+|C\+\+)\s*([\s\S]*?)```/gi)]
        if (cppMatches.length > 0) {
             // Prefer the one with #include, otherwise the longest one
             const withInclude = cppMatches.find(m => m[1].includes('#include'))
             if (withInclude) {
                 codeMatch = withInclude
             } else {
                 // Sort by length descending
                 cppMatches.sort((a, b) => b[1].length - a[1].length)
                 codeMatch = cppMatches[0]
             }
        }
    }
    
    // Strategy 3: Look for any code block containing typical C++ keywords
    if (!codeMatch) {
        const allBlocks = [...solutionText.matchAll(/```(?:\w+)?\s*([\s\S]*?)```/g)]
        for (const match of allBlocks) {
            if (match[1].includes('#include') || match[1].includes('using namespace std') || match[1].includes('int main')) {
                codeMatch = match
                break
            }
        }
    }
    
    if (codeMatch) {
        stdCode = codeMatch[1].trim()
        // Remove <!-- AC_CODE --> if it was captured inside
        stdCode = stdCode.replace(/<!--\s*AC_CODE\s*-->/g, '').trim()
    }
    
    // 2. Generate HTML Report
    const reportPrompt = SOLUTION_REPORT_PROMPT + `\n\n题目内容：\n${content}\n\n题解内容：\n${solutionText}`
    const reportRes = await axios.post(YUN_API_URL, {
      model: 'gemini-2.5-flash',
      messages: [{ role: 'user', content: reportPrompt }],
      temperature: 0.7
    }, {
      headers: { 'Authorization': `Bearer ${YUN_API_KEY}` }
    })
    
    let reportHtml = reportRes.data.choices[0].message.content
    // Clean up markdown code blocks if present
    reportHtml = reportHtml.replace(/^```html\s*/, '').replace(/```$/, '')
    
    // 3. Upload to Hydro
    // Check for reference problem
    let targetPid = problemId || docId
    let targetDomainId = domainId

    if (doc.reference && doc.reference.pid) {
        // Use the numeric PID from the reference (e.g., 11)
        // Do NOT resolve to alias (e.g., P1) because:
        // 1. The upload URL works with the numeric ID (e.g., /p/11/files).
        // 2. The database docId is a Number, so converting to "P1" causes a CastError during update.
        targetPid = doc.reference.pid
        targetDomainId = doc.reference.domainId || domainId
        
        console.log(`[Upload] Redirecting upload from ${docId} to reference ${targetPid} (Domain: ${targetDomainId})`)
    } else {
        console.log(`[Upload] No reference found for ${docId}, uploading to self.`)
    }
    
    const results = []
    
    // Prepare files for single request upload
    const filesToUpload = [
        { name: 'solution.md', content: Buffer.from(solutionText, 'utf-8') },
        { name: 'std.cpp', content: Buffer.from(stdCode, 'utf-8') },
        { name: 'report.html', content: Buffer.from(reportHtml, 'utf-8') }
    ]
    
    try {
        // Upload all files in a single request to prevent overwriting
        await uploadToHydro(targetPid, targetDomainId, filesToUpload)
        
        console.log(`[Generate Report] All 3 files uploaded successfully for ${targetPid}`)
        results.push('solution.md uploaded')
        results.push('std.cpp uploaded')
        results.push('report.html uploaded')
        
        // Update status on the TARGET document (the original problem)
        const updateQuery = { docId: targetPid }
        if (targetDomainId) {
            updateQuery.domainId = targetDomainId
        }
        
        // We know we just uploaded these files
        const uploadedFileNames = filesToUpload.map(f => ({ name: f.name, size: f.content.length }))

        // Use $addToSet to avoid duplicates if we run this multiple times, 
        // but since we might overwrite files, maybe we should merge?
        // For simplicity, let's just set the list to these 3 files if it's empty, 
        // or if we want to be smarter, we should probably fetch the full list from Hydro if we want accuracy.
        // But for now, let's just assume these are the files we care about.
        // Actually, let's just update the specific files in the array or add them.
        // But MongoDB array updates are tricky.
        // Let's just set 'solutionGenerated' and maybe a 'generatedFiles' field?
        // The user wants "hydroFiles".
        
        // Let's try to be safe: Pull these names first then push them? Or just set them if we assume these are the only ones?
        // Let's just use $set for now, assuming these are the main ones. 
        // BETTER: Fetch the current doc, update the array in JS, then save.
        
        const targetDoc = await Document.findOne(updateQuery)
        if (targetDoc) {
            let currentFiles = targetDoc.hydroFiles || []
            // Remove existing entries with same name
            currentFiles = currentFiles.filter(f => !uploadedFileNames.find(uf => uf.name === f.name))
            // Add new ones
            currentFiles.push(...uploadedFileNames)
            
            await Document.updateOne(updateQuery, { 
                $set: { 
                    solutionGenerated: true,
                    hydroFiles: currentFiles
                } 
            })
             console.log(`[Generate Report] Marked document ${targetPid} as solutionGenerated and updated file list`)
        } else {
             console.warn(`[Generate Report] Could not find document ${targetPid} to mark as solutionGenerated`)
             // Fallback: mark the current doc if we couldn't find the target
             if (docId !== targetPid) {
                 await Document.updateOne({ _id: doc._id }, { $set: { solutionGenerated: true } })
             }
        }

    } catch (e) {
        console.error(`[Generate Report] Upload failed: ${e.message}`)
        results.push(`Upload failed: ${e.message}`)
    }

    res.json({ 
      success: true, 
      results,
      solution: solutionText,
      code: stdCode,
      report: reportHtml
    })

  } catch (error) {
    console.error('Generate Report Error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get Hydro Files
router.get('/hydro/files', authenticateToken, async (req, res) => {
    try {
        const { pid, domainId, sync } = req.query
        if (!pid) return res.status(400).json({ error: 'Missing pid' })

        if (!HYDRO_CONFIG.API_URL) {
            return res.status(500).json({ error: 'Hydro API not configured' })
        }

        const baseUrl = HYDRO_CONFIG.API_URL.replace(/\/$/, '')
        let url
        let refererUrl

        if (domainId) {
            url = `${baseUrl}/d/${domainId}/p/${pid}/files`
            refererUrl = `${baseUrl}/d/${domainId}/p/${pid}/files`
        } else {
            url = `${baseUrl}/p/${pid}/files`
            refererUrl = `${baseUrl}/p/${pid}/files`
        }

        // Ensure login
        if (!HYDRO_CONFIG.API_TOKEN && !currentHydroCookie) {
            await loginToHydro()
        }

        const getHeaders = () => {
            const h = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
                'Origin': HYDRO_CONFIG.API_URL,
                'Referer': refererUrl
            }
            if (HYDRO_CONFIG.API_TOKEN) {
                h['Authorization'] = `Bearer ${HYDRO_CONFIG.API_TOKEN}`
            } else if (currentHydroCookie) {
                h['Cookie'] = currentHydroCookie
            }
            return h
        }

        let files = []
        try {
            console.log(`[Hydro Files] Fetching from ${url}`)
            const response = await axios.get(url, { headers: getHeaders() })
            
            if (Array.isArray(response.data)) {
                files = response.data
            } else if (response.data && Array.isArray(response.data.additional_file)) {
                files = response.data.additional_file
            } else {
                console.warn('[Hydro Files] Unknown response format:', Object.keys(response.data || {}))
            }

            console.log(`[Hydro Files] Got ${files.length} files`)
        } catch (e) {
            // Retry login on 401/403
            if (e.response && (e.response.status === 401 || e.response.status === 403) && !HYDRO_CONFIG.API_TOKEN) {
                console.log('[Hydro Files] Auth failed, retrying login...')
                await loginToHydro()
                try {
                    const response = await axios.get(url, { headers: getHeaders() })
                    
                    if (Array.isArray(response.data)) {
                        files = response.data
                    } else if (response.data && Array.isArray(response.data.additional_file)) {
                        files = response.data.additional_file
                    }

                    console.log(`[Hydro Files] Got ${files.length} files (Retry)`)
                } catch (retryErr) {
                    throw retryErr
                }
            } else {
                throw e
            }
        }

        // Sync to DB if requested
        if (sync === 'true' && Array.isArray(files)) {
            const updateQuery = { docId: pid }
            if (domainId) updateQuery.domainId = domainId
            
            // Filter only relevant fields to save space
            const cleanFiles = files.map(f => ({ name: f.name, size: f.size }))
            
            await Document.updateOne(updateQuery, { $set: { hydroFiles: cleanFiles } })
            console.log(`[Hydro Files] Synced ${files.length} files for ${pid}`)
        }

        return res.json(files)

    } catch (e) {
        console.error('Get Hydro Files Error:', e.message)
        res.status(500).json({ error: e.message })
    }
})

export default router
