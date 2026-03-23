<template>
  <div id="app">
    <header class="header">
      <div class="branding">
        <router-link to="/" class="branding-link">
          <img src="https://qimai-1312947209.cos.ap-shanghai.myqcloud.com/images/202403271535417.png" alt="Logo" class="app-logo" />
          <h1>Acjudge Tools</h1>
        </router-link>
      </div>
      <button
        v-if="!isCompactQuizMobileNav"
        class="nav-toggle"
        type="button"
        :aria-expanded="mobileNavOpen ? 'true' : 'false'"
        aria-controls="app-navigation"
        @click="toggleMobileNav"
      >
        {{ mobileNavOpen ? '收起' : '菜单' }}
      </button>
      <nav
        v-if="!isCompactQuizMobileNav"
        id="app-navigation"
        class="main-nav"
        :class="{ 'is-open': mobileNavOpen }"
        @click="handleNavClick"
      >
        <router-link to="/">Quiz</router-link>
        <router-link to="/translate">Translate</router-link>
        <router-link to="/typing">Typing</router-link>
        <router-link v-if="user" to="/course">Course</router-link>
        <router-link v-if="user" to="/progress">进度</router-link>
        <router-link v-if="user" to="/daily">Daily</router-link>
        <router-link v-if="user" to="/gesp">GESP</router-link>
        <router-link v-if="user" to="/gesp-map">图谱</router-link>
        <router-link v-if="user" to="/checker">Checker</router-link>
        <router-link v-if="user" to="/solution">Solution</router-link>
        <router-link v-if="isPremium" to="/solution-report">Report</router-link>
        <router-link v-if="isPremium" to="/solvedata">Data</router-link>
        <router-link v-if="isPremium" to="/chat">Chat</router-link>
        <router-link v-if="isAdmin" to="/admin">Admin</router-link>
        <div v-if="user" class="user-menu">
          <router-link to="/profile" class="username-link">{{ user.username }}</router-link>
          <button @click="logout" class="btn-logout">退出</button>
        </div>
        <router-link v-else to="/login">登录</router-link>
      </nav>
    </header>
    <main>
      <router-view v-slot="{ Component }">
        <keep-alive include="SolutionReport,Translate,SolveData">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </main>

    <nav v-if="mobileBottomItems.length" class="mobile-bottom-nav" :class="{ 'quiz-actions': isQuizDailyRoute }" :aria-label="isQuizDailyRoute ? '客观题快捷操作' : '常用导航'">
      <template v-for="item in mobileBottomItems" :key="item.key">
        <router-link
          v-if="item.type === 'route'"
          :to="item.to"
          class="mobile-bottom-link"
          :class="{ 'is-accent': item.accent }"
        >
          <span class="mobile-bottom-label">{{ item.label }}</span>
        </router-link>
        <button
          v-else
          type="button"
          class="mobile-bottom-link mobile-bottom-button"
          :class="{ 'is-accent': item.accent }"
          @click="handleMobileBottomAction(item.action)"
        >
          <span class="mobile-bottom-label">{{ item.label }}</span>
        </button>
      </template>
    </nav>

    <!-- 全局 Toast -->
    <div v-if="toast.show" class="global-toast">
      <span>{{ toast.message }}</span>
    </div>
  </div>
</template>

<script>
import { clearModelCache } from './utils/models'

