import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import util from 'util'
import { authenticateToken } from '../middleware/auth.js'

const execPromise = util.promisify(exec)
const router = express.Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Define paths to scripts
const SCRIPTS_DIR = path.join(__dirname, '../scripts/gesp')
const PARSE_SCRIPT = path.join(SCRIPTS_DIR, 'parse_gesp.py')
const PARSE_HTML_SCRIPT = path.join(SCRIPTS_DIR, 'parse_html_gesp.py')
const FPS_SCRIPT = path.join(SCRIPTS_DIR, 'json_to_fps.py')
const MD_SCRIPT = path.join(SCRIPTS_DIR, 'json_to_hydro_md.py')

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

    // Create a unique temp folder for this request to avoid collisions
    const requestId = Date.now() + '_' + Math.random().toString(36).substring(7)
    const requestDir = path.join(TEMP_DIR, requestId)
    fs.mkdirSync(requestDir)

    const pdfPath = path.join(requestDir, fileName)
    
    // Decode Base64 and write to file
    // Remove data URL prefix if present (e.g., "data:application/pdf;base64,")
    const base64Data = fileData.replace(/^data:application\/pdf;base64,/, "")
    await fs.promises.writeFile(pdfPath, base64Data, 'base64')

    // 1. Parse PDF -> JSON
    // Note: We assume 'python' is available in the system path.
    // If using a specific venv, this might need adjustment.
    await execPromise(`python "${PARSE_SCRIPT}" "${pdfPath}"`)

    const jsonPath = pdfPath + '.json'
    if (!fs.existsSync(jsonPath)) {
      throw new Error('Failed to generate JSON')
    }

    // 2. JSON -> FPS XML
    const xmlPath = pdfPath + '.xml'
    await execPromise(`python "${FPS_SCRIPT}" "${jsonPath}" "${xmlPath}"`)

    // 3. JSON -> Hydro Markdown
    // The script generates .md file in the same directory
    await execPromise(`python "${MD_SCRIPT}" "${jsonPath}"`)
    const mdPath = pdfPath + '.md'

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
    // fs.rmSync(requestDir, { recursive: true, force: true }) 
    // Uncomment above line to enable cleanup. Kept commented for debugging if needed.
    // For production, we should clean up.
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
    res.status(500).json({ error: error.message, details: error.stderr })
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

    // Run python script
    // Use 'python' or 'python3' depending on environment. Assuming 'python' works based on previous context.
    const { stdout, stderr } = await execPromise(`python "${PARSE_HTML_SCRIPT}" "${htmlPath}"`)
    
    if (stderr) {
        console.warn('Python script stderr:', stderr)
    }

    // Clean up
    try {
      fs.rmSync(requestDir, { recursive: true, force: true })
    } catch (e) {
      console.error('Failed to cleanup temp dir:', e)
    }

    res.json({ md: stdout })

  } catch (error) {
    console.error('HTML Conversion error:', error)
    res.status(500).json({ error: 'Conversion failed', details: error.message })
  }
})

export default router
