import express from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import rateLimit from 'express-rate-limit'
import User from '../models/User.js'
import { JWT_SECRET } from '../config.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'

const router = express.Router()

function normalizeLoginIdentifier(value) {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase()
}

// 登录限速：同一 IP + 用户名 15 分钟内最多 10 次失败尝试
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const username = normalizeLoginIdentifier(req.body?.username) || '__anonymous__'
    return `${req.ip}:${username}`
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '登录尝试过于频繁，请 15 分钟后重试' }
})

// 注册限速：同一 IP 1 小时内最多 5 次
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '注册请求过于频繁，请稍后重试' }
})

router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body
  try {
    const user = await User.findOne({
      $or: [{ uname: username }, { mail: username }]
    })
    
    if (!user) return res.status(400).json({ error: 'User not found' })

    let validPassword = false

    if (user.hashType === 'hydro') {
      const computedHash = await new Promise((resolve, reject) => {
        crypto.pbkdf2(password, user.salt, 100000, 64, 'sha256', (err, key) => {
          if (err) reject(err)
          else resolve(key.toString('hex').substring(0, 64))
        })
      })

      if (computedHash === user.hash) {
        validPassword = true
      }
    } else if (user.password) {
      validPassword = await bcrypt.compare(password, user.password)
    }

    if (!validPassword) return res.status(400).json({ error: 'Invalid password' })

    // Determine role from DB
    let role = user.role || 'user'
    
    // Legacy/Safety check: Admin is always admin
    if (user.priv === -1 || user.uname === 'admin') role = 'admin'

    const token = jwt.sign({ 
      id: user._id, 
      username: user.uname, 
      role: role, 
      priv: user.priv 
    }, JWT_SECRET, { expiresIn: '24h' })

    res.json({ token, user: { uid: user._id, username: user.uname, role: role, priv: user.priv } })
  } catch (e) {
    console.error('Login error:', e)
    res.status(500).json({ error: '登录失败，请稍后重试' })
  }
})

router.post('/register', registerLimiter, async (req, res) => {
  const { username, password } = req.body
  // 严禁客户端传入 role，固定注册为普通用户
  try {
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const newUser = new User({
      username,
      password: hashedPassword,
      role: 'user'
    })
    await newUser.save()
    res.json({ message: 'User registered successfully' })
  } catch (e) {
    console.error('Register error:', e)
    res.status(500).json({ error: '注册失败，请检查用户名是否已存在' })
  }
})

router.get('/me', authenticateToken, (req, res) => {
  res.json(req.user)
})

router.get('/admin/data', authenticateToken, requireRole('admin'), (req, res) => {
  res.json({ message: 'This is protected admin data' })
})

export default router
