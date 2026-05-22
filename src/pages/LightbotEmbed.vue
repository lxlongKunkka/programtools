<template>
  <div class="lightbot-embed-page">
    <!-- 加载遮罩 -->
    <div v-if="!loaded" class="lightbot-embed-loading">
      <div class="spinner"></div>
      <p>正在加载 Lightbot…</p>
    </div>

    <!-- iframe -->
    <iframe
      ref="iframeRef"
      class="lightbot-embed-frame"
      :class="{ ready: loaded }"
      :src="iframeSrc"
      title="Lightbot"
      allow="clipboard-read; clipboard-write"
      @load="handleLoad"
    ></iframe>

    <!-- 右上角角标栏：排行榜 | 我的关卡 | 用户名 | 登录 -->
    <div v-if="!inEditorMode" class="lightbot-corner-bar">
      <button class="lightbot-corner-btn" @click="openLeaderboard" title="查看本关排行榜">
        🏆 排行榜
      </button>
      <button v-if="username" class="lightbot-corner-btn" @click="togglePanel" :title="panelOpen ? '关闭我的关卡' : '我的关卡'">
        {{ panelOpen ? '✕ 关闭' : '📚 我的关卡' }}
      </button>
      <span v-if="username" class="lightbot-corner-user">👤 {{ username }}</span>
      <button v-if="!username" class="lightbot-corner-btn lightbot-corner-login" @click="goToLogin" title="登录以保存关卡进度">
        登录
      </button>
    </div>

    <!-- 我的关卡面板 -->
    <transition name="panel-slide">
      <div v-if="panelOpen" class="my-levels-panel">
        <div class="panel-header">
          <h3>我的关卡</h3>
          <span class="panel-tip">在编辑器中创建关卡后，点击💾保存</span>
        </div>

        <div v-if="loadingLevels" class="panel-loading">
          <div class="spinner small"></div>
          <span>加载中…</span>
        </div>

        <div v-else-if="levels.length === 0" class="panel-empty">
          <p>还没有保存的关卡</p>
          <p class="hint">点击游戏内的 <strong>+</strong> 按钮创建新关卡，编辑完成后点击 <strong>💾 保存</strong></p>
        </div>

        <div v-else class="level-list">
          <div
            v-for="level in levels"
            :key="level._id"
            class="level-card"
          >
            <div class="level-info">
              <div class="level-title">{{ level.title }}</div>
              <div class="level-meta">
                <span class="level-date">{{ formatDate(level.updatedAt) }}</span>
                <span class="level-badge" :class="level.isPublished ? 'published' : 'draft'">
                  {{ level.isPublished ? '已发布' : '草稿' }}
                </span>
              </div>
            </div>
            <div class="level-actions">
              <button class="action-btn edit" @click="editLevel(level)" title="继续编辑">✏️</button>
              <button
                class="action-btn publish"
                @click="togglePublish(level)"
                :title="level.isPublished ? '取消发布' : '发布'"
              >{{ level.isPublished ? '🔒' : '🌍' }}</button>
              <button class="action-btn share" @click="shareLevel(level)" title="分享">🔗</button>
              <button class="action-btn delete" @click="confirmDeleteLevel(level)" title="删除">🗑️</button>
            </div>
          </div>
        </div>

        <div v-if="shareNotice" class="share-notice">{{ shareNotice }}</div>
      </div>
    </transition>

    <!-- 删除确认弹窗 -->
    <div v-if="deleteTarget" class="delete-overlay" @click.self="deleteTarget = null">
      <div class="delete-dialog">
        <p>确认删除关卡 <strong>{{ deleteTarget.title }}</strong>？</p>
        <div class="delete-dialog-btns">
          <button @click="deleteTarget = null">取消</button>
          <button class="danger" @click="doDeleteLevel">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { request } from '../utils/request.js'

