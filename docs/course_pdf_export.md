# 课程内容批量导出 PDF 功能

## 功能概述

这个功能允许教师/管理员批量将课程内容（topics 和 chapters）导出为标准格式的 PDF 文件，方便打印、分发或存档。

## 访问路径

- **URL**: `/course/export-pdf`
- **权限**: 仅限 `admin` 和 `teacher` 角色访问
- **入口**: 管理页面 (`/admin`) → "📄 课程导出 PDF" 按钮

## 使用步骤

### 1. 选择课程体系
点击课程组按钮，例如：
- "岐麦教育 C++ 信奥全体系课程（v8.1）"
- "GESP C++ 认证课程"
- "GESP_Python"

### 2. 选择级别
勾选想要导出的级别：
- 可以单选或多选
- 点击"全选"按钮快速选择所有级别
- 每个级别会显示包含的 topics 数量

### 3. 配置导出选项

#### 内容选项
- **包含空章节**: 勾选后会导出没有内容的章节（默认跳过空章节）
- **包含课程描述**: 在 PDF 开头包含课程级别的描述信息

#### 文件拆分选项（三选一）
- **默认（不勾选）**: 每个级别一个 PDF 文件
- **每个 Topic 单独一个 PDF**: 适合按主题分发
- **每个 Chapter 单独一个 PDF**: 适合精细化管理，生成大量小文件

#### 页眉样式
- **标题**: 显示章节标题
- **级别 + Topic**: 显示 "Level X - Topic Y"
- **无**: 不显示页眉

### 4. 开始导出
点击"导出 X 个级别"按钮开始转换：
- 进度条实时显示完成情况
- 完成后显示文件列表
- 每个文件可以单独下载
- 点击"下载全部"按钮打包下载所有文件（ZIP 格式）

## 技术细节

### 后端处理流程
1. 从 MongoDB 查询选中的 CourseLevel 文档
2. 将 topics/chapters 转换为 Markdown 格式
3. 调用 `other/dist/md2pdf_bundle.js` (基于 Puppeteer) 转换为 PDF
4. 将生成的 PDF 文件存储在 `temp/pdf-exports/` 目录
5. 24小时后自动清理临时文件

### 文件命名规则
- **级别文件**: `Level{N}_{标题}.pdf`
- **Topic 文件**: `Level{N}_{标题}_Topic{M}.pdf`
- **Chapter 文件**: `Level{N}_{标题}_T{M}_C{N}_{章节标题}.pdf`

### 依赖项
- **md2pdf 工具**: `other/dist/md2pdf_bundle.js`
- **Chromium**: md2pdf 依赖 puppeteer-core，需要本地或通过环境变量提供 Chromium
- **archiver**: 用于 ZIP 打包（已添加到 package.json）

### API 接口

#### GET `/api/course/groups`
获取所有课程组列表。

**Response**:
```json
{
  "groups": ["岐麦教育 C++ 信奥全体系课程（v8.1）", "GESP C++ 认证课程"]
}
```

#### GET `/api/course/levels?group={groupName}`
获取指定组的级别列表。

**Response**:
```json
{
  "levels": [
    {
      "_id": "...",
      "level": 1,
      "title": "GESP 1 级：...",
      "topics": [...]
    }
  ]
}
```

#### POST `/api/course/export-pdf`
批量导出 PDF。

**Request Body**:
```json
{
  "levelIds": ["id1", "id2"],
  "options": {
    "includeEmptyChapters": false,
    "includeDescription": true,
    "oneFilePerTopic": false,
    "oneFilePerChapter": false,
    "headerStyle": "level-topic"
  }
}
```

**Response**:
```json
{
  "success": true,
  "exportId": "export-1719475200000",
  "files": [
    {
      "name": "Level1_GESP 1级.pdf",
      "path": "/var/www/programtools/temp/pdf-exports/export-xxx/...",
      "size": 524288,
      "url": "/temp/pdf-exports/export-xxx/Level1_GESP 1级.pdf"
    }
  ],
  "errors": []
}
```

#### POST `/api/course/export-pdf/download-all`
打包下载所有文件。

**Request Body**:
```json
{
  "files": ["/path/to/file1.pdf", "/path/to/file2.pdf"]
}
```

**Response**: ZIP 文件流

## 部署注意事项

### 1. 确保 md2pdf 工具可用
```bash
ls -la other/dist/md2pdf_bundle.js
```

### 2. 安装 Chromium（如果未安装）
```bash
# Ubuntu/Debian
sudo apt-get install chromium-browser

# 或使用 puppeteer 自带的 chromium
npm install puppeteer  # (不是 puppeteer-core)
```

### 3. 配置环境变量（可选）
如果 Chromium 不在默认路径，设置：
```bash
export PUPPETEER_EXECUTABLE_PATH=/path/to/chromium
```

### 4. 安装 Node.js 依赖
```bash
npm install archiver
```

### 5. 创建临时目录
```bash
mkdir -p temp/pdf-exports
```

### 6. 权限检查
确保 Node.js 进程有权限：
- 读取 `other/dist/` 目录
- 写入 `temp/pdf-exports/` 目录
- 执行 `node` 命令

## 故障排查

### 问题：导出失败，提示 "md2pdf 工具不存在"
**解决**: 检查 `other/dist/md2pdf_bundle.js` 文件是否存在

### 问题：PDF 转换超时
**解决**: 
1. 检查 Chromium 是否正常安装
2. 增加超时时间（修改 `server/routes/course-export.js` 中的 `setTimeout`）
3. 减少单次导出的文件数量

### 问题：生成的 PDF 样式不正确
**解决**: 检查 `other/dist/assets/` 目录下的 CSS 文件是否完整

### 问题：打包下载失败
**解决**: 检查是否安装了 `archiver` 依赖

## 未来改进

1. **流式导出**: 支持大批量导出时的进度实时更新
2. **自定义模板**: 允许上传自定义 PDF 模板
3. **水印功能**: 支持为 PDF 添加水印
4. **目录生成**: 自动生成 PDF 目录/书签
5. **并行处理**: 使用 worker 线程加速批量转换

## 相关文件

- 前端页面: `src/pages/CoursePdfExport.vue`
- 后端路由: `server/routes/course-export.js`
- 路由注册: `server/index.js`
- PDF 转换工具: `other/dist/md2pdf_bundle.js`
- 样式资源: `other/dist/assets/`
