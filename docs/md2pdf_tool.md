# Markdown 转 PDF 在线工具

## 功能概述

这是一个在线 Markdown 转 PDF 工具，支持上传单个或多个 .md 文件，在线转换为标准格式的 PDF 文档。

## 访问路径

- **URL**: `/md2pdf`
- **权限**: 无需登录，所有用户可用
- **入口**: 首页 (`/`) → "Markdown 转 PDF" 卡片

## 功能特性

- ✅ 支持拖拽上传和点击选择文件
- ✅ 支持批量上传多个文件
- ✅ 丰富的转换选项（纸张大小、方向、页边距等）
- ✅ 实时转换进度显示
- ✅ 在线预览生成的 PDF
- ✅ 单文件下载或批量打包下载（ZIP）
- ✅ 自动清理 2 小时前的临时文件

## 使用步骤

### 1. 上传文件
- **方式一**：拖拽 .md 或 .markdown 文件到上传区域
- **方式二**：点击"选择文件"按钮，从文件浏览器选择

### 2. 配置转换选项

#### 纸张大小
- **A4** (210 × 297 mm) - 默认，最常用
- **Letter** (8.5 × 11 in) - 美国标准
- **A3** (297 × 420 mm) - 大号纸张
- **Legal** (8.5 × 14 in) - 法律文书

#### 方向
- **纵向** (Portrait) - 默认
- **横向** (Landscape)

#### 页边距
- **标准** (2.54 cm) - 默认
- **窄** (1.27 cm) - 节省空间
- **宽** (3.81 cm) - 更多留白

#### 其他选项
- **显示页眉页脚**: 在每页顶部/底部显示页码等信息
- **打印背景颜色**: 保留 Markdown 中的背景色样式
- **使用 CSS 页面大小**: 使用 Markdown 中定义的 CSS 页面设置

### 3. 开始转换
点击"转换为 PDF"按钮，等待转换完成。

### 4. 下载结果
- **单文件下载**: 点击每个文件右侧的"⬇️ 下载"按钮
- **预览**: 点击"👁️ 预览"按钮在浏览器中查看 PDF
- **批量下载**: 转换多个文件后，点击"下载全部 PDF (ZIP)"打包下载

## 支持的 Markdown 语法

生成的 PDF 支持以下 Markdown 特性：

- ✅ 标题 (H1-H6)
- ✅ 粗体、斜体、删除线
- ✅ 列表（有序、无序）
- ✅ 代码块（支持语法高亮）
- ✅ 引用块
- ✅ 表格
- ✅ 链接和图片（支持本地和远程图片）
- ✅ 数学公式（KaTeX 渲染）
- ✅ 任务列表
- ✅ 脚注

## 技术细节

### 后端处理流程
1. 接收用户上传的 .md 文件
2. 保存到临时目录 `temp/uploads/`
3. 读取 Markdown 内容并使用 `marked` 解析为 HTML
4. 从 `other/dist/assets/` 加载样式资源（hljs.css, katex.css, typora_manual_theme.css）
5. 注入代码高亮（highlight.js）和数学公式（KaTeX）支持
6. 使用 `playwright` 的 chromium 浏览器渲染 HTML 并生成 PDF
7. 生成的 PDF 保存到 `temp/pdf-outputs/`
8. 返回 PDF 文件的 URL 供下载
9. 自动清理 2 小时前的临时文件

### 核心依赖
- **marked**: Markdown 解析器
- **playwright**: 无头浏览器，用于 HTML 转 PDF
- **highlight.js**: 代码语法高亮
- **KaTeX**: 数学公式渲染
- **multer**: 文件上传处理
- **archiver**: ZIP 打包

### 文件大小限制
- 单个文件最大 **10 MB**
- 建议批量转换不超过 **20 个文件**

### 转换超时
- 单个文件转换超时时间：**2 分钟**
- 如果文件过大或内容复杂，可能会超时失败

### 临时文件清理
- 上传的 MD 文件：转换成功后立即删除
- 生成的 PDF 文件：保留 **2 小时** 后自动删除
- 清理频率：每 30 分钟执行一次

## API 接口

### POST `/api/tools/md2pdf`
上传单个 Markdown 文件并转换为 PDF。

**Request**:
- `Content-Type`: `multipart/form-data`
- `file`: Markdown 文件
- `options`: JSON 字符串，包含转换选项

**Response**:
```json
{
  "success": true,
  "file": {
    "name": "example.pdf",
    "path": "/path/to/file.pdf",
    "size": 123456,
    "url": "/temp/pdf-outputs/1719475200000-example.pdf"
  }
}
```

