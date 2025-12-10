import express from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import User from '../models/User.js'
import { JWT_SECRET } from '../config.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'
import { isPremium } from '../utils/premium.js'

const router = express.Router()

router.post('/login', async (req, res) => {
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

    let role = 'user'
    if (user.priv === -1 || user.uname === 'admin') role = 'admin'
    else if (user.role === 'teacher') role = 'teacher'
    else if (await isPremium(user._id)) role = 'premium'

    const token = jwt.sign({ 
      id: user._id, 
      username: user.uname, 
      role: role,
      priv: user.priv 
    }, JWT_SECRET, { expiresIn: '24h' })

    res.json({ token, user: { username: user.uname, role: role, priv: user.priv } })
  } catch (e) {
    console.error('Login error:', e)
    res.status(500).json({ error: e.message })
  }
})

router.post('/register', async (req, res) => {
  const { username, password, role } = req.body
  try {
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const newUser = new User({
      username,
      password: hashedPassword,
      role: role || 'user'
    })
    await newUser.save()
    res.json({ message: 'User registered successfully' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/me', authenticateToken, (req, res) => {
  res.json(req.user)
})

router.get('/admin/data', authenticateToken, requireRole('admin'), (req, res) => {
  res.json({ message: 'This is protected admin data' })
})

export default router
