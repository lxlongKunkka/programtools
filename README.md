# programtools
tools for my job

这是一个 Vite + Vue3 项目，用于集成编程辅助工具（翻译、查错、题解、解题+造数据、对话）。

快速开始：

```powershell
cd d:\webapp\programtools
npm install
npm run dev
```

运行最小自动化测试：

```powershell
npm test
```

## 后端运行

```powershell
npm run server
```

## 部署

常规部署：

```powershell
npm run deploy
```

如需在部署时一并轮换 JWT_SECRET：

```powershell
npm run deploy:rotate-jwt
```

这会执行以下动作：

- 本地 `server/.env` 生成新的 `JWT_SECRET`
- 远端 `server/.env` 同步同一值
- `pm2 restart tools --update-env` 使新密钥生效
- 所有旧 JWT 立即失效，用户需要重新登录

## 依赖安全维护（2026-03-19）

本轮修复完成了后端生产依赖的集中清理，部署前本地执行 `npm audit --omit=dev` 已为 0 风险。

本次调整包含：

- 移除 `cos-nodejs-sdk-v5`，改为项目内的直传实现 [server/utils/cosClient.js](server/utils/cosClient.js)
- 升级 `express` 到 `^4.22.1`
- 升级 `socket.io` 和 `socket.io-client` 到 `^4.8.3`
- 使用 `package.json` 中的 `overrides` 固定安全版本：`body-parser 1.20.4`、`qs 6.14.2`、`socket.io-parser 4.2.6`

这样做的原因：

- `cos-nodejs-sdk-v5` 依赖链过深，且包含已知高风险传递依赖，继续保留会长期拖累审计结果
- `express` 生态里部分安全修复依赖上游子包版本，单纯升级顶层包不一定足够，因此保留 `overrides` 作为兜底

后续维护建议：

- 依赖升级后优先执行 `npm audit --omit=dev`
- 提交前优先执行 `npm test`
- 如升级 `express`、`socket.io` 或上传链路，至少回归以下能力：MNA 抓取、附件下载、COS 上传、AI 路由、实时推送
- 若未来需要扩展 COS 能力，优先在 [server/utils/cosClient.js](server/utils/cosClient.js) 内补能力，不要重新引入旧 SDK
- 发布前固定执行 `npm run build`

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

