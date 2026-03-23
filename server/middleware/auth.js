import fs from 'fs'
import jwt from 'jsonwebtoken'
import { DIRS, JWT_SECRET } from '../config.js'
import User from '../models/User.js'

let MODELS_CONFIG = []
try {
  if (fs.existsSync(DIRS.models)) {
    MODELS_CONFIG = JSON.parse(fs.readFileSync(DIRS.models, 'utf8'))
  }
} catch (e) {
  console.error('Failed to load models.json', e)
}

function normalizeAccountExpireAt(value) {
  if (!value) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === 'number') {
    const millis = value < 1e12 ? value * 1000 : value
    const date = new Date(millis)
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const numeric = Number(trimmed)
    if (Number.isFinite(numeric)) {
      const millis = numeric < 1e12 ? numeric * 1000 : numeric
      const date = new Date(millis)
      return Number.isNaN(date.getTime()) ? null : date
    }
    const date = new Date(trimmed)
    return Number.isNaN(date.getTime()) ? null : date
  }

  return null
}

export function isUserAccountExpired(user) {
  const accountExpireAt = normalizeAccountExpireAt(user?.accountExpireAt)
  if (!accountExpireAt) return false
  return accountExpireAt.getTime() <= Date.now()
}

async function resolveAuthenticatedUser(decodedUser) {
  if (!decodedUser?.id) return { ok: false, status: 401, error: 'Unauthorized' }

  const userDoc = await User.findById(decodedUser.id).select('_id uname role priv accountExpireAt').lean()
  if (!userDoc) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }

  if (isUserAccountExpired(userDoc)) {
    return { ok: false, status: 401, error: '账号已过期，请联系管理员' }
  }

  return {
    ok: true,
    user: {
      ...decodedUser,
      id: userDoc._id,
      username: userDoc.uname,
      role: userDoc.role || decodedUser.role || 'user',
      priv: typeof userDoc.priv === 'number' ? userDoc.priv : decodedUser.priv
    }
  }
}

export function checkModelPermission(req, res, next) {
  const modelId = req.body.model
  
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  
  let userRole = 'guest'
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      userRole = decoded.role || 'user'
    } catch (e) {
      // Invalid token, treat as guest
    }
  }

  // Rule: Guest and Normal User can ONLY use user-tier Gemini defaults.
  if (userRole === 'guest' || userRole === 'user') {
    if (modelId && modelId !== 'gemini-3-flash-preview' && modelId !== 'gemini-2.5-flash') {
      return res.status(403).json({ error: 'Access denied: Current plan only supports gemini-3-flash-preview and gemini-2.5-flash' })
    }
  }

  if (modelId) {
    const modelConfig = MODELS_CONFIG.find(m => m.id === modelId)
    if (modelConfig) {
      if (modelConfig.role === 'admin' && userRole !== 'admin') {
        return res.status(403).json({ error: 'Access denied: Admin role required for this model' })
      }

      const hasPremiumAccess = userRole === 'premium' || userRole === 'teacher' || userRole === 'admin'
      if (modelConfig.role === 'premium' && !hasPremiumAccess) {
        return res.status(403).json({ error: 'Access denied: Premium plan required for this model' })
      }
    }
  }
  
  next()
}

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  
  if (!token) {
    console.log('[Auth] No token provided')
    return res.sendStatus(401)
  }

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      console.log('[Auth] Token verification failed:', err.message)
      return res.sendStatus(401)
    }

    try {
      const resolved = await resolveAuthenticatedUser(user)
      if (!resolved.ok) {
        return res.status(resolved.status).json({ error: resolved.error })
      }
      req.user = resolved.user
      next()
    } catch (e) {
      console.error('[Auth] Failed to resolve user:', e)
      return res.sendStatus(401)
    }
  })
}

export const optionalAuthenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    req.user = null
    return next()
  }

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      return res.status(401).json({ error: '登录已过期，请重新登录' })
    }

    try {
      const resolved = await resolveAuthenticatedUser(user)
      if (!resolved.ok) {
        return res.status(resolved.status).json({ error: resolved.error })
      }
      req.user = resolved.user
      next()
    } catch (e) {
      console.error('[Auth] Failed to resolve optional user:', e)
      return res.status(401).json({ error: '登录已过期，请重新登录' })
    }
  })
}

export const protectStatic = (req, res, next) => {
  // Check Authorization header first
  let token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1]
  
  // If not found, check query parameter 'token'
  if (!token && req.query.token) {
    token = req.query.token
  }

  if (!token) return res.status(401).send('Unauthorized')

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) return res.status(403).send('Forbidden')

    try {
      const resolved = await resolveAuthenticatedUser(user)
      if (!resolved.ok) return res.status(401).send(resolved.error)
      req.user = resolved.user
      next()
    } catch (e) {
      console.error('[Auth] Failed to resolve static user:', e)
      return res.status(401).send('Unauthorized')
    }
  })
}

export const requireRole = (role) => {
  return (req, res, next) => {
    // priv === -1 是管理员，priv === 1 是普通用户，不应赋予管理员权限
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.priv === -1)
    
    if (isAdmin) return next()

    const allowedRoles = Array.isArray(role) ? role : [role]
    
    if (req.user && allowedRoles.includes(req.user.role)) {
      next()
    } else {
      res.status(403).json({ error: 'Access denied: insufficient permissions' })
    }
  }
}

export const requirePremium = (req, res, next) => {
  const user = req.user
  if (!user) return res.sendStatus(401)
  
  // Admin is always premium
  if (user.role === 'admin' || user.priv === -1) return next()
  
  // Teacher is also premium
  if (user.role === 'teacher') return next()
  
  // Premium role
  if (user.role === 'premium') return next()
  
  return res.status(403).json({ error: 'Access denied: Premium plan required' })
}
