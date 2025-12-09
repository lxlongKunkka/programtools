import fs from 'fs'
import path from 'path'
import { DIRS } from '../config.js'

// 确保文件存在
const PREMIUM_FILE = path.join(path.dirname(DIRS.models), 'premium_users.json')

async function ensureFile() {
  try {
    await fs.promises.access(PREMIUM_FILE)
  } catch {
    await fs.promises.writeFile(PREMIUM_FILE, '[]', 'utf8')
  }
}

export async function getPremiumList() {
  await ensureFile()
  try {
    const data = await fs.promises.readFile(PREMIUM_FILE, 'utf8')
    return JSON.parse(data) || []
  } catch (e) {
    return []
  }
}

export async function isPremium(userId) {
  const list = await getPremiumList()
  return list.includes(Number(userId))
}

export async function addPremium(userId) {
  const list = await getPremiumList()
  const id = Number(userId)
  if (!list.includes(id)) {
    list.push(id)
    await fs.promises.writeFile(PREMIUM_FILE, JSON.stringify(list, null, 2), 'utf8')
  }
}

export async function removePremium(userId) {
  const list = await getPremiumList()
  const id = Number(userId)
  const newList = list.filter(uid => uid !== id)
  if (newList.length !== list.length) {
    await fs.promises.writeFile(PREMIUM_FILE, JSON.stringify(newList, null, 2), 'utf8')
  }
}
