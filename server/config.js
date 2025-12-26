import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, '.env') })

export const PORT = process.env.PORT || 3000
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/programtools'
export const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_this'
export const YUN_API_KEY = process.env.YUN_API_KEY
export const YUN_API_URL = process.env.YUN_API_URL || 'https://yunwu.ai/v1/chat/completions'
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
  COOKIE: process.env.HYDRO_COOKIE
}