export default {
  supportEmail: '110076790@qq.com',
  supportPhone: '13280340286',
  data() {
    return {
      user: null,
      isMobileViewport: false,
      mobileNavOpen: false,
      toast: {
        show: false,
        message: ''
      }
    }
  },
  mounted() {
    this.checkLogin()
    this.handleResize()
    window.addEventListener('storage', this.checkLogin)
    window.addEventListener('resize', this.handleResize)
    // Custom event for login update within the same tab
    window.addEventListener('login-success', this.checkLogin)
  },
  unmounted() {
    window.removeEventListener('storage', this.checkLogin)
    window.removeEventListener('resize', this.handleResize)
    window.removeEventListener('login-success', this.checkLogin)
  },
  watch: {
    $route() {
      this.mobileNavOpen = false
    }
  },
  provide() {
    return {
      showToastMessage: this.showToastMessage
    }
  },
  computed: {
    isPremium() {
      return this.user && (this.user.role === 'admin' || this.user.role === 'premium' || this.user.role === 'teacher' || this.user.priv === -1)
    },
    isAdmin() {
      return this.user && (this.user.role === 'admin' || this.user.priv === -1)
    },
    isTeacher() {
      return this.user && (this.user.role === 'teacher')
    },
    isQuizDailyRoute() {
      return this.$route?.path === '/' || this.$route?.path === '/quiz-daily'
    },
    isLoginRoute() {
      return this.$route?.path === '/login'
    },
    isCompactQuizMobileNav() {
      return this.isMobileViewport && (this.isQuizDailyRoute || this.isLoginRoute)
    },
    mobileBottomItems() {
      if (this.isQuizDailyRoute) {
        return [
          { key: 'quiz-next', type: 'action', action: 'quiz-next', label: '下一题', accent: true },
          { key: 'share-wechat', type: 'action', action: 'share-wechat', label: '转发微信' },
          { key: 'contact-support', type: 'action', action: 'contact-support', label: '联系客服' },
          this.user
            ? { key: 'profile', type: 'route', to: '/profile', label: '我的' }
            : { key: 'login', type: 'route', to: '/login', label: '登录' }
        ]
      }

      if (this.user) {
        return [
          { key: 'home', type: 'route', to: '/', label: '首页' },
          { key: 'course', type: 'route', to: '/course', label: '课程' },
          { key: 'progress', type: 'route', to: '/progress', label: '进度' },
          { key: 'profile', type: 'route', to: '/profile', label: '我的' }
        ]
      }

      return [
        { key: 'home', type: 'route', to: '/', label: '首页' },
        { key: 'translate', type: 'route', to: '/translate', label: '翻译' },
        { key: 'typing', type: 'route', to: '/typing', label: 'Typing' },
        { key: 'login', type: 'route', to: '/login', label: '登录' }
      ]
    }
  },
  methods: {
    checkLogin(event) {
      // 如果是 storage 事件，只在 user_info 发生变化时才清除模型缓存
      // !event：mounted() 直接调用；!event.key：login-success 自定义事件无 key 属性
      // event.key === null：localStorage.clear() 触发的 storage 事件
      if (!event || !event.key || event.key === 'user_info') {
        clearModelCache()
      }
      const u = localStorage.getItem('user_info')
      if (u) {
        try {
          this.user = JSON.parse(u)
        } catch (e) {
          this.user = null
        }
      } else {
        this.user = null
      }
    },
    logout() {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_info')
      this.user = null
      this.mobileNavOpen = false
      clearModelCache()
      this.showToastMessage('已退出登录')
      this.$router.push('/login')
    },
    toggleMobileNav() {
      this.mobileNavOpen = !this.mobileNavOpen
    },
    handleNavClick(event) {
      if (window.innerWidth > 900) return
      if (event.target.closest('a') || event.target.closest('button')) {
        this.mobileNavOpen = false
      }
    },
    handleResize() {
      this.isMobileViewport = window.innerWidth <= 900
      if (this.isCompactQuizMobileNav) {
        this.mobileNavOpen = false
        return
      }

      if (window.innerWidth > 900 && this.mobileNavOpen) {
        this.mobileNavOpen = false
      }
    },
    async handleMobileBottomAction(action) {
      if (action === 'quiz-next') {
        window.dispatchEvent(new CustomEvent('quiz-daily-next-question'))
        return
      }

      if (action === 'share-wechat') {
        const sharePayload = {
          title: 'Acjudge 客观题日刷',
          text: '我在 Acjudge 刷 GESP 客观题，发你一起试试。',
          url: window.location.href
        }

        try {
          if (navigator.share) {
            await navigator.share(sharePayload)
            this.showToastMessage('已打开系统分享，请选择微信发送')
            return
          }

          await navigator.clipboard.writeText(`${sharePayload.title}\n${sharePayload.text}\n${sharePayload.url}`)
          this.showToastMessage('链接已复制，请到微信里直接粘贴发送')
        } catch {
          this.showToastMessage('当前设备暂不支持直接分享')
        }
        return
      }

      if (action === 'contact-support') {
        const phone = this.$options.supportPhone

        try {
          window.location.href = `tel:${phone}`
          this.showToastMessage(`正在拨打马老师：${phone}`)
        } catch {
          try {
            await navigator.clipboard.writeText(phone)
            this.showToastMessage(`号码已复制：马老师 ${phone}`)
          } catch {
            this.showToastMessage(`请手动拨打马老师：${phone}`)
          }
        }
      }
    },
    showToastMessage(message) {
      this.toast.message = message
      this.toast.show = true
      setTimeout(() => {
        this.toast.show = false
      }, 2500)
    }
  }
}
</script>

