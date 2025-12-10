import fs from 'fs'
import path from 'path'
import { DIRS } from '../config.js'

// 确保文件存在
const TEACHER_FILE = path.join(path.dirname(DIRS.models), 'teachers.json')

async function ensureFile() {
  try {
    await fs.promises.access(TEACHER_FILE)
  } catch {
    await fs.promises.writeFile(TEACHER_FILE, '[]', 'utf8')
  }
}

export async function getTeacherList() {
  await ensureFile()
  try {
    const data = await fs.promises.readFile(TEACHER_FILE, 'utf8')
    return JSON.parse(data) || []
  } catch (e) {
    return []
  }
}

export async function isTeacher(userId) {
  const list = await getTeacherList()
  return list.includes(Number(userId))
}

export async function addTeacher(userId) {
  const list = await getTeacherList()
  const id = Number(userId)
  if (!list.includes(id)) {
    list.push(id)
    await fs.promises.writeFile(TEACHER_FILE, JSON.stringify(list, null, 2), 'utf8')
  }
}

export async function removeTeacher(userId) {
  const list = await getTeacherList()
  const id = Number(userId)
  const newList = list.filter(uid => uid !== id)
  if (newList.length !== list.length) {
    await fs.promises.writeFile(TEACHER_FILE, JSON.stringify(newList, null, 2), 'utf8')
  }
}
