const DB_NAME = 'programtools_solvedata'
const STORE_NAME = 'task_attachments'
const DB_VERSION = 1

function openDatabase() {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve(null)

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error || new Error('打开附件缓存失败'))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'taskId' })
      }
    }
  })
}

function withStore(mode, executor) {
  return openDatabase().then((db) => {
    if (!db) return null

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode)
      const store = tx.objectStore(STORE_NAME)
      let settled = false

      tx.oncomplete = () => {
        if (!settled) resolve(null)
      }
      tx.onerror = () => reject(tx.error || new Error('附件缓存事务失败'))
      tx.onabort = () => reject(tx.error || new Error('附件缓存事务已中断'))

      executor(store, (value) => {
        settled = true
        resolve(value)
      }, reject)
    }).finally(() => {
      db.close()
    })
  })
}

function normalizeTaskId(task) {
  if (!task?.id && task?.id !== 0) return ''
  return String(task.id)
}

export async function hydrateTaskAttachmentCache(tasks) {
  const taskList = Array.isArray(tasks) ? tasks : []
  if (!taskList.length) return taskList

  const db = await openDatabase().catch(() => null)
  if (!db) return taskList

  try {
    return await Promise.all(taskList.map((task) => new Promise((resolve) => {
      const taskId = normalizeTaskId(task)
      if (!taskId || task?.additionalFile?.base64 || !task?.additionalFile?.sourceUrl) {
        resolve(task)
        return
      }

      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(taskId)

      request.onerror = () => resolve(task)
      request.onsuccess = () => {
        const cached = request.result
        if (!cached?.base64) {
          resolve(task)
          return
        }
        if (cached.sourceUrl && task.additionalFile.sourceUrl && cached.sourceUrl !== task.additionalFile.sourceUrl) {
          resolve(task)
          return
        }
        resolve({
          ...task,
          additionalFile: {
            ...task.additionalFile,
            filename: cached.filename || task.additionalFile.filename,
            size: cached.size || task.additionalFile.size,
            base64: cached.base64,
          },
        })
      }
    })))
  } finally {
    db.close()
  }
}

export async function syncTaskAttachmentCache(tasks) {
  const taskList = Array.isArray(tasks) ? tasks.filter(Boolean) : []
  const idsInUse = new Set(taskList.map(normalizeTaskId).filter(Boolean))

  await withStore('readwrite', (store, resolve, reject) => {
    const keyRequest = store.getAllKeys()
    keyRequest.onerror = () => reject(keyRequest.error || new Error('读取附件缓存键失败'))
    keyRequest.onsuccess = () => {
      const existingKeys = Array.isArray(keyRequest.result) ? keyRequest.result.map(String) : []

      for (const key of existingKeys) {
        if (!idsInUse.has(key)) {
          store.delete(key)
        }
      }

      for (const task of taskList) {
        const taskId = normalizeTaskId(task)
        if (!taskId) continue
        const additionalFile = task.additionalFile
        if (additionalFile?.base64) {
          store.put({
            taskId,
            sourceUrl: String(additionalFile.sourceUrl || '').trim(),
            filename: String(additionalFile.filename || '').trim(),
            size: Number(additionalFile.size || 0),
            base64: additionalFile.base64,
            updatedAt: Date.now(),
          })
          continue
        }

        if (!additionalFile?.sourceUrl) {
          store.delete(taskId)
        }
      }

      resolve(true)
    }
  }).catch(() => null)
}