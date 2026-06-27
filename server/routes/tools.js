import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import { existsSync, readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import archiver from 'archiver'
import { chromium } from 'playwright'
import { marked } from 'marked'

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
const ASSETS_DIR = path.join(__dirname, '../../other/dist/assets')

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

// 加载样式资源
let HLJS_CSS, KATEX_CSS, MANUAL_CSS, HLJS_JS, KATEX_JS

try {
  HLJS_CSS = readFileSync(path.join(ASSETS_DIR, 'hljs.css'), 'utf8')
  KATEX_CSS = readFileSync(path.join(ASSETS_DIR, 'katex.css'), 'utf8')
  MANUAL_CSS = readFileSync(path.join(ASSETS_DIR, 'typora_manual_theme.css'), 'utf8')
  HLJS_JS = readFileSync(path.join(ASSETS_DIR, 'hljs.js'), 'utf8')
  KATEX_JS = readFileSync(path.join(ASSETS_DIR, 'katex.js'), 'utf8')
  console.log('成功加载 assets 资源')
} catch (error) {
  console.error('加载 assets 资源失败:', error)
}

// 生成 HTML
function makeHtml(mdContent) {
  const body = marked.parse(mdContent)
  
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>${HLJS_CSS}</style>
<style>${KATEX_CSS}</style>
<style>${MANUAL_CSS}</style>
<script>${HLJS_JS}</script>
<script>${KATEX_JS}</script>
</head>
<body>
${body}
<script>
document.addEventListener("DOMContentLoaded", () => {
  if (typeof hljs !== 'undefined') {
    hljs.highlightAll();
  }
  if (typeof renderMathInElement !== 'undefined') {
    renderMathInElement(document.body, {
      delimiters: [
        {left:"$$",right:"$$",display:true},
        {left:"$",right:"$",display:false}
      ],
      throwOnError: false
    });
  }
});
</script>
</body>
</html>`
}

// 将 Markdown 转换为 PDF
async function convertMd2Pdf(mdPath, pdfPath, options = {}) {
  let browser = null
  
  try {
    // 读取 Markdown 文件
    const mdContent = await fs.readFile(mdPath, 'utf8')
    
    // 生成 HTML
    const html = makeHtml(mdContent)
    
    // Chrome 可执行文件路径
    const chromePath = path.join(__dirname, '../../other/dist/chrome-linux64/chrome')
    
    // 启动浏览器
    browser = await chromium.launch({
      headless: true,
      executablePath: chromePath
    })
    
    const page = await browser.newPage()
    
    // 加载 HTML
    await page.setContent(html, { waitUntil: 'networkidle' })
    
    // 配置 PDF 选项
    const pdfOptions = {
      path: pdfPath,
      format: options.paperSize || 'A4',
      landscape: options.orientation === 'landscape',
      printBackground: options.printBackground !== false,
      displayHeaderFooter: options.displayHeaderFooter || false,
      margin: {}
    }
    
    // 设置页边距
    const marginMap = {
      'standard': { top: '2.54cm', right: '2.54cm', bottom: '2.54cm', left: '2.54cm' },
      'narrow': { top: '1.27cm', right: '1.27cm', bottom: '1.27cm', left: '1.27cm' },
      'wide': { top: '3.81cm', right: '3.81cm', bottom: '3.81cm', left: '3.81cm' }
    }
    
    pdfOptions.margin = marginMap[options.margin] || marginMap['standard']
    
    // 生成 PDF
    await page.pdf(pdfOptions)
    
    await browser.close()
    
    console.log(`PDF 转换成功: ${pdfPath}`)
  } catch (error) {
    if (browser) {
      await browser.close().catch(() => {})
    }
    throw new Error(`PDF 转换失败: ${error.message}`)
  }
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
