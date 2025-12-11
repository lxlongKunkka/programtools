# programtools
tools for my job

这是一个 Vite + Vue3 项目，用于集成编程辅助工具（翻译、查错、题解、解题+造数据、对话）。

快速开始：

```powershell
cd d:\software\test\programtools
npm install
npm run dev
```

## 后端运行

```powershell
npm run server
```

## 后端环境变量（server/.env）

需要在 `server/.env` 中配置以下变量：

- `YUN_API_KEY`: 云雾 API Key
- `YUN_API_URL`: 可选，默认 `https://yunwu.ai/v1/chat/completions`
- `MAIL_HOST`: SMTP 主机地址
- `MAIL_PORT`: SMTP 端口（默认 465）
- `MAIL_SECURE`: `'true' | 'false'`，是否使用 TLS（默认 `'true'`）
- `MAIL_USER`: SMTP 用户名
- `MAIL_PASS`: SMTP 密码
- `MAIL_FROM`: 发件人邮箱（默认使用 `MAIL_USER`）
- `MAIL_TO`: 管理员收件人邮箱（支持逗号分隔多个地址）
- `MAIL_CRON`: 邮件定时表达式（可选，默认 `00 09 * * *` 每日 09:00）

### 使用日志与邮件日报

后端会在 `server/logs/YYYY-MM-DD.log` 写入每天的使用日志（每行 JSON）。并在每日 09:00 自动汇总昨日日志，发送到 `MAIL_TO` 指定邮箱：

- 正文：总请求数、平均耗时、按路径与模型统计
- 附件：原始日志文件 `YYYY-MM-DD.log`

手动触发测试：

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/admin/send-daily-report -Method Post -Body (@{ date='2025-12-02' } | ConvertTo-Json) -ContentType 'application/json'
```

若 `MAIL_TO` 未配置，系统会跳过发送但仍进行日志汇总。

