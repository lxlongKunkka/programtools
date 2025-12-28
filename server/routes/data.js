import express from 'express'
import fs from 'fs'
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'
import { DIRS, JWT_SECRET, MAIL_CONFIG } from '../config.js'
import { loadSession, saveSession, clearSession } from '../utils/session.js'
import { debugLog } from '../utils/logger.js'
import Document from '../models/Document.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'

const router = express.Router()

// --- Document Management Routes ---

// Get all unique domainIds
router.get('/documents/domains', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const domains = await Document.distinct('domainId', { docType: 10 })
    return res.json(domains.filter(Boolean).sort())
  } catch (e) {
    console.error('Get domains error:', e)
    return res.status(500).json({ error: e.message })
  }
})

// Get documents by domainId
router.get('/documents', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { domainId, page = 1, limit = 50 } = req.query
    const query = { docType: 10 }
    if (domainId) query.domainId = domainId
    
    // Only fetch necessary fields for list to save bandwidth
    const docs = await Document.find(query)
      .select('title content contentbak domainId tag pid docId reference config solutionGenerated hydroFiles')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean()
      
    // Handle references for solutionGenerated status and hydroFiles
    const refPids = docs
      .filter(d => d.reference && d.reference.pid)
      .map(d => Number(d.reference.pid)) // Ensure Number
      .filter(pid => !isNaN(pid))
      
    if (refPids.length > 0) {
        const refDocs = await Document.find({ docId: { $in: refPids } })
            .select('docId solutionGenerated hydroFiles')
            .lean()
            
        const statusMap = {}
        const filesMap = {}
        refDocs.forEach(d => {
            if (d.solutionGenerated) {
                statusMap[d.docId] = true
            }
            if (d.hydroFiles) {
                filesMap[d.docId] = d.hydroFiles
            }
        })
        
        docs.forEach(d => {
            if (d.reference && d.reference.pid) {
                const refPid = Number(d.reference.pid)
                if (statusMap[refPid]) {
                    d.solutionGenerated = true
                }
                if (filesMap[refPid]) {
                    d.hydroFiles = filesMap[refPid]
                }
            }
        })
    }

    const total = await Document.countDocuments(query)
    
    return res.json({ docs, total, page: Number(page), totalPages: Math.ceil(total / limit) })
  } catch (e) {
    console.error('Get documents error:', e)
    return res.status(500).json({ error: e.message })
  }
})

// Update a document
router.put('/documents/:id', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { id } = req.params
    const { title, content, contentbak, tag, removePid } = req.body
    
    const doc = await Document.findById(id)
    if (!doc) return res.status(404).json({ error: 'Document not found' })

    const update = {}
    if (title !== undefined) update.title = title
    if (content !== undefined) update.content = content
    
    // Only update contentbak if it doesn't exist in DB
    if (contentbak !== undefined && !doc.contentbak) {
      update.contentbak = contentbak
    }
    
    if (tag !== undefined) update.tag = tag
    
    const ops = { $set: update }
    if (removePid) {
      ops.$unset = { pid: "" }
    }
    
    const updatedDoc = await Document.findByIdAndUpdate(id, ops, { new: true })
    return res.json(updatedDoc)
  } catch (e) {
    console.error('Update document error:', e)
    return res.status(500).json({ error: e.message })
  }
})

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

// Send batch zip via email
router.post('/send-batch-zip', authenticateToken, async (req, res) => {
  try {
    const { zipBase64, filename } = req.body
    if (!zipBase64 || !filename) {
      return res.status(400).json({ error: 'Missing zipBase64 or filename' })
    }

    const to = MAIL_CONFIG.to
    if (!to) {
      return res.json({ ok: true, message: 'MAIL_TO not configured, skipped sending email' })
    }

    const transporter = nodemailer.createTransport({
      host: MAIL_CONFIG.host,
      port: MAIL_CONFIG.port,
      secure: MAIL_CONFIG.secure,
      auth: MAIL_CONFIG.user ? {
        user: MAIL_CONFIG.user,
        pass: MAIL_CONFIG.pass
      } : undefined
    })

    const buffer = Buffer.from(zipBase64, 'base64')
    const user = req.user ? req.user.username : 'Anonymous'

    await transporter.sendMail({
      from: MAIL_CONFIG.from,
      to: to,
      subject: `[ProgramTools] Batch Download from ${user}`,
      text: `User ${user} has performed a batch download. The file is attached.\nFilename: ${filename}\nTime: ${new Date().toLocaleString()}`,
      attachments: [
        {
          filename: filename,
          content: buffer
        }
      ]
    })

    return res.json({ ok: true })
  } catch (e) {
    console.error('Send batch zip error:', e)
    return res.status(500).json({ error: e.message })
  }
})

// Toggle solution generated status
router.put('/documents/:id/solution-status', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    
    const doc = await Document.findById(id)
    if (!doc) return res.status(404).json({ error: 'Document not found' })
    
    let targetId = doc._id
    
    // If it's a reference, update the original
    if (doc.reference && doc.reference.pid) {
        const query = { docId: doc.reference.pid }
        if (doc.reference.domainId) query.domainId = doc.reference.domainId
        
        const original = await Document.findOne(query)
        if (original) {
            targetId = original._id
        }
    }
    
    await Document.findByIdAndUpdate(targetId, { $set: { solutionGenerated: status } })
    return res.json({ success: true })
  } catch (e) {
    console.error('Toggle solution status error:', e)
    return res.status(500).json({ error: e.message })
  }
})

export default router
