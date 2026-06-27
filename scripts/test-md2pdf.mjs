// 测试 MD 转 PDF 功能
import { chromium } from 'playwright'
import { marked } from 'marked'
import fs from 'fs/promises'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 测试内容
const testMarkdown = `# 测试文档

这是一个简单的测试。

## 代码示例

\`\`\`python
def hello():
    print("Hello World")
\`\`\`

## 数学公式

行内公式：$E = mc^2$

块级公式：

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$
`

async function testConversion() {
  console.log('🔍 开始测试 MD 转 PDF 功能...\n')
  
  try {
    // 1. 检查 assets 资源
    console.log('1️⃣ 检查 assets 资源...')
    const assetsDir = path.join(__dirname, '../other/dist/assets')
    const requiredFiles = ['hljs.css', 'katex.css', 'typora_manual_theme.css', 'hljs.js', 'katex.js']
    
    for (const file of requiredFiles) {
      const filePath = path.join(assetsDir, file)
      try {
        await fs.access(filePath)
        console.log(`   ✓ ${file}`)
      } catch {
        console.log(`   ✗ ${file} 不存在`)
        throw new Error(`缺少资源文件: ${file}`)
      }
    }
    
    // 2. 加载样式资源
    console.log('\n2️⃣ 加载样式资源...')
    const HLJS_CSS = readFileSync(path.join(assetsDir, 'hljs.css'), 'utf8')
    const KATEX_CSS = readFileSync(path.join(assetsDir, 'katex.css'), 'utf8')
    const MANUAL_CSS = readFileSync(path.join(assetsDir, 'typora_manual_theme.css'), 'utf8')
    const HLJS_JS = readFileSync(path.join(assetsDir, 'hljs.js'), 'utf8')
    const KATEX_JS = readFileSync(path.join(assetsDir, 'katex.js'), 'utf8')
    console.log('   ✓ 所有资源加载成功')
    console.log(`   - HLJS CSS: ${(HLJS_CSS.length / 1024).toFixed(1)} KB`)
    console.log(`   - KATEX CSS: ${(KATEX_CSS.length / 1024).toFixed(1)} KB`)
    console.log(`   - 主题 CSS: ${(MANUAL_CSS.length / 1024).toFixed(1)} KB`)
    
    // 3. 转换 Markdown 为 HTML
    console.log('\n3️⃣ 转换 Markdown 为 HTML...')
    const body = marked.parse(testMarkdown)
    const html = `<!DOCTYPE html>
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
    console.log(`   ✓ HTML 生成成功 (${(html.length / 1024).toFixed(1)} KB)`)
    
    // 4. 测试 playwright 启动
    console.log('\n4️⃣ 测试 playwright 浏览器启动...')
    let browser
    try {
      browser = await chromium.launch({ 
        headless: true,
        timeout: 30000
      })
      console.log('   ✓ Chromium 浏览器启动成功')
      
      const page = await browser.newPage()
      console.log('   ✓ 页面创建成功')
      
      // 5. 加载 HTML
      console.log('\n5️⃣ 加载 HTML 内容...')
      await page.setContent(html, { waitUntil: 'networkidle', timeout: 30000 })
      console.log('   ✓ HTML 内容加载成功')
      
      // 6. 生成 PDF
      console.log('\n6️⃣ 生成 PDF...')
      const pdfPath = path.join(__dirname, '../temp/test-output.pdf')
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '2.54cm', right: '2.54cm', bottom: '2.54cm', left: '2.54cm' }
      })
      
      const stats = await fs.stat(pdfPath)
      console.log(`   ✓ PDF 生成成功: ${pdfPath}`)
      console.log(`   - 文件大小: ${(stats.size / 1024).toFixed(1)} KB`)
      
      await browser.close()
      
      console.log('\n✅ 所有测试通过！MD 转 PDF 功能正常工作。')
      process.exit(0)
      
    } catch (error) {
      if (browser) {
        await browser.close().catch(() => {})
      }
      throw error
    }
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message)
    console.error('\n完整错误:')
    console.error(error)
    process.exit(1)
  }
}

testConversion()
