import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, '.env') })

export const PORT = process.env.PORT || 3000
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/programtools'
export const HYDRO_MONGODB_URI = process.env.HYDRO_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/hydro'
export const APP_MONGODB_URI = process.env.APP_MONGODB_URI || 'mongodb://localhost:27017/programtools'
export const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_this'

// 启动时强制校验 JWT_SECRET，防止使用默认值导致 token 可被伪造
if (process.env.JWT_SECRET === undefined || process.env.JWT_SECRET === 'your_jwt_secret_key_change_this') {
  if (process.env.NODE_ENV === 'production') {
    console.error('[FATAL] JWT_SECRET 未在 .env 中配置或使用了默认值，生产环境禁止使用默认密钥！')
    process.exit(1)
  } else {
    console.warn('[WARN] JWT_SECRET 使用默认值，请在 server/.env 中配置强密钥（仅开发环境允许）')
  }
}
export const YUN_API_KEY = process.env.YUN_API_KEY
export const YUN_API_URL = process.env.YUN_API_URL || 'https://yunwu.ai/v1/chat/completions'

// AtCoder 用户名（可选）：用于在 kenkoooo 中优先查找该用户的 AC 提交
export const ATCODER_USERNAME = process.env.ATCODER_USERNAME || ''

// CORS 允许的源，生产环境应在 .env 中配置；未配置则不限制来源
export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : null
export const DEBUG_LOG = (process.env.DEBUG_LOG === '1' || process.env.DEBUG === 'true')

export const MAIL_CONFIG = {
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT || 465),
  secure: String(process.env.MAIL_SECURE || 'true') === 'true',
  user: process.env.MAIL_USER,
  pass: process.env.MAIL_PASS,
  from: process.env.MAIL_FROM || process.env.MAIL_USER || 'noreply@example.com',
  to: process.env.MAIL_TO || '',
  cron: process.env.MAIL_CRON || '00 09 * * *'
}

export const DIRS = {
  root: __dirname,
  logs: path.join(__dirname, 'logs'),
  sessions: path.join(__dirname, 'sessions'),
  models: path.join(__dirname, 'models.json'),
  cyaronDocs: path.join(__dirname, '../cyaron-docs')
}

export const COS_CONFIG = {
  SecretId: process.env.COS_SECRET_ID,
  SecretKey: process.env.COS_SECRET_KEY,
  Bucket: process.env.COS_BUCKET,
  Region: process.env.COS_REGION,
  Domain: process.env.COS_DOMAIN // Optional: Custom domain or CDN domain
}

export const HYDRO_CONFIG = {
  API_URL: process.env.HYDRO_API_URL,
  API_TOKEN: process.env.HYDRO_API_TOKEN,
  COOKIE: process.env.HYDRO_COOKIE,
  USERNAME: process.env.HYDRO_USERNAME,
  PASSWORD: process.env.HYDRO_PASSWORD
}
