import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync, unlinkSync, readdirSync, statSync, mkdirSync } from 'fs'
import { resolve, join } from 'path'
import type { Plugin } from 'vite'

/** Dev-only plugin: POST /api/save-level { levelId, content } → overwrites the JSON file */
function levelSavePlugin(): Plugin {
  return {
    name: 'level-save',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/save-level', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }

        let body = ''
        req.on('data', (chunk: Buffer) => { body += chunk.toString() })
        req.on('end', () => {
          res.setHeader('Content-Type', 'application/json')
          try {
            const { levelId, content } = JSON.parse(body) as { levelId: string; content: string }
            if (!levelId || !content) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Missing levelId or content' }))
              return
            }

            const levelsDir = resolve(process.cwd(), 'src/content/levels')
            let targetFile: string | null = null

            outer: for (const dir of readdirSync(levelsDir)) {
              const dirPath = join(levelsDir, dir)
              if (!statSync(dirPath).isDirectory()) continue
              for (const file of readdirSync(dirPath)) {
                if (!file.endsWith('.json')) continue
                const filePath = join(dirPath, file)
                try {
                  const raw = readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '')
                  const data = JSON.parse(raw) as { id?: string }
                  if (data.id === levelId) { targetFile = filePath; break outer }
                } catch { /* skip malformed */ }
              }
            }

            if (!targetFile) {
              // 新关卡 → 在 swf-custom/ 目录下自动创建文件（glob 会自动加载）
              const customDir = join(levelsDir, 'swf-custom')
              mkdirSync(customDir, { recursive: true })
              targetFile = join(customDir, `${levelId}.json`)
            }

            writeFileSync(targetFile, content, 'utf-8')
            res.end(JSON.stringify({ ok: true, path: targetFile.replace(process.cwd(), '') }))
          } catch (e) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: String(e) }))
          }
        })
      })
    },
  }
}

/** Dev-only plugin: DELETE /api/delete-level { levelId } → removes the JSON file */
function levelDeletePlugin(): Plugin {
  return {
    name: 'level-delete',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/delete-level', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        let body = ''
        req.on('data', (chunk: Buffer) => { body += chunk.toString() })
        req.on('end', () => {
          res.setHeader('Content-Type', 'application/json')
          try {
            const { levelId } = JSON.parse(body) as { levelId: string }
            if (!levelId) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Missing levelId' }))
              return
            }
            const levelsDir = resolve(process.cwd(), 'src/content/levels')
            let targetFile: string | null = null
            outer: for (const dir of readdirSync(levelsDir)) {
              const dirPath = join(levelsDir, dir)
              if (!statSync(dirPath).isDirectory()) continue
              for (const file of readdirSync(dirPath)) {
                if (!file.endsWith('.json')) continue
                const filePath = join(dirPath, file)
                try {
                  const raw = readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '')
                  const data = JSON.parse(raw) as { id?: string }
                  if (data.id === levelId) { targetFile = filePath; break outer }
                } catch { /* skip malformed */ }
              }
            }
            if (!targetFile) {
              res.statusCode = 404
              res.end(JSON.stringify({ error: `Level ${levelId} not found` }))
              return
            }
            const relPath = targetFile.replace(process.cwd(), '')
            unlinkSync(targetFile)
            res.end(JSON.stringify({ ok: true, path: relPath }))
          } catch (e) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: String(e) }))
          }
        })
      })
    },
  }
}

/** Dev-only plugin: POST /api/submit-level { title, author, url } → console log (no real email in dev) */
function submitLevelPlugin(): Plugin {
  return {
    name: 'submit-level',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/submit-level', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        let body = ''
        req.on('data', (chunk: Buffer) => { body += chunk.toString() })
        req.on('end', () => {
          res.setHeader('Content-Type', 'application/json')
          try {
            const { title, author, url } = JSON.parse(body) as { title: string; author: string; url: string }
            console.log(`[submit-level] 投稿（dev 模式，未发邮件）: ${title} / ${author} / ${url}`)
            res.end(JSON.stringify({ ok: true }))
          } catch {
            res.statusCode = 400
            res.end(JSON.stringify({ error: '请求格式错误' }))
          }
        })
      })
    },
  }
}

/** Dev-only plugin: /api/track (no-op log) and /api/stats (empty mock) */
function trackPlugin(): Plugin {
  return {
    name: 'track',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/track', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
        let body = ''
        req.on('data', (chunk: Buffer) => { body += chunk.toString() })
        req.on('end', () => {
          try { console.log('[track] dev:', JSON.parse(body)) } catch { /* ignore */ }
          res.end(JSON.stringify({ ok: true }))
        })
      })
      server.middlewares.use('/api/stats', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ dev: true, message: '开发模式，无真实统计数据' }))
      })
    },
  }
}

/** Dev-only plugin: GET /api/lightbot/levels → 读取本地 JSON 文件返回 */
function levelsPlugin(): Plugin {
  return {
    name: 'levels-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/codebot/levels', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        const levelsDir = resolve(process.cwd(), 'src/content/levels')
        const levels: unknown[] = []
        function scanDir(dir: string) {
          for (const name of readdirSync(dir)) {
            const full = join(dir, name)
            if (statSync(full).isDirectory()) { scanDir(full); continue }
            if (!name.endsWith('.json')) continue
            try {
              const raw = readFileSync(full, 'utf-8').replace(/^\uFEFF/, '')
              levels.push(JSON.parse(raw))
            } catch { /* skip malformed */ }
          }
        }
        try {
          scanDir(levelsDir)
          levels.sort((a: any, b: any) => String(a.id ?? '').localeCompare(String(b.id ?? '')))
          res.end(JSON.stringify({ ok: true, levels }))
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ ok: false, error: String(e) }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), levelSavePlugin(), levelDeletePlugin(), submitLevelPlugin(), trackPlugin(), levelsPlugin()],
  base: process.env.NODE_ENV === 'production' ? '/codebot-app/' : '/',
  build: {
    outDir: '../public/codebot-app',
    emptyOutDir: true,
    cssTarget: 'chrome87',
  },
})