### POST `/api/tools/md2pdf/download-all`
打包下载多个 PDF 文件。

**Request Body**:
```json
{
  "files": [
    "/path/to/file1.pdf",
    "/path/to/file2.pdf"
  ]
}
```

**Response**: ZIP 文件流

## 部署注意事项

### 1. 确保 assets 资源可用
```bash
ls -la other/dist/assets/
# 应包含：hljs.css, hljs.js, katex.css, katex.js, typora_manual_theme.css
```

### 2. 确保 playwright 浏览器已安装
```bash
# 安装 playwright 依赖
npm install playwright --save-dev

# 安装浏览器（如果尚未安装）
npx playwright install chromium

# 或安装所有依赖（包括系统库）
npx playwright install --with-deps chromium
```

### 3. 创建临时目录
```bash
mkdir -p temp/uploads
mkdir -p temp/pdf-outputs
chmod 755 temp/uploads
chmod 755 temp/pdf-outputs
```

### 4. 配置 Nginx（生产环境）
如果使用 Nginx 反向代理，需要增加上传文件大小限制：

```nginx
http {
    client_max_body_size 20M;  # 允许最大 20MB 上传
}

server {
    location /temp/pdf-outputs/ {
        alias /var/www/programtools/temp/pdf-outputs/;
        expires 2h;
    }
}
```

## 故障排查

### 问题：上传文件后显示 "只支持 .md 和 .markdown 文件"
**原因**: 文件扩展名不正确  
**解决**: 确保文件以 .md 或 .markdown 结尾

### 问题：转换失败，提示 "启动转换工具失败"
**原因**: md2pdf_bundle.js 不存在或没有执行权限  
**解决**: 
```bash
ls -la other/dist/md2pdf_bundle.js
chmod +x other/dist/md2pdf_bundle.js
```
playwright 浏览器未安装或系统缺少依赖库  
**解决**: 
```bash
# 安装 playwright 浏览器
npxplaywright 浏览器启动慢
3. 服务器资源不足

**解决**:
1. 分割大文件为多个小文件
2. 优化 Markdown 内容（减少复杂样式）
3. 查看服务器资源：`top` 或 `htop`
4. 增加超时时间（修改 `server/routes/tools.js`）
5. 检查 playwright 是否正常工作：
   ```bash
   node -e "const {chromium} = require('playwright'); chromium.launch().then(b => b.close())"
   ```
2. 检查 Chromium 安装：`which chromium-browser`
3. 查看服务器资源：`top` 或 `htop`
4. 增加超时时间（修改 `server/routes/tools.js`）

### 问题：PDF 中图片无法显示
**原因**: Markdown 中使用了相对路径的本地图片  
**解决**: 
1. 使用绝对 URL 的远程图片
2. 或将图片转换为 Base64 嵌入 Markdown

### 问题：数学公式显示异常
**原因**: KaTeX 资源加载失败  
**解决**: 检查 `other/dist/assets/katex.js` 和 `katex.css` 是否存在

### 问题：中文显示为方块
**原因**: 缺少中文字体  
**解决**: 
```bash
# Ubuntu/Debian
sudo apt-get install fonts-noto-cjk
```

## 安全建议

1. **文件大小限制**: 已设置为 10MB，防止恶意上传大文件
2. **文件类型检查**: 只允许 .md 和 .markdown 文件
3. **自动清理**: 临时文件 2 小时后自动删除
4. **无需认证**: 此工具对所有用户开放，注意监控服务器资源使用

## 性能优化建议

1. **并发限制**: 建议使用 rate-limit 中间件限制请求频率
2. **队列处理**: 大量转换任务时使用消息队列（如 Bull）
3. **CDN 加速**: 将生成的 PDF 上传到 CDN
4. **预渲染**: 缓存常用模板的 PDF

## 未来改进

- [ ] 支持自定义 CSS 样式
- [ ] 支持 Markdown 预览
- [ ] 支持更多导出格式（Word、HTML）
- [ ] 支持在线编辑 Markdown
- [ ] 支持模板选择（论文、简历等）
- [ ] 支持协作编辑
- [ ] 支持版本管理

## 相关文件

- 前端页面: `src/pages/Md2Pdf.vue`
- 后端路由: `server/routes/tools.js`
- PDF 转换工具: `other/dist/md2pdf_bundle.js`
- 样式资源: `other/dist/assets/`
- Chrome 浏览器: `other/dist/chrome/` (可选)