<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Microsoft YaHei', sans-serif; margin: 0; }
.header {
  background: #2b9af3;
  color: white;
  padding: 0 20px;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255,255,255,0.12);
  flex-shrink: 0;
  position: relative;
}
.branding { display: flex; align-items: center; }
.branding-link { display: flex; align-items: center; gap: 10px; color: inherit; text-decoration: none; }
.app-logo { height: 28px; width: auto; border-radius: 6px; background: white; padding: 2px; }
.header h1 { margin: 0; font-size: 16px; font-weight: 700; letter-spacing: -0.2px; color: #fff; }
.nav-toggle {
  display: none;
  border: 1px solid rgba(255,255,255,0.25);
  background: rgba(255,255,255,0.12);
  color: #fff;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 600;
}
.main-nav { display: flex; align-items: center; gap: 2px; flex-wrap: nowrap; }
.main-nav a {
  color: rgba(255,255,255,0.6);
  padding: 5px 9px;
  text-decoration: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  transition: color 0.15s, background 0.15s;
  white-space: nowrap;
}
.main-nav a:hover { color: #fff; background: rgba(255,255,255,0.08); }
.main-nav a.router-link-active {
  color: #fff;
  font-weight: 600;
  background: rgba(255,255,255,0.2);
}
.user-menu { display: flex; align-items: center; gap: 8px; margin-left: 8px; }
.username-link {
  color: rgba(255,255,255,0.85) !important;
  font-weight: 600;
  font-size: 13px;
  padding: 5px 9px;
  border-radius: 6px;
  background: rgba(255,255,255,0.08);
  text-decoration: none;
}
.username-link:hover { background: rgba(255,255,255,0.14); color: #fff !important; }
.btn-logout {
  background: rgba(239,68,68,0.15);
  border: 1px solid rgba(239,68,68,0.3);
  color: rgba(255,120,120,0.9);
  padding: 4px 10px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
  transition: all 0.15s;
}
.btn-logout:hover { background: rgba(239,68,68,0.28); color: #fff; }
main { padding: 0; }

.mobile-bottom-nav {
  display: none;
}

@media (max-width: 900px) {
  .header {
    padding: 10px 14px;
    flex-wrap: wrap;
    gap: 10px;
  }

  .branding {
    min-width: 0;
    flex: 1 1 auto;
  }

  .branding-link {
    min-width: 0;
  }

  .header h1 {
    font-size: 15px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .nav-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .main-nav {
    display: none;
    width: 100%;
    order: 3;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    padding: 12px;
    margin-bottom: 4px;
    border-radius: 12px;
    background: rgba(16, 58, 96, 0.22);
    box-sizing: border-box;
  }

  .main-nav.is-open {
    display: flex;
  }

  .main-nav a,
  .username-link,
  .btn-logout {
    width: 100%;
    box-sizing: border-box;
    text-align: left;
    padding: 10px 12px;
    border-radius: 10px;
  }

  .user-menu {
    width: 100%;
    margin-left: 0;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }

  main {
    padding-bottom: calc(78px + env(safe-area-inset-bottom, 0px));
  }

  .mobile-bottom-nav {
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: 12px;
    z-index: 950;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
    padding: 10px;
    border-radius: 18px;
    background: rgba(255,255,255,0.94);
    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.16);
    backdrop-filter: blur(12px);
    box-sizing: border-box;
  }

  .mobile-bottom-link {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 8px 6px;
    border-radius: 12px;
    text-decoration: none;
    color: #4b5563;
    font-size: 12px;
    font-weight: 600;
    text-align: center;
    transition: background 0.15s, color 0.15s, transform 0.15s;
  }

  .mobile-bottom-button {
    border: none;
    box-sizing: border-box;
    background: transparent;
    font-family: inherit;
  }

  .mobile-bottom-link.router-link-active,
  .mobile-bottom-link.is-accent {
    background: #2b9af3;
    color: #fff;
    box-shadow: 0 8px 18px rgba(43, 154, 243, 0.28);
  }

  .mobile-bottom-nav.quiz-actions {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .mobile-bottom-link:active {
    transform: translateY(1px);
  }

  .mobile-bottom-label {
    display: block;
    line-height: 1.2;
  }
}

/* 全局 Toast 样式 */
.global-toast {
  position: fixed;
  top: 32px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(40,40,40,0.97);
  color: #fff;
  padding: 12px 32px;
  border-radius: 8px;
  font-size: 17px;
  z-index: 9999;
  box-shadow: 0 2px 16px rgba(0,0,0,0.18);
  pointer-events: none;
  opacity: 0.98;
  transition: opacity 0.3s;
}
</style>
