/**
 * deploy.mjs - 一键部署到 acjudge.com
 * 用法: node deploy.mjs  或  npm run deploy
 */
import { execSync } from 'child_process'

const REMOTE_USER = 'root'
const REMOTE_HOST = 'acjudge.com'
const REMOTE_DIR = '/var/www/programtools'

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
  run(`ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_HOST} "${cmd}"`, label)
}

const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/[/:]/g, '-').replace(',', '')

// 1. 本地 git push
run('git add -A', '暂存所有变更')
run('git diff --cached --quiet || git commit -m "deploy ' + now + '"', '提交变更')
run('git push', 'Push 到 GitHub')

// 2. 远程 pull + 安装依赖 + 重启
ssh(`cd ${REMOTE_DIR} && git pull`, '远程 git pull')
ssh(`cd ${REMOTE_DIR} && npm install --omit=dev --silent`, '安装依赖')
ssh(`cd ${REMOTE_DIR} && pm2 restart all --update-env`, 'PM2 重启服务')
ssh(`pm2 list`, '查看服务状态')

console.log('\n✅ 部署完成！')
