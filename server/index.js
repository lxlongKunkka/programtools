import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import { PORT, MONGODB_URI, YUN_API_KEY, DEBUG_LOG } from './config.js'
import { requestLogger, debugLog } from './utils/logger.js'
import { createServer } from 'http'
import { setupSocket } from './socket/index.js'

import authRoutes from './routes/auth.js'
import chatRoutes from './routes/chat.js'
import aiRoutes from './routes/ai.js'
import dataRoutes from './routes/data.js'
import adminRoutes from './routes/admin.js'
import typingRoutes from './routes/typing.js'
import courseRoutes from './routes/course.js'
import dailyRoutes from './routes/daily.js'

if (YUN_API_KEY) debugLog('YUN_API_KEY loaded: [REDACTED]')
else debugLog('YUN_API_KEY not found in server/.env')

import { protectStatic } from './middleware/auth.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// --- MongoDB Connection ---
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
const app = express()
const httpServer = createServer(app)
setupSocket(httpServer)

app.use(cors())
app.use(express.json({ limit: '50mb' }))

// Serve static files
// Protect /public/courseware
app.use('/public/courseware', protectStatic, express.static(path.join(__dirname, 'public/courseware')))
// Serve other static files normally
app.use('/public', express.static(path.join(__dirname, 'public')))

// [Fix] Also serve under /api/public to bypass Nginx/Frontend routing issues in production
// Since /api is usually proxied to backend, this ensures static files are served by Node
app.use('/api/public/courseware', protectStatic, express.static(path.join(__dirname, 'public/courseware')))
app.use('/api/public', express.static(path.join(__dirname, 'public')))

// --- Usage logging ---
app.use(requestLogger)

// --- Routes ---
app.use('/api', authRoutes)
app.use('/api', chatRoutes)
app.use('/api', aiRoutes)
app.use('/api', dataRoutes)
app.use('/api/typing', typingRoutes)
app.use('/api/course', courseRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/daily', dailyRoutes)

// 全局错误处理中间件 - 确保所有错误都返回JSON
app.use((err, req, res, next) => {
  console.error('Global error handler:', err)
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message || 'Unknown error',
    detail: DEBUG_LOG ? err.stack : undefined
  })
})
app.use((req, res) => {
  res.status(404).json({ error: 'API endpoint not found', path: req.path })
})

httpServer.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`)
})
