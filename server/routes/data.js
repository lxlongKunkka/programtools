import express from 'express'
import fs from 'fs'
import jwt from 'jsonwebtoken'
import { DIRS, JWT_SECRET } from '../config.js'
import { loadSession, saveSession, clearSession } from '../utils/session.js'
import { debugLog } from '../utils/logger.js'

const router = express.Router()

router.get('/models', async (req, res) => {
  try {
    const file = DIRS.models
    const txt = await fs.promises.readFile(file, 'utf8')
    let data = JSON.parse(txt)

    const authHeader = req.headers['authorization']
    let isAdmin = false
    if (authHeader) {
      const token = authHeader.split(' ')[1]
      try {
        const decoded = jwt.verify(token, JWT_SECRET)
        if (decoded.role === 'admin') isAdmin = true
      } catch (e) {}
    }

    if (!isAdmin) {
      data = data.filter(m => m.role !== 'admin')
    }

    return res.json(data)
  } catch (e) {
    debugLog('failed to read server/models.json', e)
    return res.status(500).json([])
  }
})

router.get('/sessions/:id', async (req, res) => {
  try {
    const id = req.params.id
    const data = await loadSession(id)
    return res.json(data)
  } catch (e) {
    return res.status(500).json([])
  }
})

router.post('/sessions/:id', async (req, res) => {
  try {
    const id = req.params.id
    const messages = req.body || []
    await saveSession(id, messages)
    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ ok: false })
  }
})

router.post('/sessions/:id/clear', async (req, res) => {
  try {
    const id = req.params.id
    await clearSession(id)
    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ ok: false })
  }
})

export default router
