/**
 * deploy.mjs - 一键部署到 acjudge.com
 * 用法:
 *   node deploy.mjs
 *   npm run deploy
 *   $env:ROTATE_JWT_SECRET='1'; node deploy.mjs
 */
import crypto from 'crypto'
import { execSync } from 'child_process'
import fs from 'fs'

const REMOTE_USER = 'root'
const REMOTE_HOST = 'acjudge.com'
const REMOTE_DIR = '/var/www/programtools'
const LOCAL_ENV_PATH = './server/.env'
const SHOULD_ROTATE_JWT = /^(1|true|yes)$/i.test(process.env.ROTATE_JWT_SECRET || '')

function upsertEnvValue(content, key, value) {
  const line = `${key}=${value}`
  if (new RegExp(`^${key}=.*$`, 'm').test(content)) {
    return content.replace(new RegExp(`^${key}=.*$`, 'm'), line)
  }
  return `${content.replace(/\s*$/, '')}\n${line}\n`
}

function rotateLocalJwtSecret() {
  if (!fs.existsSync(LOCAL_ENV_PATH)) {
    console.error(`❌ 失败: 找不到 ${LOCAL_ENV_PATH}，无法轮换 JWT_SECRET`)
    process.exit(1)
  }

  const jwtSecret = crypto.randomBytes(48).toString('hex')
  const current = fs.readFileSync(LOCAL_ENV_PATH, 'utf8')
  fs.writeFileSync(LOCAL_ENV_PATH, upsertEnvValue(current, 'JWT_SECRET', jwtSecret), 'utf8')
  console.log('\n▶ 已轮换本地 JWT_SECRET，稍后会同步到远端并通过 PM2 重启生效')
  return jwtSecret
}

function run(cmd, label) {
  console.log(`\n▶ ${label}`)
  try {
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
    if (out.trim()) console.log(out.trim())
  } catch (e) {
    const msg = e.stderr?.trim() || e.stdout?.trim() || e.message
    // git diff --cached --quiet 返回 1 表示有变更，不是真正的错误
    if (label === '检查本地变更' && e.status === 1) return
    console.error('❌ 失败:', msg)
    process.exit(1)
  }
}

function ssh(cmd, label) {
  // bash -lc 确保加载 nix profile，使 npm/pm2 路径可用
  run(`ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_HOST} "bash -lc '${cmd}'"`, label)
}

const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/[/:]/g, '-').replace(',', '')
const rotatedJwtSecret = SHOULD_ROTATE_JWT ? rotateLocalJwtSecret() : null

// 1. 本地 git push（仅源码，不含 dist）
run('git add -A', '暂存所有变更')
run('git diff --cached --quiet || git commit -m "deploy ' + now + '"', '提交变更')
run('git push', 'Push 到 GitHub')

// 2. 远程 pull + 安装依赖 + 构建前端 + 重启
// 用 fetch + reset 代替 pull，避免远程 package-lock.json 等本地改动引起冲突
ssh(`cd ${REMOTE_DIR} && git fetch origin && git reset --hard origin/main`, '远程 git pull')
if (rotatedJwtSecret) {
  ssh(`perl -0pi -e "s/^JWT_SECRET=.*$/JWT_SECRET=${rotatedJwtSecret}/m" ${REMOTE_DIR}/server/.env`, '同步远端 JWT_SECRET')
}
ssh(`cd ${REMOTE_DIR} && npm install --silent`, '安装依赖（含 devDependencies）')
ssh(`cd ${REMOTE_DIR} && npm run build`, '服务器端构建前端 (vite build)')
ssh(`cd ${REMOTE_DIR} && pm2 restart tools --update-env`, 'PM2 重启服务')
ssh(`pm2 list`, '查看服务状态')

if (rotatedJwtSecret) {
  console.log('\nℹ️ JWT_SECRET 已轮换，旧 token 现已失效，用户需要重新登录。')
}

console.log('\n✅ 部署完成！')
