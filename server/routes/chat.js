import express from 'express'
import axios from 'axios'
import { YUN_API_KEY, YUN_API_URL } from '../config.js'
import { checkModelPermission, authenticateToken, requirePremium } from '../middleware/auth.js'
import { saveSession } from '../utils/session.js'
import { debugLog } from '../utils/logger.js'

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

router.post('/chat', authenticateToken, requirePremium, checkModelPermission, async (req, res) => {
  try {
    const { messages, model, sessionId } = req.body
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: '缺少 messages 数组' })
    }

    try {
      debugLog('[/api/chat] received messages count:', messages.length, 'model:', model)
      const roles = messages.map(m => m.role).slice(0, 20)
      debugLog('[/api/chat] roles:', roles)
    } catch (e) {}

    const apiUrl = YUN_API_URL
    const apiKey = YUN_API_KEY
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

    try {
      const preview = (typeof content === 'string' ? content : JSON.stringify(content)).slice(0, 400)
      debugLog('[/api/chat] assistant content preview:', preview.replace(/\n/g, ' '))
    } catch (e) {}

    try {
      const fixed = wrapLatexIfNeeded(content)
      if (sessionId) {
        try {
          const userMessages = messages.filter(m => m.role !== 'system')
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

export default router
