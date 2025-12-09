import fs from 'fs'
import path from 'path'
import { DIRS } from '../config.js'
import { debugLog } from './logger.js'

async function ensureSessionsDir() {
  try {
    await fs.promises.mkdir(DIRS.sessions, { recursive: true })
  } catch (e) {
    // ignore
  }
}

export async function saveSession(sessionId, messages) {
  if (!sessionId) return
  try {
    await ensureSessionsDir()
    const file = path.join(DIRS.sessions, `${sessionId}.json`)
    await fs.promises.writeFile(file, JSON.stringify(messages || [], null, 2), 'utf8')
  } catch (e) {
    debugLog('saveSession error', e)
  }
}

export async function loadSession(sessionId) {
  try {
    const file = path.join(DIRS.sessions, `${sessionId}.json`)
    const txt = await fs.promises.readFile(file, 'utf8')
    return JSON.parse(txt)
  } catch (e) {
    return []
  }
}

export async function clearSession(sessionId) {
  try {
    const file = path.join(DIRS.sessions, `${sessionId}.json`)
    await fs.promises.unlink(file)
  } catch (e) {
    // ignore
  }
}
