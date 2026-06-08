#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const workspaceRoot = path.resolve(__dirname, '..')
const sourceDir = path.join(workspaceRoot, 'public', 'grapheditor')
const targetDir = path.join(workspaceRoot, 'public', 'graph-domain')
const textExtensions = new Set(['.html', '.css', '.js', '.webmanifest', '.json', '.svg', '.txt'])

main()

function main() {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`源目录不存在，请先构建 grapheditor: ${sourceDir}`)
  }

  fs.rmSync(targetDir, { recursive: true, force: true })
  copyDir(sourceDir, targetDir)
  rewriteBasePaths(targetDir)

  console.log(JSON.stringify({
    sourceDir,
    targetDir,
    rewrittenBase: ['/grapheditor/ -> /']
  }, null, 2))
}

function copyDir(source, target) {
  fs.mkdirSync(target, { recursive: true })

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name)
    const targetPath = path.join(target, entry.name)

    if (entry.isDirectory()) {
      copyDir(sourcePath, targetPath)
      continue
    }

    fs.copyFileSync(sourcePath, targetPath)
  }
}

function rewriteBasePaths(rootDir) {
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const entryPath = path.join(rootDir, entry.name)

    if (entry.isDirectory()) {
      rewriteBasePaths(entryPath)
      continue
    }

    const ext = path.extname(entry.name).toLowerCase()
    if (!textExtensions.has(ext)) continue

    const raw = fs.readFileSync(entryPath, 'utf-8')
    const next = raw.replaceAll('/grapheditor/', '/')
    if (next !== raw) {
      fs.writeFileSync(entryPath, next, 'utf-8')
    }
  }
}