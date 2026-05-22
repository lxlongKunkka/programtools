/**
 * 游戏行为打点工具
 * 生产环境: POST /api/track → 服务器写入 /data/bot-events.ndjson
 * 开发环境: Vite 插件处理（console.log，不写文件）
 */
export function trackEvent(event: string, data?: Record<string, unknown>) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  void fetch('/api/track', {
    method: 'POST',
    headers,
    body: JSON.stringify({ event, ...data }),
    keepalive: true,
  }).catch(() => {/* 静默失败，不影响游戏 */})
}