export default {
  name: 'LightbotEmbed',
  data() {
    return {
      loaded: false,
      iframeSrc: '/lightbot-app/index.html',
      panelOpen: false,
      loadingLevels: false,
      levels: [],
      deleteTarget: null,
      shareNotice: '',
      shareNoticeTimer: null,
      username: '',
      inEditorMode: false,
    }
  },
  mounted() {
    // 支持分享链接：/lightbot?level=<b64>
    const levelParam = this.$route?.query?.level
    if (levelParam) {
      this.iframeSrc = `/lightbot-app/index.html?level=${encodeURIComponent(levelParam)}`
    }
    // 读取登录用户名
    try {
      const info = JSON.parse(localStorage.getItem('user_info') || '{}')
      this.username = info?.username || info?.uname || ''
    } catch {}
    // 监听 iframe 内 React 的模式变化
    this._modeListener = (e) => {
      if (e.data?.type === 'app-mode') {
        this.inEditorMode = e.data.mode === 'editor'
      }
    }
    window.addEventListener('message', this._modeListener)
  },
  beforeUnmount() {
    window.removeEventListener('message', this._modeListener)
  },
  methods: {
    handleLoad() {
      this.loaded = true
    },

    openLeaderboard() {
      const iframe = this.$refs.iframeRef
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'open-leaderboard' }, window.location.origin)
      }
    },

    async togglePanel() {
      this.panelOpen = !this.panelOpen
      if (this.panelOpen && this.levels.length === 0) {
        await this.fetchLevels()
      }
    },

    async fetchLevels() {
      this.loadingLevels = true
      try {
        const data = await request('/api/lightbot/my-levels')
        this.levels = data.levels || []
      } catch (e) {
        console.error('获取关卡列表失败', e)
      } finally {
        this.loadingLevels = false
      }
    },

    async editLevel(level) {
      // 获取完整 content（列表接口不含 content）
      try {
        const data = await request(`/api/lightbot/my-levels/${level._id}`)
        if (data.level?.content) {
          const b64 = this.encodeContentForUrl(data.level.content)
          this.iframeSrc = `/lightbot-app/index.html?level=${b64}`
          this.loaded = false
          this.panelOpen = false
        }
      } catch (e) {
        console.error('加载关卡内容失败', e)
      }
    },

    async togglePublish(level) {
      try {
        const data = await request(`/api/lightbot/my-levels/${level._id}/publish`, {
          method: 'PATCH',
        })
        level.isPublished = data.isPublished
      } catch (e) {
        console.error('切换发布状态失败', e)
      }
    },

    goToLogin() {
      this.$router.push('/login?redirect=/lightbot')
    },

    confirmDeleteLevel(level) {
      this.deleteTarget = level
    },

    async doDeleteLevel() {
      if (!this.deleteTarget) return
      const id = this.deleteTarget._id
      try {
        await request(`/api/lightbot/my-levels/${id}`, { method: 'DELETE' })
        this.levels = this.levels.filter(l => l._id !== id)
      } catch (e) {
        console.error('删除失败', e)
      } finally {
        this.deleteTarget = null
      }
    },

    async shareLevel(level) {
      try {
        const data = await request(`/api/lightbot/my-levels/${level._id}`)
        if (!data.level?.content) return
        const b64 = this.encodeContentForUrl(data.level.content)
        const url = `${window.location.origin}/lightbot?level=${b64}`
        await navigator.clipboard.writeText(url)
        this.showShareNotice('链接已复制到剪贴板 ✅')
      } catch (e) {
        this.showShareNotice('复制失败，请手动复制')
        console.error(e)
      }
    },

    showShareNotice(msg) {
      this.shareNotice = msg
      clearTimeout(this.shareNoticeTimer)
      this.shareNoticeTimer = setTimeout(() => { this.shareNotice = '' }, 3000)
    },

    /**
     * 与 lightbot-app 内部编码一致：
     * JSON string → TextEncoder → byte-by-byte fromCharCode → btoa
     */
    encodeContentForUrl(jsonStr) {
      const bytes = new TextEncoder().encode(jsonStr)
      let binary = ''
      bytes.forEach(b => { binary += String.fromCharCode(b) })
      return btoa(binary)
    },

    formatDate(dateStr) {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      const now = new Date()
      const diffMs = now - d
      const diffDays = Math.floor(diffMs / 86400000)
      if (diffDays === 0) return '今天 ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      if (diffDays === 1) return '昨天'
      if (diffDays < 7) return `${diffDays}天前`
      return d.toLocaleDateString('zh-CN')
    },
  },
}
</script>

<style scoped>
.lightbot-embed-page {
  position: fixed;
  inset: 0;
  background: #0c1222;
}

.lightbot-embed-frame {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
  opacity: 0;
  transition: opacity 0.25s ease;
  background: #0c1222;
}

.lightbot-embed-frame.ready {
  opacity: 1;
}

.lightbot-embed-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #e8eefc;
  z-index: 10;
  pointer-events: none;
}

.lightbot-embed-loading p {
  margin: 0;
  font-size: 15px;
  letter-spacing: 0.02em;
}

/* ── 右上角角标栏 ── */
.lightbot-corner-bar {
  position: fixed;
  top: 12px;
  right: 16px;
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 8px;
}

.lightbot-corner-btn,
.lightbot-corner-user {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 13px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.80);
  color: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  line-height: 1;
}

