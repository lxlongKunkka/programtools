import express from 'express'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'
import archiver from 'archiver'
import CourseLevel from '../models/CourseLevel.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const router = express.Router()

// 临时文件目录
const TEMP_DIR = path.join(__dirname, '../../temp/pdf-exports')
const MD2PDF_BUNDLE = path.join(__dirname, '../../other/dist/md2pdf_bundle.js')

// 确保临时目录存在
async function ensureTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true })
  } catch (error) {
    console.error('创建临时目录失败:', error)
  }
}

// 获取所有课程组
router.get('/groups', async (req, res) => {
  try {
    const groups = await CourseLevel.distinct('group')
    res.json({ groups: groups.filter(Boolean) })
  } catch (error) {
    console.error('获取课程组失败:', error)
    res.status(500).json({ error: '获取课程组失败' })
  }
})

// 获取指定组的级别列表
router.get('/levels', async (req, res) => {
  try {
    const { group } = req.query
    const levels = await CourseLevel.find({ group })
      .select('_id level title description topics')
      .sort({ level: 1 })
      .lean()
    
    res.json({ levels })
  } catch (error) {
    console.error('获取级别列表失败:', error)
    res.status(500).json({ error: '获取级别列表失败' })
  }
})

// 将课程内容转换为 Markdown
function levelToMarkdown(level, options = {}) {
  let md = `# ${level.title}\n\n`
  
  if (options.includeDescription && level.description) {
    md += `${level.description}\n\n`
  }
  
  md += `---\n\n`
  
  for (const [topicIndex, topic] of level.topics.entries()) {
    md += `## Topic ${topicIndex + 1}: ${topic.title}\n\n`
    
    if (topic.description) {
      md += `${topic.description}\n\n`
    }
    
    const chapters = topic.chapters || []
    const filteredChapters = options.includeEmptyChapters 
      ? chapters 
      : chapters.filter(ch => ch.content && ch.content.trim())
    
    if (filteredChapters.length === 0) {
      md += `*本 Topic 暂无章节内容*\n\n`
      continue
    }
    
    for (const [chapterIndex, chapter] of filteredChapters.entries()) {
      md += `### ${chapter.id || `${topicIndex + 1}-${chapterIndex + 1}`}. ${chapter.title}\n\n`
      
      if (chapter.content) {
        md += `${chapter.content}\n\n`
      }
      
      if (chapter.problemIds && chapter.problemIds.length > 0) {
        md += `**练习题目**: ${chapter.problemIds.join(', ')}\n\n`
      }
      
      md += `---\n\n`
    }
  }
  
  return md
}

// 将 Markdown 转换为 PDF
async function convertMarkdownToPdf(markdownPath, pdfPath) {
  return new Promise((resolve, reject) => {
    // 检查 md2pdf 工具是否存在
    fs.access(MD2PDF_BUNDLE).catch(() => {
      return reject(new Error('md2pdf 工具不存在，请确保 other/dist/md2pdf_bundle.js 文件存在'))
    })
    
    const childProcess = spawn('node', [MD2PDF_BUNDLE, markdownPath, '-o', pdfPath], {
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
        reject(new Error(`md2pdf 失败 (code ${code}): ${stderr || '未知错误'}`))
      }
    })
    
    childProcess.on('error', (error) => {
      reject(new Error(`启动 md2pdf 失败: ${error.message}`))
    })
    
    // 设置超时（5分钟）
    setTimeout(() => {
      childProcess.kill()
      reject(new Error('PDF 转换超时（5分钟）'))
    }, 5 * 60 * 1000)
  })
}

