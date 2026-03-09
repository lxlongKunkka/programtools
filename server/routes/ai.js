import express from 'express'
import axios from 'axios'
import https from 'https'
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
import { proxyImageToCos } from '../utils/cosUploader.js'
import { debugLog } from '../utils/logger.js'
import { getIO } from '../socket/index.js'
import { 
  TRANSLATE_PROMPT, 
  SOLUTION_PROMPT, 
  getSolutionPrompt,
  CHECKER_PROMPT, 
  getSolvePrompt,
  getSolveWithCodePrompt,
  getDataGenPrompt,
  SOLUTION_REPORT_PROMPT,
  META_PROMPT,
  LESSON_PLAN_PROMPT,
  PPT_PROMPT,
  TOPIC_PLAN_PROMPT,
  TOPIC_DESC_PROMPT,
  HYDRO_REFINE_PROMPT,
  ANSWER_GEN_PROMPT,
  SUMMARY_PROMPT
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

// Global HTTPS Agent for connection reuse
// const hydroAgent = new https.Agent({ keepAlive: true })

// Helper to merge new cookies into existing cookie string
function mergeCookies(oldCookieString, newSetCookieHeader) {
    if (!newSetCookieHeader) return oldCookieString
    
    const cookieMap = new Map()
    
    // Parse old cookies
    if (oldCookieString) {
        oldCookieString.split(';').forEach(c => {
            const [key, ...val] = c.trim().split('=')
            if (key) cookieMap.set(key, val.join('='))
        })
    }
    
    // Parse new cookies
    const newCookies = Array.isArray(newSetCookieHeader) ? newSetCookieHeader : [newSetCookieHeader]
    newCookies.forEach(c => {
        const part = c.split(';')[0]
        const [key, ...val] = part.trim().split('=')
        if (key) {
            // Handle deletion (empty value)
            const value = val.join('=')
            if (value === '' || value.toLowerCase() === 'deleted') {
                cookieMap.delete(key)
            } else {
                cookieMap.set(key, value)
            }
        }
    })
    
    // Reconstruct string
    return Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`).join('; ')
}

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
                'Content-Type': 'application/json',
                'Origin': HYDRO_CONFIG.API_URL.replace(/\/$/, ''),
                'Referer': HYDRO_CONFIG.API_URL,
                'Connection': 'close'
            }
        })

        const setCookie = response.headers['set-cookie']
        if (setCookie) {
            // Reset cookie jar on fresh login to avoid pollution
            currentHydroCookie = mergeCookies('', setCookie)
            console.log('[Hydro Login] Login successful. Cookie:', currentHydroCookie)
            return currentHydroCookie
        }
    } catch (e) {
        console.error('[Hydro Login] Error:', e.message)
    }
    return null
}

const HYDRO_STATUS_MAP = {
    0: 'Waiting',
    1: 'Accepted',
    2: 'Wrong Answer',
    3: 'Time Limit Exceeded',
    4: 'Memory Limit Exceeded',
    5: 'Output Limit Exceeded',
    6: 'Runtime Error',
    7: 'Compile Error',
    8: 'System Error',
    9: 'Canceled',
    10: 'Etc',
    11: 'Hacked',
    20: 'Judging',
    21: 'Compiling',
    22: 'Fetched',
    30: 'Ignored',
    31: 'Format Error',
    32: 'Hack Successful',
    33: 'Hack Unsuccessful'
}

async function fetchHydroRecord(domainId, recordId) {
    if (!HYDRO_CONFIG.API_URL) return null
    const url = `${HYDRO_CONFIG.API_URL.replace(/\/$/, '')}/api/domain/${domainId}/record/${recordId}`
    
    try {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': HYDRO_CONFIG.API_URL
        }
        if (currentHydroCookie) headers['Cookie'] = currentHydroCookie

        const res = await axios.get(url, { headers, timeout: 3000 })
        if (res.data && res.data.doc) return res.data.doc
    } catch (e) {
        console.warn(`[Hydro Record] Failed to fetch ${recordId}: ${e.message}`)
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
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Origin': HYDRO_CONFIG.API_URL.replace(/\/$/, ''),
            'Referer': refererUrl,
            'Sec-Ch-Ua': '"Not(A:Brand";v="99", "Microsoft Edge";v="143", "Chromium";v="143"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin'
        }
        // IMPORTANT: HydroOJ seems to validate Origin/Referer strictly.
        // If we are uploading to a specific problem, the Referer MUST match exactly what the browser sends.
        // Browser sends: https://acjudge.com/d/wfoj/p/P1/files
        // Our code constructs: ${baseUrl}/d/${domainId}/p/${problemId}/files
        
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
        const createForm = () => {
            const f = new FormData()
            f.append('operation', 'upload_file') 
            f.append('type', 'additional_file') 
            f.append('file', file.content, {
                filename: file.name,
                contentType: 'application/octet-stream' 
            })
            return f
        }

        let form = createForm()
        
        // Force login before EACH file upload to guarantee a fresh session
        // This is the "Nuclear Option" because previous attempts to maintain session failed
        if (!HYDRO_CONFIG.API_TOKEN) {
            await loginToHydro()
        }

        const headers = {
            ...getHeaders(),
            ...form.getHeaders()
        }

        try {
            console.log(`[Upload] Uploading ${file.name} to ${uploadUrl}...`)
            if (currentHydroCookie) console.log(`[Upload] Using Cookie: ${currentHydroCookie.substring(0, 20)}...`)
            
            // Disable redirects to catch 3xx responses
            const response = await axios.post(uploadUrl, form, { 
                headers: { ...headers, 'Connection': 'close' },
                maxRedirects: 0,
                validateStatus: status => status >= 200 && status < 400 
            })
            
            // Strict check: Inspect response body for application-level errors
            if (typeof response.data === 'string') {
                 // If it looks like HTML, it's probably a login page or error page
                 if (response.data.trim().startsWith('<')) {
                     const err = new Error('Response is HTML (likely login page)')
                     err.response = { status: 401 } // Force retry
                     throw err
                 }
            }

            if (response.data && typeof response.data === 'object') {
                if (response.data.url) {
                     const err = new Error('Soft Redirect')
                     err.response = { status: 401 } // Force retry
                     throw err
                }
                if (response.data.error) {
                    throw new Error(`Hydro API Error: ${response.data.error}`)
                }
                if (response.data.success === false) {
                    throw new Error(`Hydro API returned success: false. Msg: ${response.data.message || 'Unknown'}`)
                }
            }

            // Update cookie if present to maintain session
            if (response.headers['set-cookie']) {
                const oldCookie = currentHydroCookie
                currentHydroCookie = mergeCookies(currentHydroCookie, response.headers['set-cookie'])
                console.log(`[Upload] Cookie updated from response.\nOld: ${oldCookie}\nNew: ${currentHydroCookie}`)
            } else {
                // If no Set-Cookie, we should NOT clear the cookie, but we should check if the session is still valid
                // However, since we got a 200-399 status, we assume it's valid.
                // The issue might be that we are NOT updating the cookie if the server expects us to use the SAME cookie
                // but we are somehow losing it or using an old one in the next iteration?
                // Actually, currentHydroCookie is a global variable (module level), so it persists.
            }

            console.log(`[Upload] Success: ${file.name} (Status: ${response.status})`)
            results.push({ name: file.name, status: 'success' })
        } catch (e) {
            // Log detailed error for debugging
            if (e.response) {
                console.log(`[Upload] Error Status: ${e.response.status}`)
                if (e.response.data) console.log(`[Upload] Error Data:`, JSON.stringify(e.response.data).slice(0, 200))
            }

            // Handle 401/403 by re-logging in once
            if ((e.response && (e.response.status === 401 || e.response.status === 403)) || (e.message === 'Soft Redirect') || (e.message === 'Response is HTML (likely login page)') && !HYDRO_CONFIG.API_TOKEN) {
                console.log('[Upload] Auth failed (or Rate Limit). Current Cookie:', currentHydroCookie)
                console.log('[Upload] Retrying login...')
                
                // Clear old cookie to ensure fresh login
                currentHydroCookie = null
                await loginToHydro()
                
                // Recreate form for retry because the stream is consumed
                form = createForm()
                const newHeaders = {
                    ...getHeaders(),
                    ...form.getHeaders()
                }
                try {
                    const retryResponse = await axios.post(uploadUrl, form, { 
                        headers: { ...newHeaders, 'Connection': 'close' },
                        maxRedirects: 0,
                        validateStatus: status => status >= 200 && status < 400 
                    })
                    
                    // Update cookie if present
                    if (retryResponse.headers['set-cookie']) {
                        currentHydroCookie = mergeCookies(currentHydroCookie, retryResponse.headers['set-cookie'])
                    }

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
        
        // Add delay between uploads (Increased to 2s to avoid rate limits)
        await new Promise(resolve => setTimeout(resolve, 3000))
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

router.post('/proxy-image', async (req, res) => {
  const { url } = req.body
  if (!url || !/^https?:\/\//.test(url)) return res.status(400).json({ error: 'invalid url' })
  try {
    const cosUrl = await proxyImageToCos(url)
    res.json({ cosUrl: cosUrl || null })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/translate', authenticateToken, checkModelPermission, async (req, res) => {
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
      model: model || 'gemini-2.5-flash',
      messages,
      temperature: 0.1,
      max_tokens: 32767
    }
    res.locals.logModel = payload.model

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
        
        // 1. 尝试提取 Markdown 代码块中�?JSON
        const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/i)
        if (jsonBlockMatch) {
            jsonStr = jsonBlockMatch[1].trim()
        } else {
            // 2. 如果没有代码块，尝试寻找最外层�?{}
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
            if (jsonObj.english) meta.english = jsonObj.english
            isJson = true
        } else {
            resultText = content
        }
    } catch (e) {
        // JSON 解析失败，尝试正则提取作为兜�?
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

                // 提取 english 字段
                const englishMatch = content.match(/"english"\s*:\s*"([\s\S]*?)"(?:\s*,|\s*})/)
                if (englishMatch) {
                    try {
                        meta.english = JSON.parse(`"${englishMatch[1]}"`)
                    } catch (e4) {
                        meta.english = englishMatch[1]
                            .replace(/\\n/g, '\n')
                            .replace(/\\"/g, '"')
                            .replace(/\\\\/g, '\\')
                            .replace(/\\t/g, '\t')
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
      // 如果�?JSON 模式且成功提取了 translation，我们信�?AI �?Markdown 格式�?
      // 不再进行 wrapLatexIfNeeded 等可能破坏格式的处理�?
      // 仅做必要的清理（�?input/output 块的合并�?
      let fixed = resultText

      if (!isJson) {
          fixed = wrapLatexIfNeeded(fixed)
      }

      fixed = fixed.replace(/(```)\s*(#+\s+)/g, '$1\n\n$2')
      fixed = fixed.replace(/([^\n])\s*(##+\s+)/g, '$1\n\n$2')

      // 如果没有�?JSON 中提取到元数据，尝试从文本中提取
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
            // 兼容多种格式�?
            // 1. ### 算法标签 \n Level1 数学1
            // 2. **算法标签** \n Level1 数学1
            // 3. 算法标签 \n Level1 数学1
            const tagsMatch = fixed.match(/(?:###|\*\*|)\s*算法标签(?:\*\*|)\s*\n+([\s\S]*?)(?:\n#|\n\n|$)/)
            if (tagsMatch) {
            const tagsText = tagsMatch[1].trim()
            // Split by common separators (space, comma, newline) and clean up
            meta.tags = tagsText.split(/[\s,，、]+/)
                .map(t => t.trim())
                .filter(t => t && !t.startsWith('**') && t !== '�? && !/^level\d+$/i.test(t)) 
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

// ── 翻译辅助函数 ──────────────────────────────────────────────────────────────

function parseTranslationContent(content) {
  let resultText = '', meta = { title: '', tags: [] }, isJson = false
  try {
    let jsonStr = content.trim()
    const jb = content.match(/```json\s*([\s\S]*?)\s*```/i)
    if (jb) { jsonStr = jb[1].trim() } else {
      const f = content.indexOf('{'), l = content.lastIndexOf('}')
      if (f !== -1 && l > f) jsonStr = content.substring(f, l + 1)
    }
    const obj = JSON.parse(jsonStr)
    if (obj.translation) {
      resultText = obj.translation; isJson = true
      if (obj.title) meta.title = obj.title
      if (Array.isArray(obj.tags)) meta.tags = obj.tags
      if (obj.english) meta.english = obj.english
    } else { resultText = content }
  } catch {
    let recovered = false
    try {
      const tm = content.match(/"translation"\s*:\s*"([\s\S]*?)"(?:\s*,|\s*})/)
      if (tm) {
        try { resultText = JSON.parse(`"${tm[1]}"`) }
        catch { resultText = tm[1].replace(/\\n/g,'\n').replace(/\\"/g,'"').replace(/\\\\/g,'\\').replace(/\\t/g,'\t') }
        isJson = true; recovered = true
        const tit = content.match(/"title"\s*:\s*"([^"]*?)"/)
        if (tit) meta.title = tit[1]
        const tag = content.match(/"tags"\s*:\s*\[([\s\S]*?)\]/)
        if (tag) { try { meta.tags = JSON.parse(`[${tag[1]}]`) } catch { meta.tags = tag[1].split(',').map(t=>t.trim().replace(/^"|"$/g,'')) } }
        const eng = content.match(/"english"\s*:\s*"([\s\S]*?)"(?:\s*,|\s*})/)
        if (eng) { try { meta.english = JSON.parse(`"${eng[1]}"`) } catch { meta.english = eng[1].replace(/\\n/g,'\n').replace(/\\"/g,'"').replace(/\\\\/g,'\\').replace(/\\t/g,'\t') } }
      }
    } catch {}
    if (!recovered) resultText = content.replace(/^```json\s*/i,'').replace(/\s*```$/i,'')
  }
  let fixed = resultText
  if (!isJson) fixed = wrapLatexIfNeeded(fixed)
  fixed = fixed.replace(/(```)\s*(#+\s+)/g,'$1\n\n$2').replace(/([^\n])\s*(##+\s+)/g,'$1\n\n$2')
  if (!isJson || (!meta.title && !meta.tags.length)) {
    try {
      const tm = fixed.match(/^#\s+(.+)$/m)
      if (tm) {
        let t = tm[1].trim()
        if (t === '题目标题' || t === 'Title') { const nl = fixed.substring(tm.index+tm[0].length).match(/^\s*([^#\s].*)$/m); t = nl ? nl[1].trim() : '' }
        if (/^题目标题[:：]/.test(t)) t = t.replace(/^题目标题[:：]\s*/,'')
        if (t === '题目标题') t = ''
        meta.title = t
      }
      const tagM = fixed.match(/(?:###|\*\*|)\s*算法标签(?:\*\*|)\s*\n+([\s\S]*?)(?:\n#|\n\n|$)/)
      if (tagM) meta.tags = tagM[1].trim().split(/[\s,，、]+/).map(t=>t.trim()).filter(t=>t&&!t.startsWith('**')&&t!=='�?&&!/^level\d+$/i.test(t))
    } catch {}
  }
  return { result: fixed, meta }
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'')
    .replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, (m, src) => {
      const altM = m.match(/alt=["']([^"']*)["']/i)
      const alt = altM ? altM[1] : ''
      return `\n![${alt}](${src})\n`
    })
    .replace(/<br\s*\/?>/gi,'\n').replace(/<\/?(p|div|li|tr|h[1-6])\b[^>]*>/gi,'\n')
    .replace(/<[^>]+>/g,'')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ')
    .replace(/\n{3,}/g,'\n\n').trim()
}

// 流式翻译接口（SSE�?
router.post('/translate/stream', authenticateToken, checkModelPermission, async (req, res) => {
  const { text, model } = req.body
  if (!text) { res.status(400).end(); return }
  const apiKey = YUN_API_KEY
  if (!apiKey) { res.status(500).end(); return }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const send = (obj) => { try { res.write(`data: ${JSON.stringify(obj)}\n\n`) } catch {} }

  // 提取图片占位符，避免 AI 删除图片链接
  // 故意�?AI 不可能误识别�?markdown 语法的格�?
  const imageMap = {}
  let imgCount = 0
  const textWithPlaceholders = String(text).replace(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g, (m, alt, url) => {
    const key = `IMGPH${imgCount++}IMGPH`
    imageMap[key] = m
    return key
  })

  const restoreImages = (str) => {
    // 用正则一次性恢复：同时兼容 AI 保留完整 IMGPH0IMGPH 和只�?IMGPH0 的情�?
    return str.replace(/IMGPH(\d+)IMGPH|IMGPH(\d+)(?!\d)/g, (match, a, b) => {
      const idx = a !== undefined ? a : b
      const key = `IMGPH${idx}IMGPH`
      return imageMap[key] || match
    })
  }

  try {
    const resp = await axios.post(YUN_API_URL, {
      model: model || 'gemini-2.5-flash',
      messages: [{ role: 'system', content: TRANSLATE_PROMPT }, { role: 'user', content: textWithPlaceholders }],
      temperature: 0.1, max_tokens: 32767, stream: true
    }, {
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      responseType: 'stream', timeout: 600000
    })

    let fullContent = '', sseBuffer = ''
    resp.data.on('data', (chunk) => {
      sseBuffer += chunk.toString()
      const lines = sseBuffer.split('\n'); sseBuffer = lines.pop()
      for (const line of lines) {
        const t = line.trim()
        if (!t.startsWith('data: ')) continue
        const d = t.slice(6).trim()
        if (d === '[DONE]') continue
        try {
          const parsed = JSON.parse(d)
          const delta = parsed.choices?.[0]?.delta?.content || ''
          if (delta) { fullContent += delta; send({ type: 'chunk', text: delta }) }
        } catch {}
      }
    })
    resp.data.on('end', () => {
      try {
        const { result, meta } = parseTranslationContent(fullContent)
        // 恢复图片占位�?
        const restoredResult = restoreImages(result)
        const restoredEnglish = restoreImages(meta.english || '')
        if (imgCount > 0) {
          console.log(`[翻译] 恢复 ${imgCount} 张图片占位符`)
        }
        send({ type: 'result', result: restoredResult, english: restoredEnglish, meta: { ...meta, english: restoredEnglish } })
      } catch (e) { send({ type: 'error', message: e.message }) }
      res.write('data: [DONE]\n\n'); res.end()
    })
    resp.data.on('error', (err) => { send({ type: 'error', message: err.message }); res.end() })
    req.on('close', () => { try { resp.data.destroy() } catch {} })
  } catch (err) {
    send({ type: 'error', message: err.message || 'Translation failed' }); res.end()
  }
})

// �?URL 抓取题目内容（Codeforces / AtCoder�?
router.get('/translate/fetch-url', authenticateToken, checkModelPermission, async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: '缺少 url 参数' })
  const isCodeforces = /codeforces\.com/i.test(url)
  const isAtCoder = /atcoder\.jp/i.test(url)
  if (!isCodeforces && !isAtCoder) return res.status(400).json({ error: '仅支�?Codeforces �?AtCoder 链接' })

  try {
    const resp = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      timeout: 15000
    })
    const html = resp.data
    let startIdx = -1
    if (isCodeforces) {
      startIdx = html.indexOf('class="problem-statement"')
      if (startIdx !== -1) startIdx = html.lastIndexOf('<div', startIdx)
    } else {
      startIdx = html.indexOf('id="task-statement"')
      if (startIdx !== -1) startIdx = html.lastIndexOf('<div', startIdx)
    }
    const chunk = startIdx !== -1 ? html.substring(startIdx, startIdx + 100000) : html
    const text = htmlToText(chunk).substring(0, 10000)
    return res.json({ text })
  } catch (err) {
    return res.status(500).json({ error: '抓取失败: ' + (err.message || '未知错误') })
  }
})

function parseMarkdownWithImages(text) {
  const parts = []
  const imageMap = {}
  // 匹配 Base64 图片
  const base64Regex = /!\[(.*?)\]\((data:image\/.*?;base64,.*?)\)/g
  // 匹配网络 URL 图片（http/https�?
  const urlRegex = /!\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g
  let lastIndex = 0
  let match
  let imgCount = 0

  // 先处�?Base64 图片
  while ((match = base64Regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', text: text.substring(lastIndex, match.index) })
    }

    const placeholder = `[[IMG_${imgCount}]]`
    imageMap[placeholder] = match[0] // Store the full markdown image tag

    // Insert placeholder text AND the image for the model to see
    parts.push({ type: 'text', text: placeholder })
    parts.push({
      type: 'image_url',
      image_url: {
        url: match[2]
      }
    })

    imgCount++
    lastIndex = base64Regex.lastIndex
  }

  console.log(`[图片提取] Base64 图片数量: ${imgCount}`)

  // 重置正则索引，处理网�?URL 图片
  base64Regex.lastIndex = 0
  const baseImgCount = imgCount
  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', text: text.substring(lastIndex, match.index) })
    }

    const placeholder = `[[IMG_${imgCount}]]`
    imageMap[placeholder] = match[0] // Store the full markdown image tag

    // Insert placeholder text (网络图片不用传给模型看，因为可能访问受限�?
    parts.push({ type: 'text', text: placeholder })

    imgCount++
    lastIndex = urlRegex.lastIndex
  }
  console.log(`[图片提取] 网络图片数量: ${imgCount - baseImgCount}`)

  if (lastIndex < text.length) {
    parts.push({ type: 'text', text: text.substring(lastIndex) })
  }

  if (parts.length === 0) {
    return { content: text, imageMap: {} }
  }

  return { content: parts, imageMap }
}

router.post('/refine-hydro', authenticateToken, checkModelPermission, async (req, res) => {
  try {
    const { text, model } = req.body
    if (!text) return res.status(400).json({ error: '缺少 text 字段' })

    const apiUrl = YUN_API_URL
    const apiKey = YUN_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'Server: missing YUN_API_KEY in environment' })

    const { content: userContent, imageMap } = parseMarkdownWithImages(text)

    const messages = [
      { role: 'system', content: HYDRO_REFINE_PROMPT },
      { role: 'user', content: userContent }
    ]

    const payload = {
      model: model || 'gemini-2.5-flash',
      messages,
      temperature: 0.1,
      max_tokens: 32767
    }
    res.locals.logModel = payload.model

    const resp = await axios.post(apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 600000
    })

    const data = resp.data
    let resultText = ''
    if (data.choices && data.choices[0] && data.choices[0].message) {
      resultText = data.choices[0].message.content
    } else if (data.choices && data.choices[0] && data.choices[0].text) {
      resultText = data.choices[0].text
    } else {
      resultText = JSON.stringify(data)
    }

    // Restore images from placeholders
    console.log('[AI优化] 开始恢复图片，占位符数�?', Object.keys(imageMap).length)
    let restoreCount = 0
    for (const [placeholder, originalImage] of Object.entries(imageMap)) {
      // Use a global replace in case of model repeated the placeholder (unlikely but possible)
      // Escape the placeholder for regex (brackets)
      const escapedPlaceholder = placeholder.replace(/\[/g, '\\[').replace(/\]/g, '\\]')
      const regex = new RegExp(escapedPlaceholder, 'g')
      const before = resultText
      resultText = resultText.replace(regex, originalImage)
      if (before !== resultText) {
        restoreCount++
      }
    }
    console.log('[AI优化] 成功恢复图片数量:', restoreCount)

    return res.json({ result: resultText })

  } catch (err) {
    console.error('Refine Hydro error:', err?.response?.data || err.message || err)
    const message = err?.response?.data || err.message || 'unknown error'
    return res.status(500).json({ error: 'Refine failed', detail: message })
  }
})

// �?Markdown 题解中提取纯净 AC 代码（与前端 extractPureCode 保持同步�?
function extractPureCode(content) {
  if (!content) return ''
  let code = ''
  const codeBlockPatterns = [
    /```(?:cpp|c\+\+)\s*\n([\s\S]*?)```/i,
    /```(?:python|py)\s*\n([\s\S]*?)```/i,
    /```java\s*\n([\s\S]*?)```/i,
    /```\s*\n([\s\S]*?)```/
  ]
  // 优先�?：起止双标记
  const startMarker = '<!-- AC_CODE_START -->'
  const endMarker = '<!-- AC_CODE_END -->'
  const si = content.indexOf(startMarker)
  const ei = content.indexOf(endMarker)
  if (si !== -1) {
    const region = (ei !== -1 && ei > si) ? content.substring(si + startMarker.length, ei) : content.substring(si + startMarker.length)
    for (const p of codeBlockPatterns) { const m = region.match(p); if (m?.[1]) { code = m[1].trim(); break } }
  }
  // 优先�?：旧式单标记
  if (!code) {
    const mi = content.indexOf('<!-- AC_CODE -->')
    if (mi !== -1) {
      const after = content.substring(mi)
      for (const p of codeBlockPatterns) { const m = after.match(p); if (m?.[1]) { code = m[1].trim(); break } }
    }
  }
  // 优先�?：固定节标题
  if (!code) {
    for (const title of ['## 4. 核心代码', '## 核心代码', '## 代码实现', '## 完整代码', '## AC代码', '## 参考代�?, '## 标准代码', '### 代码实现', '### 完整代码']) {
      const idx = content.indexOf(title)
      if (idx !== -1) {
        const next = content.indexOf('\n## ', idx + title.length)
        const region = next !== -1 ? content.substring(idx, next) : content.substring(idx)
        for (const p of codeBlockPatterns) { const m = region.match(p); if (m?.[1]) { code = m[1].trim(); break } }
        if (code) break
      }
    }
  }
  // 优先�?（兜底）：最后一个代码块
  if (!code) {
    for (const p of [/```(?:cpp|c\+\+)\s*\n([\s\S]*?)```/ig, /```(?:python|py)\s*\n([\s\S]*?)```/ig, /```java\s*\n([\s\S]*?)```/ig, /```\s*\n([\s\S]*?)```/g]) {
      const matches = [...content.matchAll(p)]
      if (matches.length > 0) { code = matches[matches.length - 1][1].trim(); break }
    }
  }
  if (!code && content.trim() && !content.includes('```')) code = content.trim()
  if (code) {
    code = code.replace(/<!--\s*AC_CODE(?:_START|_END)?\s*-->/g, '').trim()
    const lines = code.split('\n')
    if (lines.length > 0 && /^(c\+\+|cpp|python|py|java|javascript|js)$/i.test(lines[0].trim())) {
      code = lines.slice(1).join('\n').trim()
    }
  }
  return code
}

router.post('/solution', authenticateToken, checkModelPermission, async (req, res) => {
  try {
    const { text, model, language, requireAC } = req.body
    if (!text) return res.status(400).json({ error: '缺少 text 字段' })

    const apiUrl = YUN_API_URL
    const apiKey = YUN_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'Server: missing YUN_API_KEY in environment' })

    // 优先使用动�?Prompt，如果未导入则回退到静�?Prompt
    const prompt = (typeof getSolutionPrompt === 'function') 
      ? getSolutionPrompt(language || 'C++', requireAC) 
      : SOLUTION_PROMPT

    const messages = [
      { role: 'system', content: prompt },
      { role: 'user', content: text }
    ]

    const payload = {
      model: model || 'gemini-2.5-flash',
      messages,
      temperature: 0.5,
      max_tokens: 32767
    }
    res.locals.logModel = payload.model

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
      
      const pureCode = extractPureCode(fixed)
      return res.json({ result: fixed, pureCode })
    } catch (e) {
      return res.json({ result: content, pureCode: extractPureCode(content) })
    }
  } catch (err) {
    console.error('Solution error:', err?.response?.data || err.message || err)
    const message = err?.response?.data || err.message || 'unknown error'
    return res.status(500).json({ error: 'Solution generation failed', detail: message })
  }
})

router.post('/checker', authenticateToken, checkModelPermission, async (req, res) => {
  try {
    const { model } = req.body
    let { text } = req.body
    if (!text) return res.status(400).json({ error: '缺少 text 字段' })

    // [Fix] 修复 AC 代码被识别为 Unknown Status 的问�?
    if (text && text.includes('状态是: Unknown Status')) {
      // 尝试解析 record URL 并获取真实状�?
      const recordMatch = text.match(/\/d\/([^\/]+)\/record\/([a-f0-9]{24})/)
      let resolved = false
      
      if (recordMatch) {
          try {
              const record = await fetchHydroRecord(recordMatch[1], recordMatch[2])
              if (record && typeof record.status === 'number') {
                  const statusText = HYDRO_STATUS_MAP[record.status] || 'Unknown'
                  let replaceText = `状态是: ${statusText}`
                  if (record.score !== undefined) replaceText += ` (Score: ${record.score})`
                  
                  text = text.replace('状态是: Unknown Status', replaceText)
                  console.log(`[Checker] Resolved record status to: ${statusText}`)
                  resolved = true
              }
          } catch (e) {
              console.warn('[Checker] Failed to resolve status from URL', e)
          }
      }
      
      // Fallback: 如果无法解析或获取失败，且依然是 Unknown Status，由于用户反馈通常�?AC 代码误判�?
      // 我们这里暂时不做自动 AC 处理，而是改为更中性的描述，或者保持原样但加上提示
      // 但根据用户要�?"并非把unknown直接翻译为AC"，如果解析失败，我们保留 Unknown Status 或改�?"Status Check Failed"
      if (!resolved && text.includes('状态是: Unknown Status')) {
         text = text.replace('状态是: Unknown Status', '状态是: Unknown Status (无法获取评测详情，请检查链�?')
      }
    }

    const apiUrl = YUN_API_URL
    const apiKey = YUN_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'Server: missing YUN_API_KEY in environment' })

    const messages = [
      { role: 'system', content: CHECKER_PROMPT },
      { role: 'user', content: text }
    ]

    const payload = {
      model: model || 'gemini-2.5-flash',
      messages,
      temperature: 0.3,
      max_tokens: 32767
    }
    res.locals.logModel = payload.model

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
    const { text, model, language, referenceText, acCode } = req.body
    if (!text) return res.status(400).json({ error: '缺少 text 字段' })

    const lang = language || 'C++'
    // 若提供了 AC 代码，切换到讲解/注释模式；否则使用独立解题（CoT）模�?
    const hasAcCode = acCode && acCode.trim()
    const prompt = hasAcCode ? getSolveWithCodePrompt(lang) : getSolvePrompt(lang)

    const apiUrl = YUN_API_URL
    const apiKey = YUN_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'Server: missing YUN_API_KEY in environment' })

    let userContent = text
    if (hasAcCode) {
      // AC 代码讲解模式：将代码附在题目�?
      userContent = `${text}\n\n---\n## 参�?AC 代码\n\n\`\`\`${lang.toLowerCase()}\n${acCode.trim()}\n\`\`\``
    } else if (referenceText && referenceText.trim()) {
      // 向后兼容：保留旧�?referenceText 拼接
      userContent = `${text}\n\n---\n## 参考思路（官方题解）\n\n${referenceText.trim()}`
    }

    const messages = [
      { role: 'system', content: prompt },
      { role: 'user', content: userContent }
    ]

    const payload = {
      model: model || 'gemini-2.5-flash',
      messages,
      temperature: 0.2,
      max_tokens: 32767
    }
    res.locals.logModel = payload.model

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

      return res.json({ result: fixed, pureCode: extractPureCode(fixed) })
    } catch (e) {
      return res.json({ result: content, pureCode: extractPureCode(content) })
    }
  } catch (err) {
    console.error('Solve error:', err?.response?.data || err.message || err)
    const message = err?.response?.data || err.message || 'unknown error'
    return res.status(500).json({ error: 'Code generation failed', detail: message })
  }
})

router.post('/generate-answer', authenticateToken, checkModelPermission, async (req, res) => {
  try {
    if (!req.body) return res.status(400).json({ error: 'Missing request body' })
    const { problem, model } = req.body
    if (!problem) return res.status(400).json({ error: 'Missing problem data' })

    const apiUrl = YUN_API_URL
    const apiKey = YUN_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'Server: missing YUN_API_KEY' })

    // Construct the user content from the problem object
    let userContent = `题目�?{problem.stem}\n`
    if (problem.options && problem.options.length > 0) {
        userContent += `选项：\n`
        problem.options.forEach((opt, idx) => {
            const label = String.fromCharCode(65 + idx)
            userContent += `${label}. ${opt}\n`
        })
    }

    const messages = [
      { role: 'system', content: ANSWER_GEN_PROMPT },
      { role: 'user', content: userContent }
    ]

    const payload = {
      model: model || 'gemini-2.0-flash',
      messages,
      temperature: 0.1,
      max_tokens: 32767
      // response_format: { type: "json_object" } // Removed to allow free text format
    }
    res.locals.logModel = payload.model

    const resp = await axios.post(apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 120000
    })

    const data = resp.data
    let content = ''
    if (data.choices && data.choices[0] && data.choices[0].message) {
        content = data.choices[0].message.content
    } else if (data.choices && data.choices[0] && data.choices[0].text) {
        content = data.choices[0].text
    } else {
        content = JSON.stringify(data)
    }

    // Parse Custom Format: [ANSWER]: X ... [EXPLANATION]: ...
    let jsonResult = { answer: '', explanation: '' }
    
    const ansMatch = content.match(/\[ANSWER\]:\s*([A-Z0-9]+)/i)
    if (ansMatch) {
        jsonResult.answer = ansMatch[1].toUpperCase()
    }
    
    const expMatch = content.match(/\[EXPLANATION\]:\s*([\s\S]*)/i)
    if (expMatch) {
        jsonResult.explanation = expMatch[1].trim()
    } else {
        // Fallback: if no explicit explanation tag, but we have an answer, 
        // assume everything after answer is explanation
        if (ansMatch) {
             const afterAns = content.substring(ansMatch.index + ansMatch[0].length).trim()
             if (afterAns) jsonResult.explanation = afterAns
        }
    }
    
    // Legacy JSON fallback (just in case model ignores instruction)
    if (!jsonResult.answer && content.trim().startsWith('{')) {
        try {
            const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim()
            const parsed = JSON.parse(cleanContent)
            jsonResult.answer = parsed.answer || ''
            jsonResult.explanation = parsed.explanation || ''
        } catch (e) {}
    }

    return res.json(jsonResult)

  } catch (err) {
    console.error('Generate Answer error:', err?.response?.data || err.message)
    return res.status(500).json({ error: 'Generation failed' })
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
      tableMatch = String(text).match(/\|\s*(Testcase|Test Point|测试�?[^|]*\|[\s\S]{0,2000}?\|\s*(Constraint|约束)[^|]*\|[\s\S]{0,2000}?\|/i)
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
      extraConstraintPrompt = '\n\n【没有分组表格时】请仔细阅读题目描述中的数据范围和约束条件，自动合理分组测试点（如小数据、大数据、边界、特殊情况等），必须严格生成20组测试点，每组数据需覆盖不同范围和典型情况，脚本需包含分组编号和分组注释�?
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
    res.locals.logModel = payload.model

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

    // 等级标签（gesp1-8: GESP认证，gesp9: CSP-S，gesp10: NOI及以上）
    const LEVEL_TAGS = ['gesp1','gesp2','gesp3','gesp4','gesp5','gesp6','gesp7','gesp8','gesp9','gesp10']
    // 知识点标签（按等级分组）
    const KNOWLEDGE_TAGS = [
      // gesp1
      '顺序结构','条件结构','循环结构','数学基础',
      // gesp2
      '循环嵌套','暴力枚举','模拟','数学函数',
      // gesp3
      '位运�?,'进制转换','一维数�?,'字符�?,
      // gesp4
      '函数','结构�?,'二维数组','递推','排序','算法复杂�?,
      // gesp5
      '数论基础','素数�?,'质因数分�?,'高精�?,'链表','前缀�?,'差分','二分','三分','贪心','分治','递归','STL',
      // gesp6
      '�?,'队列','树形结构','DFS','BFS','DP','线性DP','背包DP',
      // gesp7
      '哈希','图论基础','DFS进阶','BFS进阶','双指�?,'区间DP','树上DP','二维DP',
      // gesp8
      '组合数学','倍增','LCA','树的直径','最小生成树','单源最短路�?,'floyd','并查�?,'优先队列','拓扑排序','树的重心','树上差分','容斥原理','离散�?,'ST�?,'差分约束',
      // gesp9 (CSP-S)
      'KMP','Z函数','字典�?,'AC自动�?,'回文�?,
      '构�?,'反悔贪心','�?,'扫描�?,'搜索进阶','次短�?,
      '状压DP','数位DP','概率DP','期望DP','换根DP','计数DP','单调队列优化DP','斜率优化DP','树上背包DP',
      '单调�?,'单调队列','线性基','树状数组','线段�?,'笛卡尔树','平衡�?,'树链剖分','分块','莫队','离线算法',
      '强连通分�?,'双连通分�?,'欧拉�?,'2-SAT','二分�?,'网络�?,
      'CDQ分治','整体二分','博弈�?,'矩阵快速幂','高斯消元','计算几何','概率论基础','卡特兰数','扩展GCD','中国剩余定理',
      // gesp10 (NOI)
      '后缀数组','后缀自动�?,'四边形不等式优化DP','WQS二分',
      '可合并堆','可持久化数据结构','块状链表','点分�?,'树上启发式合�?,'虚树',
      '费用�?,'半平面交','原根','狄利克雷卷积','莫比乌斯反演','FFT','NTT',
      '斯特林数','母函�?,'Burnside引理'
    ]
    const ALLOWED_TAGS = [...LEVEL_TAGS, ...KNOWLEDGE_TAGS]

    const prompt = `你是算法题目分类专家。请阅读以下算法题目，完成两个任务：
    1. 选出�?*1个等级标�?* + **1~3个知识点标签**
    2. 生成一个简洁的中文标题（不超过20字）

    ## 严格规则
    - 标签**必须从下方列表中原文选取**，禁止自造、简化或合并标签
    - 错误示例：❌ "图论"（不存在）→ 正确：✅ "图论基础" �?"强连通分�? �?"二分�? 等具体算�?
    - 错误示例：❌ "动态规�?（应�?"DP" �?"线性DP" 等）
    - 知识点标签要尽量精确，选最能描述核心算法的标签

    ## 等级标签（必�?个）
    gesp1-8 = GESP认证各级（由易到难），gesp9 = CSP-S提高级，gesp10 = NOI及以�?
    可选：${JSON.stringify(LEVEL_TAGS)}

    ## 知识点标签（按等级分组，�?-3个）
    gesp1: 顺序结构, 条件结构, 循环结构, 数学基础
    gesp2: 循环嵌套, 暴力枚举, 模拟, 数学函数
    gesp3: 位运�? 进制转换, 一维数�? 字符�?
    gesp4: 函数, 结构�? 二维数组, 递推, 排序, 算法复杂�?
    gesp5: 数论基础, 素数�? 质因数分�? 高精�? 链表, 前缀�? 差分, 二分, 三分, 贪心, 分治, 递归, STL
    gesp6: �? 队列, 树形结构, DFS, BFS, DP, 线性DP, 背包DP
    gesp7: 哈希, 图论基础, DFS进阶, BFS进阶, 双指�? 区间DP, 树上DP, 二维DP
    gesp8: 组合数学, 倍增, LCA, 树的直径, 最小生成树, 单源最短路�? floyd, 并查�? 优先队列, 拓扑排序, 树的重心, 树上差分, 容斥原理, 离散�? ST�? 差分约束
    gesp9: KMP, Z函数, 字典�? AC自动�? 回文�? 构�? 反悔贪心, �? 扫描�? 搜索进阶, 次短�? 状压DP, 数位DP, 概率DP, 期望DP, 换根DP, 计数DP, 单调队列优化DP, 斜率优化DP, 树上背包DP, 单调�? 单调队列, 线性基, 树状数组, 线段�? 笛卡尔树, 平衡�? 树链剖分, 分块, 莫队, 离线算法, 强连通分�? 双连通分�? 欧拉�? 2-SAT, 二分�? 网络�? CDQ分治, 整体二分, 博弈�? 矩阵快速幂, 高斯消元, 计算几何, 概率论基础, 卡特兰数, 扩展GCD, 中国剩余定理
    gesp10: 后缀数组, 后缀自动�? 四边形不等式优化DP, WQS二分, 可合并堆, 可持久化数据结构, 块状链表, 点分�? 树上启发式合�? 虚树, 费用�? 半平面交, 原根, 狄利克雷卷积, 莫比乌斯反演, FFT, NTT, 斯特林数, 母函�? Burnside引理

    ## 输出格式
    只返�?JSON，例如：
    {"tags": ["gesp9", "强连通分�?, "拓扑排序"], "title": "图的强连通分量缩�?}
    不要包含任何其他文字�?Markdown 格式�?

    题目内容�?
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
    res.locals.logModel = payload.model

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

router.post('/generate-problem-meta', authenticateToken, checkModelPermission, async (req, res) => {
  try {
    const { text, model, solution } = req.body
    if (!text) return res.status(400).json({ error: '缺少 text 字段' })

    const apiUrl = YUN_API_URL
    const apiKey = YUN_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'Server: missing YUN_API_KEY in environment' })

    let contentInput = text
    if (solution) {
      contentInput += `\n\n【参考题�?分析】\n${solution}\n\n请结合题目描述和参考题解，更准确地总结题目名称和算法标签。`
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
    res.locals.logModel = payload.model

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
      // 尝试提取 JSON �?
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
      title: result.title || '', 
      tags: Array.isArray(result.tags) ? result.tags : []
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
    if ((!problem && !solutionPlan)) return res.status(400).json({ error: '缺少 problem �?solutionPlan 字段' })

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
      userContent += `\n\n【特别要求】\n当前题目属于 Level ${level}（入门阶段）。学生尚未学�?STL 容器（如 vector）。请在生�?C++ 代码时，**务必使用静态数�?*（如 int a[1005]），**严禁使用 std::vector**。`;
    }

    const apiUrl = YUN_API_URL
    const apiKey = YUN_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'Server: missing YUN_API_KEY in environment' })

    const messages = [
      { role: 'system', content: prompt },
      { role: 'user', content: userContent }
    ]

    const payload = {
      model: model || 'gemini-2.5-flash',
      messages,
      temperature: 0.3,
      max_tokens: 32767
    }
    res.locals.logModel = payload.model

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

    const userContent = `题目描述：\n${problem}\n\n代码：\n${code || '未提�?}`;

    const messages = [
        { role: 'system', content: SOLUTION_PROMPT },
        { role: 'user', content: userContent }
    ];

    const payload = {
        model: model || 'gemini-2.5-flash',
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

          const userContent = `题目描述：\n${problem}\n\n代码：\n${code || '未提�?}`;

          const messages = [
              { role: 'system', content: SOLUTION_PROMPT },
              { role: 'user', content: userContent }
          ];

          const payload = {
              model: model || 'gemini-2.5-flash',
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
                  // Atomic update for solution plan
                  try {
                      if (topicId && chapterId) {
                          const chapterFilter = mongoose.Types.ObjectId.isValid(chapterId) 
                              ? { "c._id": chapterId } 
                              : { "c.id": chapterId };
                              
                          await CourseLevel.updateOne(
                              { _id: courseLevel._id },
                              { 
                                  $set: { 
                                      "topics.$[t].chapters.$[c].content": content,
                                      "topics.$[t].chapters.$[c].contentType": 'markdown'
                                  } 
                              },
                              {
                                  arrayFilters: [
                                      { "t._id": topicId },
                                      chapterFilter
                                  ]
                              }
                          );
                      } else {
                          await courseLevel.save();
                      }
                      console.log(`[Background] Solution Plan saved for chapter ${chapterId}`);
                      try { 
                          getIO().emit('ai_task_complete', { 
                              clientKey, 
                              result: 'success',
                              type: 'solution-plan',
                              contentType: 'markdown',
                              chapterId: chapterId
                          }); 
                      } catch (e) {}
                  } catch (updateErr) {
                      console.error('[Background] Atomic update failed for solution plan, falling back to save():', updateErr);
                      await courseLevel.save();
                      try { 
                          getIO().emit('ai_task_complete', { 
                              clientKey, 
                              result: 'success',
                              type: 'solution-plan',
                              contentType: 'markdown',
                              chapterId: chapterId
                          }); 
                      } catch (e) {}
                  }
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
          let levelDoc = null;

          // If group, levelTitle, or solutionPlan is missing, try to fetch from DB
          if (!group || !levelTitle || !solutionPlan) {
              try {
                  // Try by ID first
                  levelDoc = await CourseLevel.findOne({
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
                      
                      // Try to find existing solution plan (markdown content)
                      if (!solutionPlan) {
                          let foundChapter = null;
                          for (const topic of levelDoc.topics) {
                              const c = topic.chapters.find(ch => ch.id === chapterId || (ch._id && ch._id.toString() === chapterId));
                              if (c) {
                                  foundChapter = c;
                                  break;
                              }
                          }
                          
                          if (foundChapter && foundChapter.contentType === 'markdown' && foundChapter.content && foundChapter.content.length > 50) {
                              solutionPlan = foundChapter.content;
                              console.log(`[Background] Auto-detected existing solution plan for chapter ${chapterId}`);
                          }
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
             userContent += `\n\n【特别要求】\n当前题目属于 Level ${level}（入门阶段）。学生尚未学�?STL 容器（如 vector）。请在生�?C++ 代码时，**务必使用静态数�?*（如 int a[1005]），**严禁使用 std::vector**。`;
          }

          const messages = [
              { role: 'system', content: prompt },
              { role: 'user', content: userContent }
          ];

          const payload = {
              model: model || 'gemini-2.5-flash',
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

          // Fallback: if not found by topicId, try broader search
          if (!courseLevel) {
              courseLevel = await CourseLevel.findOne({
                  $or: [
                      { 'topics.chapters.id': chapterId },
                      { 'topics.chapters._id': chapterId }
                  ]
              });
          }

          if (courseLevel) {
              let chapterFound = false;
              let foundChapterTitle = '';
              let foundChapterId = null;
              let foundTopicId = null;
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
                  // Fallback: match by chapter title (handles stale _id from frontend)
                  if (!chapter && chapterTitle) {
                      chapter = topic.chapters.find(c => c.title === chapterTitle);
                      if (chapter) console.log(`[Background] Solution-Report: chapter found by title fallback "${chapterTitle}" (stale id: ${chapterId}, actual: ${chapter._id})`);
                  }

                  if (chapter) {
                      chapter.resourceUrl = relativePath;
                      chapter.contentType = 'html';
                      chapterFound = true;
                      foundChapterTitle = chapter.title;
                      foundChapterId = chapter._id ? chapter._id.toString() : chapter.id;
                      foundTopicId = topic._id ? topic._id.toString() : null;
                      break;
                  }
              }
              if (chapterFound) {
                  try {
                      if (foundTopicId && foundChapterId) {
                          const chapterFilter = mongoose.Types.ObjectId.isValid(foundChapterId) 
                              ? { "c._id": new mongoose.Types.ObjectId(foundChapterId) } 
                              : { "c.id": foundChapterId };
                              
                          await CourseLevel.updateOne(
                              { _id: courseLevel._id },
                              { 
                                  $set: { 
                                      "topics.$[t].chapters.$[c].resourceUrl": relativePath,
                                      "topics.$[t].chapters.$[c].contentType": 'html'
                                  } 
                              },
                              {
                                  arrayFilters: [
                                      { "t._id": new mongoose.Types.ObjectId(foundTopicId) },
                                      chapterFilter
                                  ]
                              }
                          );
                      } else {
                          await courseLevel.save();
                      }
                      
                      console.log(`[Background] Database updated for chapter ${foundChapterId}`);
                      try {
                          getIO().emit('ai_task_complete', { 
                              chapterId: foundChapterId, 
                              chapterTitle: foundChapterTitle, 
                              clientKey, 
                              status: 'success', 
                              type: 'solution-report',
                              resourceUrl: relativePath
                          });
                      } catch (e) { console.error('Socket emit failed', e); }
                  } catch (updateErr) {
                      console.error('[Background] Atomic update failed, falling back to save():', updateErr);
                      await courseLevel.save();
                      try {
                          getIO().emit('ai_task_complete', { 
                              chapterId: foundChapterId, 
                              chapterTitle: foundChapterTitle, 
                              clientKey, 
                              status: 'success', 
                              type: 'solution-report',
                              resourceUrl: relativePath
                          });
                      } catch (e) { console.error('Socket emit failed', e); }
                  }
              } else {
                  throw new Error('Database record found but chapter not found in topics');
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
                           getIO().emit('ai_task_complete', { 
                               chapterId, 
                               chapterTitle: chapter.title, 
                               clientKey, 
                               status: 'success', 
                               type: 'solution-report',
                               resourceUrl: relativePath
                           });
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
          const errMsg = err.message || String(err) || 'Unknown error';
          try {
              getIO().emit('ai_task_complete', { chapterId, chapterTitle: chapterTitle, clientKey, status: 'error', message: errMsg, type: 'solution-report' });
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

    let userPrompt = `主题�?{topic}\n难度�?{level || 'Level 1'}\n额外要求�?{requirements || '�?}`
    if (context) {
        userPrompt = `所属知识点�?{context}\n` + userPrompt
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
      model: model || 'gemini-2.5-flash',
      messages,
      temperature: 0.7,
      max_tokens: 16000
    }
    res.locals.logModel = payload.model

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
        systemPrompt += `\n\n【教案内容（必须严格遵守）】\n以下是本节课的详细教案，�?*必须**严格按照此教案生�?PPT：\n- PPT 中的所有知识点、例题、代码示例、类比说明、课堂互动环节，都必须直接来源于教案内容，不得自行发挥或替换为教案中没有的内容。\n- 如果教案中有具体的代码示例，PPT 中必须使用完全相同的代码（变量名、逻辑、注释不得修改）。\n- 如果教案中有具体的例题或练习题，PPT 中必须使用完全相同的题目。\n- PPT 的章节结构应与教案保持一致。\n\n===教案开�?==\n${chapterContent.slice(0, 10000)}\n===教案结束===\n`
    }

    // Inject Chapter Context
    if (chapterList && Array.isArray(chapterList) && chapterList.length > 0) {
        const current = (currentChapterIndex !== undefined && currentChapterIndex >= 0) ? currentChapterIndex + 1 : '?'
        
        let contextInfo = `\n\n【重要：课程上下文信息】\n`
        contextInfo += `本节课是系列课程 "${context}" 中的�?${current} 个主题（仅供参考难度定位，**请勿在PPT中显示“第${current}节”或总章节数**）。\n`
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
      model: model || 'gemini-2.5-flash',
      messages,
      temperature: 0.7,
      max_tokens: 16000
    }
    res.locals.logModel = payload.model

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

    let userPrompt = `主题�?{topic}\n难度�?{level || 'Level 1'}`

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
    res.locals.logModel = payload.model

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
              systemPrompt += `\n\n【教案内容（必须严格遵守）】\n以下是本节课的详细教案，�?*必须**严格按照此教案生�?PPT：\n- PPT 中的所有知识点、例题、代码示例、类比说明、课堂互动环节，都必须直接来源于教案内容，不得自行发挥或替换为教案中没有的内容。\n- 如果教案中有具体的代码示例，PPT 中必须使用完全相同的代码（变量名、逻辑、注释不得修改）。\n- 如果教案中有具体的例题或练习题，PPT 中必须使用完全相同的题目。\n- PPT 的章节结构应与教案保持一致。\n\n===教案开�?==\n${chapterContent.slice(0, 10000)}\n===教案结束===\n`
          }

          if (chapterList && Array.isArray(chapterList) && chapterList.length > 0) {
              const current = (currentChapterIndex !== undefined && currentChapterIndex >= 0) ? currentChapterIndex + 1 : '?'
              let contextInfo = `\n\n【重要：课程上下文信息】\n`
              contextInfo += `本节课是系列课程 "${context}" 中的�?${current} 个主题（仅供参考难度定位，**请勿在PPT中显示“第${current}节”或总章节数**）。\n`
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
            model: model || 'gemini-2.5-flash',
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
                      model: model || 'gemini-2.5-flash',
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

          // If not found by topicId, try broader search
          if (!courseLevel) {
              courseLevel = await CourseLevel.findOne({
                  $or: [
                      { 'topics.chapters.id': chapterId },
                      { 'topics.chapters._id': chapterId }
                  ]
              });
          }

          if (courseLevel) {
              let chapterFound = false;
              let foundChapterTitle = '';
              let foundChapterId = null; // actual _id in DB
              let foundTopicId = null;
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
                  // Fallback: match by chapter title (handles stale _id in frontend)
                  if (!chapter && chapterTitle) {
                      chapter = topic.chapters.find(c => c.title === chapterTitle);
                      if (chapter) {
                          console.log(`[Background] Chapter found by title fallback: "${chapterTitle}" (stale id was ${chapterId}, actual _id: ${chapter._id})`);
                      }
                  }

                  if (chapter) {
                      chapter.resourceUrl = relativePath;
                      chapter.contentType = 'html';
                      chapterFound = true;
                      foundChapterTitle = chapter.title;
                      foundChapterId = chapter._id ? chapter._id.toString() : chapter.id;
                      foundTopicId = topic._id ? topic._id.toString() : null;
                      break;
                  }
              }
              if (chapterFound) {
                  // Atomic update for PPT �?use actual DB ids (not stale frontend ids)
                  try {
                      if (foundTopicId && foundChapterId) {
                          const chapterFilter = mongoose.Types.ObjectId.isValid(foundChapterId) 
                              ? { "c._id": new mongoose.Types.ObjectId(foundChapterId) } 
                              : { "c.id": foundChapterId };
                              
                          await CourseLevel.updateOne(
                              { _id: courseLevel._id },
                              { 
                                  $set: { 
                                      "topics.$[t].chapters.$[c].resourceUrl": relativePath,
                                      "topics.$[t].chapters.$[c].contentType": 'html'
                                  } 
                              },
                              {
                                  arrayFilters: [
                                      { "t._id": new mongoose.Types.ObjectId(foundTopicId) },
                                      chapterFilter
                                  ]
                              }
                          );
                      } else {
                          await courseLevel.save();
                      }
                      console.log(`[Background] Database updated for chapter ${foundChapterId}`);
                      
                      // Notify client
                      getIO().emit('ai_task_complete', {
                          chapterId: foundChapterId,
                          chapterTitle: foundChapterTitle,
                          clientKey,
                          type: 'ppt',
                          status: 'success',
                          message: 'PPT 生成完成'
                      });
                  } catch (updateErr) {
                      console.error('[Background] Atomic update failed for PPT, falling back to save():', updateErr);
                      await courseLevel.save();
                      getIO().emit('ai_task_complete', {
                          chapterId: foundChapterId,
                          chapterTitle: foundChapterTitle,
                          clientKey,
                          type: 'ppt',
                          status: 'success',
                          message: 'PPT 生成完成'
                      });
                  }
              } else {
                  throw new Error('Database record found but chapter not found in topics');
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
          const errMsg = err.message || String(err) || 'Unknown error';
          // Notify client of error
          getIO().emit('ai_task_complete', {
              chapterId,
              chapterTitle: chapterTitle, // Use the title from request body
              clientKey,
              type: 'ppt',
              status: 'error',
              message: 'PPT 生成失败: ' + errMsg
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
          userPrompt += `\n难度等级�?{level}`
          if (requirements) {
              userPrompt += `\n额外要求�?{requirements}`
          }

          const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]

          const payload = {
            model: model || 'gemini-2.5-flash',
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

          // Fallback: if not found by topicId, try broader search
          if (!courseLevel) {
              courseLevel = await CourseLevel.findOne({
                  $or: [
                      { 'topics.chapters.id': chapterId },
                      { 'topics.chapters._id': chapterId }
                  ]
              });
          }

          const chapterTitleFromBody = topic; // 'topic' param = chapter title; save before loop variable shadows it

          if (courseLevel) {
              let chapterFound = false;
              let foundChapterTitle = '';
              let foundChapterId = null;
              let foundTopicId = null;
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
                  // Fallback: match by chapter title (handles stale _id from frontend)
                  if (!chapter && chapterTitleFromBody) {
                      chapter = topic.chapters.find(c => c.title === chapterTitleFromBody);
                      if (chapter) console.log(`[Background] Lesson-Plan: chapter found by title fallback "${chapterTitleFromBody}" (stale id: ${chapterId}, actual: ${chapter._id})`);
                  }

                  if (chapter) {
                      chapter.content = content;
                      chapter.contentType = 'markdown';
                      chapterFound = true;
                      foundChapterTitle = chapter.title;
                      foundChapterId = chapter._id ? chapter._id.toString() : chapter.id;
                      foundTopicId = topic._id ? topic._id.toString() : null;
                      break;
                  }
              }
              if (chapterFound) {
                  // Atomic update for Lesson Plan
                  try {
                      if (foundTopicId && foundChapterId) {
                          const chapterFilter = mongoose.Types.ObjectId.isValid(foundChapterId) 
                              ? { "c._id": new mongoose.Types.ObjectId(foundChapterId) } 
                              : { "c.id": foundChapterId };
                              
                          await CourseLevel.updateOne(
                              { _id: courseLevel._id },
                              { 
                                  $set: { 
                                      "topics.$[t].chapters.$[c].content": content,
                                      "topics.$[t].chapters.$[c].contentType": 'markdown'
                                  } 
                              },
                              {
                                  arrayFilters: [
                                      { "t._id": new mongoose.Types.ObjectId(foundTopicId) },
                                      chapterFilter
                                  ]
                              }
                          );
                      } else {
                          await courseLevel.save();
                      }
                      console.log(`[Background] Database updated for chapter ${foundChapterId} (Lesson Plan)`);
                      
                      // Notify client
                      getIO().emit('ai_task_complete', {
                          chapterId: foundChapterId,
                          chapterTitle: foundChapterTitle,
                          clientKey,
                          type: 'lesson-plan',
                          status: 'success',
                          message: '教案生成完成'
                      });
                  } catch (updateErr) {
                      console.error('[Background] Atomic update failed for Lesson Plan, falling back to save():', updateErr);
                      await courseLevel.save();
                      getIO().emit('ai_task_complete', {
                          chapterId: foundChapterId,
                          chapterTitle: foundChapterTitle,
                          clientKey,
                          type: 'lesson-plan',
                          status: 'success',
                          message: '教案生成完成'
                      });
                  }
              } else {
                  console.warn(`[Background] Chapter ${chapterId} found in DB query but not in iteration (Lesson Plan)`);
                  throw new Error('Database record found but chapter not found in topics');
              }
          } else {
              console.error(`[Background] CourseLevel not found for chapter ${chapterId} (Lesson Plan)`);
              throw new Error('Database record not found for this chapter');
          }

      } catch (err) {
          console.error('[Background] Error generating Lesson Plan:', err);
          const errMsg = err.message || String(err) || 'Unknown error';
          // Notify client of error
          getIO().emit('ai_task_complete', {
              chapterId,
              chapterTitle: topic, // In lesson plan route, 'topic' is the chapter title
              clientKey,
              type: 'lesson-plan',
              status: 'error',
              message: '教案生成失败: ' + errMsg
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
          
          let userPrompt = `主题�?{topic}\n难度�?{level || 'Level 1'}`

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
                          // Find topic index by comparing _id or id, not by object reference
                          const topicIndex = courseLevel.topics.findIndex(t =>
                              (t._id && t._id === topicId) || (t.id && t.id === topicId)
                          );
                          const prefix = `${courseLevel.level}-${topicIndex + 1}`;

                          result.chapters.forEach((item, idx) => {
                              // Handle both string (title only) and object (title + content) formats
                              let title = '';
                              let content = '';
                              
                              if (typeof item === 'string') {
                                  title = item;
                              } else if (typeof item === 'object' && item !== null) {
                                  title = item.title || '未命名章�?;
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
                      message: mode === 'description' ? '知识点描述生成完�? : '章节列表生成完成'
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
    const { docId, problemId, content, domainId, force, model } = req.body
    
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

    // Check reference status if applicable
    let isGenerated = doc.solutionGenerated;
    if (!isGenerated && doc.reference && doc.reference.pid) {
        const refQuery = { docId: doc.reference.pid };
        if (doc.reference.domainId || domainId) refQuery.domainId = doc.reference.domainId || domainId;
        const refDoc = await Document.findOne(refQuery);
        if (refDoc && refDoc.solutionGenerated) {
            isGenerated = true;
            console.log(`[Generate Report] Reference doc ${doc.reference.pid} already has solution.`);
        }
    }

    if (isGenerated && !force) {
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
      model: model || 'gemini-2.5-flash', // Use user selected model or default to fast model
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
      model: model || 'gemini-2.5-flash',
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

router.post('/summary', authenticateToken, checkModelPermission, async (req, res) => {
  try {
    const { role, keywords, achievements, challenges, plans, style, length, model, temperature } = req.body
    
    // 构造用户输�?
    const userContent = `
【基本信息�?
- 岗位�?{role || '未填�?}
- 年度关键词：${keywords || '�?}
- 风格�?{style || '正式严谨'}
- 字数�?{length || '800�?}左右

【主要成就�?
${achievements || '（暂无具体描述）'}

【遇到的挑战与反思�?
${challenges || '（暂无具体描述）'}

【未来规划�?
${plans || '（暂无具体描述）'}
`

    const apiUrl = YUN_API_URL
    const apiKey = YUN_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'Server: missing YUN_API_KEY in environment' })

    const messages = [
      { role: 'system', content: SUMMARY_PROMPT },
      { role: 'user', content: userContent }
    ]

    const payload = {
      model: model || 'gemini-2.5-flash',
      messages,
      temperature: temperature !== undefined ? Number(temperature) : 0.7, 
      max_tokens: 32767
    }
    res.locals.logModel = payload.model

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
      } else {
        content = JSON.stringify(data)
      }
    } catch (e) {
      content = JSON.stringify(data)
    }

    return res.json({ result: content })

  } catch (err) {
    console.error('Summary error:', err?.response?.data || err.message || err)
    const message = err?.response?.data || err.message || 'unknown error'
    return res.status(500).json({ error: 'Summary generation failed', detail: message })
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

        // Check local DB first to avoid Hydro API rate limits/auth issues
        const docQuery = { docId: pid }
        if (domainId) docQuery.domainId = domainId
        const localDoc = await Document.findOne(docQuery)
        
        // If we have files in DB and sync is not explicitly forced, return local files
        // Or if sync is 'false' (default behavior if not specified usually implies fetch)
        // Actually, let's prefer local DB if it has data, unless sync=true is passed
        if (localDoc && localDoc.hydroFiles && localDoc.hydroFiles.length > 0 && sync !== 'true') {
            console.log(`[Hydro Files] Returning ${localDoc.hydroFiles.length} files from local DB for ${pid}`)
            return res.json(localDoc.hydroFiles)
        }

        // If we just uploaded files (solutionGenerated is true), we should trust the local DB even if sync=true
        // because the upload process already updated the DB.
        // This prevents the immediate 403 after upload.
        if (localDoc && localDoc.solutionGenerated && localDoc.hydroFiles && localDoc.hydroFiles.length > 0) {
             console.log(`[Hydro Files] Returning ${localDoc.hydroFiles.length} files from local DB (Recently Generated) for ${pid}`)
             return res.json(localDoc.hydroFiles)
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
            // Force close connection to avoid reuse issues
            const headers = { ...getHeaders(), 'Connection': 'close' }
            const response = await axios.get(url, { headers })
            
            // Update cookie if present
            if (response.headers['set-cookie']) {
                currentHydroCookie = mergeCookies(currentHydroCookie, response.headers['set-cookie'])
            }

            if (Array.isArray(response.data)) {
                files = response.data
            } else if (response.data && Array.isArray(response.data.additional_file)) {
                files = response.data.additional_file
            } else if (response.data && response.data.url) {
                // Treat as auth error (soft redirect)
                const err = new Error('Soft Redirect')
                err.response = { status: 401 }
                throw err
            } else {
                console.warn('[Hydro Files] Unknown response format:', JSON.stringify(response.data))
            }

            console.log(`[Hydro Files] Got ${files.length} files`)
        } catch (e) {
            // Retry login on 401/403
            if (e.response && (e.response.status === 401 || e.response.status === 403) && !HYDRO_CONFIG.API_TOKEN) {
                console.log('[Hydro Files] Auth failed, retrying login...')
                await loginToHydro()
                try {
                    // Force close connection on retry
                    const headers = { ...getHeaders(), 'Connection': 'close' }
                    const response = await axios.get(url, { headers })
                    
                    // Update cookie if present
                    if (response.headers['set-cookie']) {
                        currentHydroCookie = mergeCookies(currentHydroCookie, response.headers['set-cookie'])
                    }

                    if (Array.isArray(response.data)) {
                        files = response.data
                    } else if (response.data && Array.isArray(response.data.additional_file)) {
                        files = response.data.additional_file
                    } else {
                        console.warn('[Hydro Files] Unknown response format (Retry):', JSON.stringify(response.data))
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
