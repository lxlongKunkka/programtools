import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import nodemailer from 'nodemailer'
import { authenticateToken } from '../middleware/auth.js'
import { MAIL_CONFIG } from '../config.js'
import { parseHtml } from '../utils/gesp/parseHtml.js'
import { parsePdf } from '../utils/gesp/parsePdf.js'
import { jsonToFps } from '../utils/gesp/jsonToFps.js'
import { jsonToHydroMd } from '../utils/gesp/jsonToHydroMd.js'

const router = express.Router()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Ensure temp directory exists
const TEMP_DIR = path.join(__dirname, '../temp_gesp')
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true })
}

router.post('/convert', authenticateToken, async (req, res) => {
  try {
    const { fileData, fileName } = req.body
    if (!fileData || !fileName) {
      return res.status(400).json({ error: 'Missing file data or name' })
    }

    const requestId = Date.now() + '_' + Math.random().toString(36).substring(7)
    const requestDir = path.join(TEMP_DIR, requestId)
    fs.mkdirSync(requestDir)

    const pdfPath = path.join(requestDir, fileName)
    const base64Data = fileData.replace(/^data:application\/pdf;base64,/, "")
    await fs.promises.writeFile(pdfPath, base64Data, 'base64')

    // 1. Parse PDF -> JSON
    const questions = await parsePdf(pdfPath)
    const jsonPath = pdfPath + '.json'
    await fs.promises.writeFile(jsonPath, JSON.stringify(questions, null, 2), 'utf-8')

    // 2. JSON -> FPS XML
    const xmlPath = pdfPath + '.xml'
    jsonToFps(jsonPath, xmlPath)

    // 3. JSON -> Hydro Markdown
    const mdPath = jsonToHydroMd(jsonPath)

    // Read results
    const jsonContent = await fs.promises.readFile(jsonPath, 'utf-8')
    
    let xmlContent = ''
    if (fs.existsSync(xmlPath)) {
      xmlContent = await fs.promises.readFile(xmlPath, 'utf-8')
    }
    
    let mdContent = ''
    if (fs.existsSync(mdPath)) {
      mdContent = await fs.promises.readFile(mdPath, 'utf-8')
    }

    // Clean up
    fs.rmSync(requestDir, { recursive: true, force: true })

    res.json({
      success: true,
      data: {
        json: JSON.parse(jsonContent),
        xml: xmlContent,
        md: mdContent
      }
    })

  } catch (error) {
    console.error('GESP Conversion Error:', error)
    res.status(500).json({ error: error.message })
  }
})

router.post('/convert-html', authenticateToken, async (req, res) => {
  try {
    const { htmlContent } = req.body
    if (!htmlContent) {
      return res.status(400).json({ error: 'Missing HTML content' })
    }

    const requestId = Date.now() + '_' + Math.random().toString(36).substring(7)
    const requestDir = path.join(TEMP_DIR, requestId)
    fs.mkdirSync(requestDir)

    const htmlPath = path.join(requestDir, 'input.html')
    await fs.promises.writeFile(htmlPath, htmlContent, 'utf-8')

    // Parse HTML (now async to upload images)
    const { md, title } = await parseHtml(htmlPath)

    // Clean up
    fs.rmSync(requestDir, { recursive: true, force: true })

    res.json({ md, title })

  } catch (error) {
    console.error('HTML Conversion error:', error)
    res.status(500).json({ 
        error: 'Conversion failed', 
        details: error.message
    })
  }
})

router.post('/send-email', authenticateToken, async (req, res) => {
  try {
    const { zipData, fileName, to } = req.body
    if (!zipData || !fileName) {
      return res.status(400).json({ error: 'Missing zip data or filename' })
    }

    // Default recipient if not provided
    const recipient = to || '110076790@qq.com'

    const transporter = nodemailer.createTransport({
      host: MAIL_CONFIG.host,
      port: MAIL_CONFIG.port,
      secure: MAIL_CONFIG.secure,
      auth: MAIL_CONFIG.user ? {
        user: MAIL_CONFIG.user,
        pass: MAIL_CONFIG.pass
      } : undefined
    })

    // Decode base64
    const buffer = Buffer.from(zipData.replace(/^data:.*?;base64,/, ""), 'base64')

    const info = await transporter.sendMail({
      from: MAIL_CONFIG.from,
      to: recipient,
      subject: `GESP 导出文件: ${fileName}`,
      text: `您好，\n\n附件是您导出的 GESP 试卷包：${fileName}。\n\n请查收。`,
      attachments: [
        {
          filename: fileName,
          content: buffer
        }
      ]
    })

    res.json({ success: true, messageId: info.messageId })

  } catch (error) {
    console.error('Send Email Error:', error)
    res.status(500).json({ error: 'Failed to send email', details: error.message })
  }
})

export default router