// 批量导出 PDF
router.post('/export-pdf', async (req, res) => {
  try {
    const { levelIds, options = {} } = req.body
    
    if (!levelIds || levelIds.length === 0) {
      return res.status(400).json({ error: '请选择至少一个级别' })
    }
    
    await ensureTempDir()
    
    // 为本次导出创建唯一的子目录
    const exportId = `export-${Date.now()}`
    const exportDir = path.join(TEMP_DIR, exportId)
    await fs.mkdir(exportDir, { recursive: true })
    
    const exportedFiles = []
    const errors = []
    
    // 获取所有选中的级别
    const levels = await CourseLevel.find({ _id: { $in: levelIds } })
      .sort({ level: 1 })
      .lean()
    
    for (const level of levels) {
      try {
        const levelName = `Level${level.level}_${level.title.replace(/[\/\\:*?"<>|]/g, '_')}`
        
        if (options.oneFilePerTopic) {
          // 每个 Topic 单独一个文件
          for (const [topicIndex, topic] of level.topics.entries()) {
            const topicName = `${levelName}_Topic${topicIndex + 1}`
            const mdPath = path.join(exportDir, `${topicName}.md`)
            const pdfPath = path.join(exportDir, `${topicName}.pdf`)
            
            // 生成单个 Topic 的 Markdown
            let md = `# ${level.title}\n\n## Topic ${topicIndex + 1}: ${topic.title}\n\n`
            if (topic.description) {
              md += `${topic.description}\n\n`
            }
            
            const chapters = topic.chapters || []
            const filteredChapters = options.includeEmptyChapters 
              ? chapters 
              : chapters.filter(ch => ch.content && ch.content.trim())
            
            for (const [chapterIndex, chapter] of filteredChapters.entries()) {
              md += `### ${chapter.id || `${topicIndex + 1}-${chapterIndex + 1}`}. ${chapter.title}\n\n`
              if (chapter.content) {
                md += `${chapter.content}\n\n`
              }
              md += `---\n\n`
            }
            
            await fs.writeFile(mdPath, md, 'utf-8')
            await convertMarkdownToPdf(mdPath, pdfPath)
            
            const stats = await fs.stat(pdfPath)
            exportedFiles.push({
              name: `${topicName}.pdf`,
              path: pdfPath,
              size: stats.size,
              url: `/temp/pdf-exports/${exportId}/${topicName}.pdf`
            })
            
            // 删除临时 Markdown 文件
            await fs.unlink(mdPath)
          }
        } else if (options.oneFilePerChapter) {
          // 每个 Chapter 单独一个文件
          for (const [topicIndex, topic] of level.topics.entries()) {
            const chapters = topic.chapters || []
            const filteredChapters = options.includeEmptyChapters 
              ? chapters 
              : chapters.filter(ch => ch.content && ch.content.trim())
            
            for (const [chapterIndex, chapter] of filteredChapters.entries()) {
              const chapterName = `${levelName}_T${topicIndex + 1}_C${chapterIndex + 1}_${chapter.title.replace(/[\/\\:*?"<>|]/g, '_')}`
              const mdPath = path.join(exportDir, `${chapterName}.md`)
              const pdfPath = path.join(exportDir, `${chapterName}.pdf`)
              
              let md = `# ${level.title}\n\n## ${topic.title}\n\n### ${chapter.title}\n\n`
              if (chapter.content) {
                md += `${chapter.content}\n\n`
              }
              
              await fs.writeFile(mdPath, md, 'utf-8')
              await convertMarkdownToPdf(mdPath, pdfPath)
              
              const stats = await fs.stat(pdfPath)
              exportedFiles.push({
                name: `${chapterName}.pdf`,
                path: pdfPath,
                size: stats.size,
                url: `/temp/pdf-exports/${exportId}/${chapterName}.pdf`
              })
              
              await fs.unlink(mdPath)
            }
          }
        } else {
          // 每个 Level 一个文件
          const mdPath = path.join(exportDir, `${levelName}.md`)
          const pdfPath = path.join(exportDir, `${levelName}.pdf`)
          
          const md = levelToMarkdown(level, options)
          await fs.writeFile(mdPath, md, 'utf-8')
          await convertMarkdownToPdf(mdPath, pdfPath)
          
          const stats = await fs.stat(pdfPath)
          exportedFiles.push({
            name: `${levelName}.pdf`,
            path: pdfPath,
            size: stats.size,
            url: `/temp/pdf-exports/${exportId}/${levelName}.pdf`
          })
          
          // 删除临时 Markdown 文件
          await fs.unlink(mdPath)
        }
      } catch (error) {
        console.error(`Level ${level.level} 导出失败:`, error)
        errors.push(`Level ${level.level} (${level.title}): ${error.message}`)
      }
    }
    
    res.json({
      success: true,
      exportId,
      files: exportedFiles,
      errors
    })
  } catch (error) {
    console.error('PDF 导出失败:', error)
    res.status(500).json({ error: error.message || 'PDF 导出失败' })
  }
})

// 打包下载所有文件
router.post('/export-pdf/download-all', async (req, res) => {
  try {
    const { files } = req.body
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: '没有可下载的文件' })
    }
    
    // 创建 zip 文件
    const archive = archiver('zip', {
      zlib: { level: 9 }
    })
    
    res.attachment(`course-export-${Date.now()}.zip`)
    archive.pipe(res)
    
    // 添加所有文件到 zip
    for (const filePath of files) {
      if (await fs.access(filePath).then(() => true).catch(() => false)) {
        const fileName = path.basename(filePath)
        archive.file(filePath, { name: fileName })
      }
    }
    
    await archive.finalize()
  } catch (error) {
    console.error('打包下载失败:', error)
    res.status(500).json({ error: '打包下载失败' })
  }
})

// 清理旧的导出文件（定期任务）
async function cleanupOldExports() {
  try {
    const files = await fs.readdir(TEMP_DIR)
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 小时
    
    for (const file of files) {
      if (file.startsWith('export-')) {
        const exportDir = path.join(TEMP_DIR, file)
        const stats = await fs.stat(exportDir)
        
        if (now - stats.mtimeMs > maxAge) {
          await fs.rm(exportDir, { recursive: true, force: true })
          console.log(`清理旧导出: ${file}`)
        }
      }
    }
  } catch (error) {
    console.error('清理旧导出失败:', error)
  }
}

// 每小时清理一次
setInterval(cleanupOldExports, 60 * 60 * 1000)

export default router