.lightbot-corner-btn {
  cursor: pointer;
  transition: background 0.15s, box-shadow 0.15s;
}
.lightbot-corner-btn:hover {
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
}
.lightbot-corner-login {
  background: rgba(79, 140, 255, 0.92);
  color: #fff;
  font-weight: 600;
}
.lightbot-corner-login:hover {
  background: rgba(60, 120, 240, 1);
  color: #fff;
}

/* ── 面板 ── */
.my-levels-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 300px;
  z-index: 150;
  background: rgba(10, 18, 38, 0.97);
  border-left: 1px solid rgba(80, 120, 200, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.5);
}

.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: transform 0.25s ease;
}
.panel-slide-enter-from,
.panel-slide-leave-to {
  transform: translateX(100%);
}

.panel-header {
  padding: 48px 16px 12px;
  border-bottom: 1px solid rgba(80, 120, 200, 0.2);
}

.panel-header h3 {
  margin: 0 0 4px;
  font-size: 16px;
  color: #c8d8f8;
  font-weight: 600;
}

.panel-tip {
  font-size: 11px;
  color: #6070a0;
}

.panel-loading,
.panel-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #6070a0;
  font-size: 13px;
  padding: 24px;
  text-align: center;
}

.panel-empty p {
  margin: 0;
}

.panel-empty .hint {
  font-size: 12px;
  line-height: 1.6;
  color: #4a5880;
}

/* ── 关卡列表 ── */
.level-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.level-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(80, 120, 200, 0.18);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.level-info {
  flex: 1;
  min-width: 0;
}

.level-title {
  font-size: 13px;
  color: #c8d8f8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.level-meta {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 4px;
}

.level-date {
  font-size: 11px;
  color: #4a5880;
}

.level-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 99px;
}

.level-badge.published {
  background: rgba(60, 180, 100, 0.2);
  color: #5de08a;
  border: 1px solid rgba(60, 180, 100, 0.3);
}

.level-badge.draft {
  background: rgba(100, 120, 180, 0.15);
  color: #8090c0;
  border: 1px solid rgba(100, 120, 180, 0.25);
}

.level-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 15px;
  padding: 4px;
  border-radius: 4px;
  line-height: 1;
  opacity: 0.7;
  transition: opacity 0.15s, background 0.15s;
}

.action-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.08);
}

/* ── 分享通知 ── */
.share-notice {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(40, 65, 120, 0.95);
  color: #c8d8f8;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  white-space: nowrap;
  pointer-events: none;
  border: 1px solid rgba(100, 150, 230, 0.3);
}

/* ── 删除弹窗 ── */
.delete-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-dialog {
  background: #111a30;
  border: 1px solid rgba(80, 120, 200, 0.3);
  border-radius: 12px;
  padding: 24px;
  min-width: 260px;
  text-align: center;
}

.delete-dialog p {
  color: #c8d8f8;
  font-size: 14px;
  margin: 0 0 20px;
}

.delete-dialog-btns {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.delete-dialog-btns button {
  padding: 8px 20px;
  border-radius: 8px;
  border: 1px solid rgba(80, 120, 200, 0.3);
  background: rgba(255, 255, 255, 0.06);
  color: #c8d8f8;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.15s;
}

.delete-dialog-btns button:hover {
  background: rgba(255, 255, 255, 0.12);
}

.delete-dialog-btns button.danger {
  background: rgba(200, 50, 50, 0.25);
  border-color: rgba(200, 80, 80, 0.4);
  color: #ff8080;
}

.delete-dialog-btns button.danger:hover {
  background: rgba(200, 50, 50, 0.4);
}

/* ── Spinner ── */
.spinner {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 3px solid rgba(255, 255, 255, 0.18);
  border-top-color: #8fd3ff;
  animation: spin 0.9s linear infinite;
}

.spinner.small {
  width: 24px;
  height: 24px;
  border-width: 2px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── 移动端：面板全宽 ── */
@media (max-width: 480px) {
  .my-levels-panel {
    width: 100%;
    border-left: none;
    border-top: 1px solid rgba(80, 120, 200, 0.25);
    top: auto;
    height: 60%;
  }
}
</style>


<style scoped>
.lightbot-embed-page {
  position: fixed;
  inset: 0;
  background: #0c1222;
}

.lightbot-embed-frame {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
  opacity: 0;
  transition: opacity 0.25s ease;
  background: #0c1222;
}

.lightbot-embed-frame.ready {
  opacity: 1;
}

.lightbot-embed-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #e8eefc;
  z-index: 1;
  pointer-events: none;
}

.lightbot-embed-loading p {
  margin: 0;
  font-size: 15px;
  letter-spacing: 0.02em;
}

.spinner {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 3px solid rgba(255, 255, 255, 0.18);
  border-top-color: #8fd3ff;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>