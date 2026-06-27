import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'
import archiver from 'archiver'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const router = express.Router()

// 配置文件上传
const upload = multer({
  dest: path.join(__dirname, '../../temp/uploads'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.md') || file.originalname.endsWith('.markdown')) {
      cb(null, true)
    } else {
      cb(new Error('只支持 .md 和 .markdown 文件'))
    }
  }
})

// 临时文件目录
const TEMP_UPLOAD_DIR = path.join(__dirname, '../../temp/uploads')
const TEMP_PDF_DIR = path.join(__dirname, '../../temp/pdf-outputs')
const MD2PDF_BUNDLE = path.join(__dirname, '../../other/dist/md2pdf_bundle.js')

// 确保临时目录存在
async function ensureTempDirs() {
  try {
    await fs.mkdir(TEMP_UPLOAD_DIR, { recursive: true })
    await fs.mkdir(TEMP_PDF_DIR, { recursive: true })
  } catch (error) {
    console.error('创建临时目录失败:', error)
  }
}

ensureTempDirs()

// 将 Markdown 转换为 PDF
async function convertMd2Pdf(mdPath, pdfPath, options = {}) {
  return new Promise((resolve, reject) => {
    // 构建命令参数
    const args = [MD2PDF_BUNDLE, mdPath, '-o', pdfPath]
    
    // 添加选项参数
    if (options.paperSize) args.push('--paper-size', options.paperSize)
    if (options.orientation) args.push('--orientation', options.orientation)
    if (options.margin) args.push('--margin', options.margin)
    if (options.displayHeaderFooter) args.push('--header-footer')
    if (options.printBackground) args.push('--print-background')
    
    const childProcess = spawn('node', args, {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'production' }
    })
    
    let stdout = ''
    let stderr = ''
    
    childProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })
    
    childProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })
    
    childProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr })
      } else {
        reject(new Error(`PDF 转换失败 (code ${code}): ${stderr || '未知错误'}`))
      }
    })
    
    childProcess.on('error', (error) => {
      reject(new Error(`启动转换工具失败: ${error.message}`))
    })
    
    // 设置超时（2分钟）
    setTimeout(() => {
      childProcess.kill()
      reject(new Error('PDF 转换超时（2分钟）'))
    }, 2 * 60 * 1000)
  })
}

// 单文件转换接口
router.post('/md2pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' })
    }
    
    const options = req.body.options ? JSON.parse(req.body.options) : {}
    const mdPath = req.file.path
    const pdfFileName = req.file.originalname.replace(/\.(md|markdown)$/, '.pdf')
    const pdfPath = path.join(TEMP_PDF_DIR, `${Date.now()}-${pdfFileName}`)
    
    // 转换为 PDF
    await convertMd2Pdf(mdPath, pdfPath, options)
    
    // 获取文件信息
    const stats = await fs.stat(pdfPath)
    
    // 删除临时 MD 文件
    await fs.unlink(mdPath).catch(() => {})
    
    res.json({
      success: true,
      file: {
        name: pdfFileName,
        path: pdfPath,
        size: stats.size,
        url: `/temp/pdf-outputs/${path.basename(pdfPath)}`
      }
    })
  } catch (error) {
    console.error('MD 转 PDF 失败:', error)
    
    // 清理临时文件
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {})
    }
    
    res.status(500).json({ 
      success: false,
      error: error.message || 'PDF 转换失败' 
    })
  }
})

// 打包下载多个 PDF
router.post('/md2pdf/download-all', async (req, res) => {
  try {
    const { files } = req.body
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: '没有可下载的文件' })
    }
    
    // 创建 zip 文件
    const archive = archiver('zip', {
      zlib: { level: 9 }
    })
    
    res.attachment(`markdown-pdfs-${Date.now()}.zip`)
    archive.pipe(res)
    
    // 添加所有文件到 zip
    for (const filePath of files) {
      try {
        await fs.access(filePath)
        const fileName = path.basename(filePath).replace(/^\d+-/, '') // 移除时间戳前缀
        archive.file(filePath, { name: fileName })
      } catch (error) {
        console.error(`文件不存在: ${filePath}`)
      }
    }
    
    await archive.finalize()
  } catch (error) {
    console.error('打包下载失败:', error)
    res.status(500).json({ error: '打包下载失败' })
  }
})

// 清理旧文件（定期任务）
async function cleanupOldFiles() {
  try {
    const now = Date.now()
    const maxAge = 2 * 60 * 60 * 1000 // 2 小时
    
    // 清理上传目录
    const uploadFiles = await fs.readdir(TEMP_UPLOAD_DIR)
    for (const file of uploadFiles) {
      const filePath = path.join(TEMP_UPLOAD_DIR, file)
      const stats = await fs.stat(filePath)
      
      if (now - stats.mtimeMs > maxAge) {
        await fs.unlink(filePath).catch(() => {})
        console.log(`清理旧上传文件: ${file}`)
      }
    }
    
    // 清理 PDF 输出目录
    const pdfFiles = await fs.readdir(TEMP_PDF_DIR)
    for (const file of pdfFiles) {
      const filePath = path.join(TEMP_PDF_DIR, file)
      const stats = await fs.stat(filePath)
      
      if (now - stats.mtimeMs > maxAge) {
        await fs.unlink(filePath).catch(() => {})
        console.log(`清理旧 PDF 文件: ${file}`)
      }
    }
  } catch (error) {
    console.error('清理旧文件失败:', error)
  }
}

// 每30分钟清理一次
setInterval(cleanupOldFiles, 30 * 60 * 1000)

export default router
