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
    // 检查文件扩展名（编码修复在接收后处理）
    const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8')
    if (fileName.endsWith('.md') || fileName.endsWith('.markdown')) {
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
let HLJS_CSS, KATEX_CSS, MANUAL_CSS, HLJS_JS, KATEX_JS, KATEX_AR_JS

try {
  HLJS_CSS = readFileSync(path.join(ASSETS_DIR, 'hljs.css'), 'utf8')
  KATEX_CSS = readFileSync(path.join(ASSETS_DIR, 'katex.css'), 'utf8')
  MANUAL_CSS = readFileSync(path.join(ASSETS_DIR, 'typora_manual_theme.css'), 'utf8')
  HLJS_JS = readFileSync(path.join(ASSETS_DIR, 'hljs.js'), 'utf8')
  KATEX_JS = readFileSync(path.join(ASSETS_DIR, 'katex.js'), 'utf8')
  KATEX_AR_JS = readFileSync(path.join(ASSETS_DIR, 'katex-ar.js'), 'utf8')
  console.log('成功加载 assets 资源')
} catch (error) {
  console.error('加载 assets 资源失败:', error)
}

// 生成 HTML
function makeHtml(mdContent, options = {}) {
  const body = marked.parse(mdContent)
  
  // CSS 预设的 @page 规则（紧凑格式：5mm 边距）
  const cssPageRules = options.preferCSSPageSize ? `
<style>
@page {
    size: A4;
    margin: 5mm 5mm 5mm 5mm;
}
@page :first {
    margin-top: 0mm;
}
</style>
` : ''
  
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>${HLJS_CSS}</style>
<style>${KATEX_CSS}</style>
<style>${MANUAL_CSS}</style>${cssPageRules}
<script>${HLJS_JS}</script>
<script>${KATEX_JS}</script>
<script>${KATEX_AR_JS}</script>
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
        {left:"$",right:"$",display:false},
        {left:"\\(",right:"\\)",display:false},
        {left:"\\[",right:"\\]",display:true}
      ],
      throwOnError: false
    });
  }
});
</script>
</body>
</html>`
}

// 浏览器单例（参考 md2pdf_core.js）
let browserInstance = null
let conversionCount = 0

// 获取或创建浏览器实例
async function getBrowser() {
  const chromePath = path.join(__dirname, '../../other/dist/chrome-linux64/chrome')
  
  if (!browserInstance) {
    browserInstance = await chromium.launch({
      headless: true,
      executablePath: chromePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    // 浏览器断开时清空实例
    browserInstance.on('disconnected', () => {
      browserInstance = null
      conversionCount = 0
    })
  }
  
  // 每 100 次转换重启一次浏览器（防止内存泄漏）
  conversionCount++
  if (conversionCount > 100) {
    await browserInstance.close().catch(() => {})
    browserInstance = null
    conversionCount = 0
    return getBrowser()
  }
  
  return browserInstance
}

// 关闭浏览器
async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close().catch(() => {})
    browserInstance = null
    conversionCount = 0
  }
}

// 将 Markdown 转换为 PDF
async function convertMd2Pdf(mdPath, pdfPath, options = {}) {
  let page = null
  
  try {
    console.log('[MD2PDF] 接收到的选项:', JSON.stringify(options))
    
    // 读取 Markdown 文件
    const mdContent = await fs.readFile(mdPath, 'utf8')
    
    // 生成 HTML
    const html = makeHtml(mdContent, options)
    
    // 获取浏览器实例（单例模式）
    const browser = await getBrowser()
    page = await browser.newPage()
    
    // 加载 HTML（等待网络空闲）
    await page.setContent(html, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    })
    
    // 等待 KaTeX 渲染完成（参考 md2pdf_core.js）
    await page.waitForTimeout(800)
    
    // 配置 PDF 选项
    const pdfOptions = {
      path: pdfPath,
      format: options.paperSize || 'A4',
      landscape: options.orientation === 'landscape',
      printBackground: options.printBackground !== false,
      displayHeaderFooter: options.displayHeaderFooter || false,
      margin: {},
      preferCSSPageSize: options.preferCSSPageSize || false
    }
    
    // 设置页边距
    const marginMap = {
      'standard': { top: '2.54cm', right: '2.54cm', bottom: '2.54cm', left: '2.54cm' },
      'narrow': { top: '1.27cm', right: '1.27cm', bottom: '1.27cm', left: '1.27cm' },
      'wide': { top: '3.81cm', right: '3.81cm', bottom: '3.81cm', left: '3.81cm' }
    }
    
    pdfOptions.margin = marginMap[options.margin] || marginMap['standard']
    
    console.log('[MD2PDF] PDF 生成选项:', JSON.stringify(pdfOptions))
    
    // 生成 PDF
    await page.pdf(pdfOptions)
    
    // 只关闭页面，保持浏览器实例
    await page.close()
    
    console.log(`PDF 转换成功: ${pdfPath}`)
  } catch (error) {
    if (page) {
      await page.close().catch(() => {})
    }
    console.error('PDF 转换错误:', error)
    throw new Error(`PDF 转换失败: ${error.message}`)
  }
}

// 单文件转换接口
router.post('/md2pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' })
    }
    
    // 修复文件名编码（multer 默认使用 latin1 解析，需要转为 utf8）
    let originalFileName = req.file.originalname
    try {
      originalFileName = Buffer.from(originalFileName, 'latin1').toString('utf8')
    } catch (error) {
      console.error('文件名编码转换失败:', error)
    }
    originalFileName = originalFileName.replace(/\.(md|markdown)$/, '.pdf')
    
    const options = req.body.options ? JSON.parse(req.body.options) : {}
    const mdPath = req.file.path
    // 使用时间戳作为文件系统名称，避免中文路径问题
    const safeFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`
    const pdfPath = path.join(TEMP_PDF_DIR, safeFileName)
    
    // 转换为 PDF
    await convertMd2Pdf(mdPath, pdfPath, options)
    
    // 获取文件信息
    const stats = await fs.stat(pdfPath)
    
    // 删除临时 MD 文件
    await fs.unlink(mdPath).catch(() => {})
    
    res.json({
      success: true,
      file: {
        name: originalFileName,  // 保留原始中文文件名
        safeName: safeFileName,  // 安全的文件系统名称
        path: pdfPath,
        size: stats.size,
        url: `/api/temp/pdf-outputs/${safeFileName}`  // 使用 /api 前缀避免前端路由拦截
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
    
    // 添加所有文件到 zip（优先使用前端传入的原始文件名）
    for (const fileItem of files) {
      try {
        const filePath = typeof fileItem === 'string' ? fileItem : fileItem.path
        const preferredName = typeof fileItem === 'object' && fileItem ? fileItem.name : ''
        if (!filePath) continue
        await fs.access(filePath)
        const fileName = preferredName || path.basename(filePath).replace(/^\d+-/, '') // 兼容旧调用
        archive.file(filePath, { name: fileName })
      } catch (error) {
        const missingPath = typeof fileItem === 'string' ? fileItem : fileItem?.path
        console.error(`文件不存在: ${missingPath}`)
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

// 导出浏览器清理函数
export { closeBrowser }

export default router
