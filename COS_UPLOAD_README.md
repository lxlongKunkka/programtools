# COS 图片上传功能说明

## 功能介绍

GESP 工具现在支持自动将 HTML 中的图片上传到腾讯云 COS（对象存储），并替换为 COS 的 URL。

## 配置步骤

### 1. 获取腾讯云 COS 密钥

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/cos)
2. 创建存储桶（Bucket）
3. 获取以下信息：
   - **SecretId**：API 密钥管理中获取
   - **SecretKey**：API 密钥管理中获取
   - **Bucket**：存储桶名称，格式：`bucket-name-appid`
   - **Region**：地域，如 `ap-guangzhou`

### 2. 配置环境变量

在 `server/.env` 文件中添加以下配置：

```bash
# 腾讯云 COS 配置
COS_SECRET_ID=你的SecretId
COS_SECRET_KEY=你的SecretKey
COS_BUCKET=your-bucket-name-appid
COS_REGION=ap-guangzhou
# 可选：自定义域名或 CDN 域名
COS_DOMAIN=https://cdn.yourdomain.com
```

### 3. 重启服务

配置完成后，重启后端服务：

```bash
npm run server
```

## 功能特性

### 支持的图片格式

- JPEG / JPG
- PNG
- GIF
- WebP
- SVG

### 支持的图片来源

1. **HTTP/HTTPS URL**：自动下载并上传
2. **Base64 编码**：直接解析并上传
3. **相对路径**：会尝试解析，如果失败则保留原链接

### 图片存储路径

图片会按照以下规则存储：

```
gesp-images/年月日/随机文件名.扩展名
```

例如：

```
gesp-images/20260114/abc123xyz789.png
gesp-images/20260114/def456uvw012.jpg
```

## 使用示例

### 转换 HTML（单张）

1. 在 GESP 工具中选择 "HTML 粘贴" 标签
2. 粘贴包含图片的 HTML 内容
3. 点击 "开始转换 HTML"
4. 等待图片上传完成
5. 获取 Markdown 输出，图片链接已替换为 COS URL

### 批量转换

1. 在 GESP 工具中选择 "批量 HTML" 标签
2. 上传多个 HTML 文件
3. 启用所需选项（优化题目/生成答案）
4. 点击 "开始批量处理"
5. 所有图片会自动上传到 COS

## 日志输出

上传过程中会在控制台输出日志：

```
开始上传 5 张图片到 COS...
✓ 图片 0 上传成功: https://your-bucket.cos.ap-guangzhou.myqcloud.com/gesp-images/20260114/abc123.png
✓ 图片 1 上传成功: https://your-bucket.cos.ap-guangzhou.myqcloud.com/gesp-images/20260114/def456.png
...
图片上传完成
```

## 错误处理

### COS 配置不完整

如果未配置 COS 相关环境变量，系统会输出警告：

```
COS 配置不完整，跳过图片上传
```

此时图片会保留原链接。

### 图片下载失败

如果图片无法下载（网络问题、URL 失效等），系统会输出错误日志：

```
下载图片失败: https://example.com/image.png Error: timeout
跳过图片 0: 下载失败
```

此时图片会保留原链接。

### 上传失败

如果 COS 上传失败，系统会输出错误日志：

```
✗ 图片 0 上传失败，保留原链接
```

此时图片会保留原链接，不影响题目转换。

## 注意事项

1. **网络环境**：确保服务器能访问外网（下载图片）和腾讯云 COS API
2. **COS 权限**：确保密钥有存储桶的写权限
3. **图片大小**：建议单张图片不超过 5MB
4. **并发限制**：当前采用串行上传，大数量图片可能需要较长时间

## 故障排查

### 问题：图片未上传

检查点：
- ✅ 确认 `.env` 文件中 COS 配置已填写
- ✅ 确认 COS 密钥有写权限
- ✅ 查看控制台日志，确认是否有错误信息

### 问题：图片链接失效

检查点：
- ✅ 确认存储桶访问权限为"公共读"
- ✅ 确认 COS_DOMAIN 配置正确（如使用自定义域名）
- ✅ 尝试在浏览器直接访问 COS URL

### 问题：上传速度慢

优化方案：
- ✅ 使用 CDN 加速（配置 COS_DOMAIN）
- ✅ 选择距离服务器最近的 Region
- ✅ 考虑使用异步批量上传（未来版本支持）
