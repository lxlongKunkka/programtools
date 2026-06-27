import { chromium } from 'playwright'
import { marked } from 'marked'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const testMd = `# 测试文档

## 代码示例

\`\`\`python
def hello():
    print("Hello World")
\`\`\`

## 数学公式

行内公式：$E = mc^2$

块级公式：

$$
\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$

## 列表

1. 第一项
2. 第二项
3. 第三项

完成！
`

async function test() {
  console.log('🧪 开始测试 PDF 生成...')
  
  const chromePath = path.join(__dirname, '../other/dist/chrome-linux64/chrome')
  console.log('Chrome 路径:', chromePath)
  console.log('Chrome 是否存在:', fs.existsSync(chromePath))
  
  let browser = null
  try {
    console.log('\n1️⃣ 启动浏览器...')
    browser = await chromium.launch({
      headless: true,
      executablePath: chromePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    console.log('✅ 浏览器启动成功')
    
    console.log('\n2️⃣ 创建页面...')
    const page = await browser.newPage()
    console.log('✅ 页面创建成功')
    
    console.log('\n3️⃣ 生成 HTML...')
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Test</title></head>
<body>${marked.parse(testMd)}</body>
</html>`
    console.log('HTML 长度:', html.length)
    
    console.log('\n4️⃣ 加载内容...')
    await page.setContent(html, { waitUntil: 'networkidle' })
    console.log('✅ 内容加载成功')
    
    console.log('\n5️⃣ 生成 PDF...')
    const pdfPath = '/tmp/test-direct.pdf'
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true
    })
    console.log('✅ PDF 生成成功:', pdfPath)
    
    const stats = fs.statSync(pdfPath)
    console.log('PDF 文件大小:', stats.size, 'bytes')
    
    await browser.close()
    console.log('\n✅ 测试完成！')
    
    // 验证 PDF
    console.log('\n6️⃣ 验证 PDF 内容...')
    const pdfContent = fs.readFileSync(pdfPath)
    const isPdf = pdfContent.toString('ascii', 0, 4) === '%PDF'
    console.log('PDF 头部正确:', isPdf)
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message)
    if (browser) {
      await browser.close().catch(() => {})
    }
    process.exit(1)
  }
}

test()
